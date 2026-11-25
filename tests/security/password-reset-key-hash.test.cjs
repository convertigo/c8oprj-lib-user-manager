const assert = require('node:assert/strict');
const { createHash, randomBytes, timingSafeEqual } = require('node:crypto');
const test = require('node:test');
const vm = require('node:vm');
const { read, bean, expression, designDocument, couchFunction } = require('./project-source.cjs');

const sequences = ['ConfirmAccount', 'ForgotPassword', 'ForgotPasswordWithBrand'];

// The Java classes the reset key steps use, backed by Node.
function rhino(extra = {}) {
  class JString {
    constructor(value) { this.value = String(value); }
    getBytes() { return Buffer.from(this.value, 'utf8'); }
  }
  return vm.createContext({
    java: {
      lang: {
        String: JString,
        Exception: class extends Error {},
        Byte: { TYPE: 'byte' },
        reflect: { Array: { newInstance: (type, size) => Buffer.alloc(size) } },
      },
      security: {
        SecureRandom: class { nextBytes(bytes) { randomBytes(bytes.length).copy(bytes); } },
        MessageDigest: { isEqual: (a, b) => a.length === b.length && timingSafeEqual(a, b) },
      },
      util: {
        Base64: {
          getUrlEncoder: () => ({ withoutPadding: () => ({ encodeToString: (bytes) => Buffer.from(bytes).toString('base64url') }) }),
        },
      },
    },
    org: { apache: { commons: { codec: { digest: { DigestUtils: {
      sha256Hex: (value) => createHash('sha256').update(String(value), 'utf8').digest('hex'),
    } } } } } },
    ...extra,
  });
}

for (const name of sequences) {
  const source = read(`_c8oProject/sequences/${name}.yaml`);

  test(`${name} stores only the SHA-256 of the key it emails`, () => {
    const context = rhino();
    vm.runInContext(expression(bean(source, 'Generate_reset_key')), context);
    assert.match(context.jPasswordResetKey, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(context.jPasswordResetKeyHash, createHash('sha256').update(context.jPasswordResetKey).digest('hex'));

    // The email link keeps the clear key, the account document gets the hash.
    assert.match(bean(source, 'jElement1'), /expression: encodeURIComponent\(jPasswordResetKey\)/);
    const stored = bean(source, 'jElement2');
    assert.match(stored, /passwordResetKey: jPasswordResetKeyHash,/);
    assert.doesNotMatch(stored, /passwordResetKey: jPasswordResetKey,/);
  });

  test(`${name} looks the account up by the hash of the key received`, () => {
    const lookup = bean(source, 'Call_Transaction1');
    assert.match(lookup, /value: PasswordLostAccountsByPasswordResetKey/);
    const key = bean(lookup, '_use_key');
    assert.doesNotMatch(key, /sourceDefinition|passwordResetKey\/text\(\)/, 'the clear key must not be the view key');

    // Issue a key, index the stored document as CouchDB does, then redeem the emailed key.
    const issued = rhino();
    vm.runInContext(expression(bean(source, 'Generate_reset_key')), issued);
    const rows = [];
    const map = couchFunction(designDocument().views.PasswordLostAccountsByPasswordResetKey.map, { emit: (k) => rows.push(k), log: () => {} });
    map({ _id: 'alice@example.test', '~c8oAcl': 'c8o:admin', account: { status: 'passwordlost', passwordResetKey: issued.jPasswordResetKeyHash } });

    const redeem = rhino({ passwordResetKey: issued.jPasswordResetKey, newPassword: 'a-new-password' });
    vm.runInContext(expression(bean(source, 'Validate_key_request')), redeem);
    assert.equal(JSON.parse(redeem._use_key), rows[0]);

    redeem.resetKeyHash = rows[0];
    assert.doesNotThrow(() => vm.runInContext(expression(bean(source, 'Validate_reset_key')), redeem));
    redeem.resetKeyHash = 'b'.repeat(64);
    assert.throws(() => vm.runInContext(expression(bean(source, 'Validate_reset_key')), redeem), /Invalid password reset request/);

    // A key stored in clear before the upgrade is no longer found.
    const old = rhino({ passwordResetKey: 'aW5zZWN1cmUtcGxhaW50ZXh0LWtleS1mcm9tLTIwMjU', newPassword: 'a-new-password' });
    vm.runInContext(expression(bean(source, 'Validate_key_request')), old);
    const before = rows.length;
    map({ _id: 'bob@example.test', '~c8oAcl': 'c8o:admin', account: { status: 'passwordlost', passwordResetKey: old.passwordResetKey } });
    assert.equal(rows.length, before);
  });
}
