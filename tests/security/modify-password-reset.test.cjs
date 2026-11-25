const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const change = fs.readFileSync(path.join(root, '_c8oProject/sequences/ModifyPassword.yaml'), 'utf8');
const connector = fs.readFileSync(path.join(root, '_c8oProject/connectors/lib_usermanager_fullsync.yaml'), 'utf8');

test('an authenticated password change invalidates an outstanding reset link', () => {
  const account = change.match(/    ↓Complex1 \[steps\.XMLComplexStep-[^\n]+\]:([\s\S]*?)(?=    ↓Call_Transaction1 )/)?.[0];
  assert.ok(account, 'password change must build an account update');
  assert.match(account, /nodeName: hashPassword/);
  assert.match(account, /nodeName: salt/);
  const write = change.match(/    ↓Call_Transaction1 \[steps\.TransactionStep-[^\n]+\]:([\s\S]*?)(?=^↓user )/m)?.[0];
  assert.ok(write, 'password change must have an account write');
  assert.match(write, /sourceTransaction: lib_UserManager\.lib_usermanager_fullsync\.PostMergeDocument/);

  // Convertigo's YAML reader requires a space after the colon on every bean line.
  assert.match(write, /^      ↓_use_merge \[variables\.StepVariable-\d+\]: \n/m);
  const mergeValue = write.match(/↓_use_merge \[variables\.StepVariable-[^\n]+\]: \n(?:[^\n]*\n)*?\s+value: '([^']+)'/)?.[1];
  assert.ok(mergeValue, 'the account write must pass merge rules');
  const rules = JSON.parse(mergeValue);
  assert.deepEqual(rules, {
    'account.passwordResetKey': 'delete',
    'account.passwordResetExpiresAt': 'delete',
  });

  // Apply the documented PostMergeDocument rules to a pending-reset account.
  const before = {
    _id: 'alice@example.test',
    account: {
      status: 'confirmed',
      profileName: 'Alice',
      hashPassword: 'old-hash',
      salt: 'old-salt',
      passwordResetKey: 'outstanding-email-token',
      passwordResetExpiresAt: Date.now() + 15 * 60 * 1000,
    },
  };
  const after = structuredClone(before);
  Object.assign(after.account, {hashPassword: 'new-hash', salt: 'new-salt'});
  for (const [pathName, action] of Object.entries(rules)) {
    assert.equal(action, 'delete');
    const [parent, field] = pathName.split('.');
    delete after[parent][field];
  }

  assert.equal(after.account.hashPassword, 'new-hash');
  assert.equal(after.account.salt, 'new-salt');
  assert.equal(after.account.status, 'confirmed');
  assert.equal(after.account.profileName, 'Alice');
  assert.equal(after.account.passwordResetKey, undefined);
  assert.equal(after.account.passwordResetExpiresAt, undefined);
  assert.match(connector, /\\\/\^\[0-9a-f\]\{64\}\$\\\/\.test\(doc\.account\.passwordResetKey\) && \(doc\.account\.status == ''confirmed''/);
  assert.equal(Boolean(after.account.passwordResetKey), false, 'the reset-key view must not emit the old link');
});
