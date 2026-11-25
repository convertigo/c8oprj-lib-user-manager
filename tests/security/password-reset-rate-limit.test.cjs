const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const { read, bean, expression } = require('./project-source.cjs');

const minute = 60 * 1000;
const context = vm.createContext({});
vm.runInContext(read('js/passwordResetRateLimit.js'), context);
const next = (account, now) => {
  const result = context.nextPasswordResetRequest(account, now);
  return result == null ? null : { ...result };
};

// Applies what the sequence writes with a new key, as the merge does.
function issue(account, now) {
  const request = next(account, now);
  if (!request) return false;
  Object.assign(account, request, { passwordResetKey: `hash-${now}`, passwordResetExpiresAt: now + 15 * minute });
  return true;
}

test('a first request, or one after the window, issues a key and opens a window', () => {
  const t0 = Date.UTC(2026, 8, 29, 12);
  assert.deepEqual(next(undefined, t0), { passwordResetWindowStart: t0, passwordResetCount: 1 });
  assert.deepEqual(next({ status: 'confirmed' }, t0), { passwordResetWindowStart: t0, passwordResetCount: 1 });
  assert.deepEqual(next({ passwordResetWindowStart: t0 - 15 * minute, passwordResetCount: 3, passwordResetKey: 'h', passwordResetExpiresAt: t0 + minute }, t0),
    { passwordResetWindowStart: t0, passwordResetCount: 1 });
  // A window start in the future or not a number is not trusted.
  assert.deepEqual(next({ passwordResetWindowStart: t0 + minute, passwordResetCount: 3 }, t0), { passwordResetWindowStart: t0, passwordResetCount: 1 });
  assert.deepEqual(next({ passwordResetWindowStart: 'x', passwordResetCount: 3 }, t0), { passwordResetWindowStart: t0, passwordResetCount: 1 });
});

test('no new key while the key of the current window is still valid', () => {
  const t0 = Date.UTC(2026, 8, 29, 12);
  const account = {};
  assert.equal(issue(account, t0), true);
  assert.equal(issue(account, t0 + minute), false);
  assert.equal(issue(account, t0 + 14 * minute), false);
  assert.equal(account.passwordResetCount, 1);
  // Once the window has passed, a new key replaces the previous one.
  assert.equal(issue(account, t0 + 15 * minute), true);
  assert.equal(account.passwordResetCount, 1);
});

test('at most three keys per window per account, even when each key is used', () => {
  const t0 = Date.UTC(2026, 8, 29, 12);
  const account = {};
  for (let i = 0; i < 3; i++) {
    assert.equal(issue(account, t0 + i * minute), true, `request ${i + 1}`);
    // The reset (or a password change) clears the key.
    account.passwordResetKey = null;
    account.passwordResetExpiresAt = null;
  }
  assert.equal(account.passwordResetCount, 3);
  assert.equal(issue(account, t0 + 4 * minute), false);
  assert.equal(issue(account, t0 + 14 * minute), false);
  assert.equal(issue(account, t0 + 15 * minute), true);
  // An expired key does not block a request either.
  account.passwordResetExpiresAt = t0 + 15 * minute + 1;
  assert.equal(issue(account, t0 + 16 * minute), true);
  assert.equal(account.passwordResetCount, 2);
});

for (const name of ['ConfirmAccount', 'ForgotPassword', 'ForgotPasswordWithBrand']) {
  test(`${name} issues and emails a key only within the limit, with the same answer otherwise`, () => {
    const source = read(`_c8oProject/sequences/${name}.yaml`);
    const guarded = bean(source, 'IfResetAllowed');
    assert.ok(guarded, 'the issuing steps must be guarded');
    assert.match(guarded, /condition: resetRequest != null/);
    for (const step of ['Generate_reset_key', 'jElement2', 'SMTP_send']) {
      assert.ok(bean(guarded, step), `${step} must run only within the limit`);
    }
    assert.ok(source.indexOf('↓Reset_rate_limit [') < source.indexOf('↓IfResetAllowed ['));
    assert.match(bean(guarded, 'jElement2'), /passwordResetWindowStart: resetRequest\.passwordResetWindowStart, passwordResetCount: resetRequest\.passwordResetCount/);
    assert.match(expression(bean(source, 'Reset_rate_limit')), /include\("js\/passwordResetRateLimit\.js"\);/);

    // Unknown account, limited account and (confirmation) confirmed account: no error, nothing written.
    const lookup = source.slice(source.indexOf('sourceTransaction: lib_UserManager.lib_usermanager_fullsync.GetAccountDocument'));
    const unknown = bean(lookup, 'jThen');
    assert.equal(unknown.split('\n').filter((line) => line.includes('↓')).length, 1, 'an unknown account gets no step');
    assert.doesNotMatch(lookup, /Invalid username|XMLErrorStep|SecurityException/);
    // Nothing else in the request branch is part of the answer.
    for (const line of lookup.split('\n')) {
      if (/^\s+↓\w+ \[steps\.(XMLElementStep|ElementStep|XMLComplexStep)-\d+\]: $/.test(line)) {
        const block = bean(lookup, line.trim().slice(1).split(' ')[0]);
        assert.match(block, /^\s+output: false$/m, line.trim());
      }
    }
    assert.doesNotMatch(lookup, /output: true/);
  });
}

test('ConfirmAccount issues a key only for an account waiting for its confirmation', () => {
  const source = read('_c8oProject/sequences/ConfirmAccount.yaml');
  const code = expression(bean(source, 'Reset_rate_limit'));
  const run = (accountStatus) => {
    const scope = vm.createContext({
      include: () => vm.runInContext(read('js/passwordResetRateLimit.js'), scope),
      accountStatus,
      resetAccountDocument: { account: { status: accountStatus } },
    });
    vm.runInContext(code, scope);
    return scope.resetRequest;
  };
  assert.ok(run('draft'));
  assert.ok(run('passwordlost'));
  assert.equal(run('confirmed'), null);
});
