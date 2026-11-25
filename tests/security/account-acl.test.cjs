const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { root, read, designDocument, couchFunction } = require('./project-source.cjs');

const connector = read('_c8oProject/connectors/lib_usermanager_fullsync.yaml');
const writeTypes = /\[transactions\.couchdb\.(PostDocumentTransaction|PostBulkDocumentsTransaction|PutDocumentTransaction|PutAttachmentTransaction|PostUpdateTransaction)\]/;

function transactions() {
  const found = [];
  const lines = connector.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const match = /^↓(\w+) \[transactions\.couchdb\.(\w+)\]: $/.exec(lines[i]);
    if (!match) continue;
    let end = i + 1;
    while (end < lines.length && lines[end].startsWith(' ')) end++;
    found.push({ name: match[1], type: match[2], block: lines.slice(i, end).join('\n') });
  }
  return found;
}

test('client replication of the accounts database is denied', () => {
  assert.match(connector, /^replicationAccess: deny$/m);
  assert.doesNotMatch(connector, /publicReplicationAllowed|publicBulkDocsAllowed/);
});

test('every account write carries the reserved ACL explicitly', () => {
  const writes = transactions().filter((transaction) => writeTypes.test(`[transactions.couchdb.${transaction.type}]`));
  assert.deepEqual(writes.map((write) => write.name).sort(), ['PostDocument', 'PostMergeDocument']);
  for (const write of writes) {
    assert.match(write.block, /^  accessibility: Private$/m, write.name);
    assert.match(write.block, /^  fullSyncAclPolicy: fromKeyC8oAcl$/m, write.name);
    assert.match(write.block, /^  ↓_c8oAcl \[variables\.RequestableVariable-\d+\]: \n(?:    .*\n)*?    value: c8o:admin$/m, write.name);
  }
});

test('no sequence overrides the reserved ACL or writes accounts another way', () => {
  const dir = path.join(root, '_c8oProject/sequences');
  for (const file of fs.readdirSync(dir)) {
    const source = fs.readFileSync(path.join(dir, file), 'utf8');
    assert.doesNotMatch(source, /↓_c8oAcl \[/, file);
    for (const [, transaction] of source.matchAll(/sourceTransaction: lib_UserManager\.lib_usermanager_fullsync\.(\w+)/g)) {
      assert.ok(['GetAccountDocument', 'GetView', 'PostDocument', 'PostMergeDocument', 'DeleteDocument'].includes(transaction), `${file}: ${transaction}`);
    }
  }
});

test('the design document refuses account documents without the reserved ACL', () => {
  const validate = couchFunction(designDocument().validate_doc_update);
  const refuse = (doc) => assert.throws(() => validate(doc, null, {}, {}), (error) => typeof error.forbidden === 'string');
  const accept = (doc) => assert.doesNotThrow(() => validate(doc, null, {}, {}));

  accept({ _id: 'alice@example.test', '~c8oAcl': 'c8o:admin', account: { status: 'confirmed' } });
  refuse({ _id: 'alice@example.test', account: { status: 'confirmed' } });
  refuse({ _id: 'alice@example.test', '~c8oAcl': 'alice@example.test', account: { status: 'confirmed' } });
  refuse({ _id: 'mallory@example.test', '~c8oAcl': 'C8O:ADMIN', account: { status: 'confirmed' } });
  // A deletion keeps no account and a design document is deployed by the engine.
  accept({ _id: 'alice@example.test', _deleted: true });
  accept({ _id: '_design/Design_document', views: {} });
});

test('the reset key view only emits hashed keys written by the sequences', () => {
  const emitted = [];
  const map = couchFunction(designDocument().views.PasswordLostAccountsByPasswordResetKey.map, {
    emit: (key, value) => emitted.push(JSON.parse(JSON.stringify({ key, value }))),
    log: () => {},
  });
  const hash = 'a'.repeat(64);
  const account = { status: 'passwordlost', email: 'alice@example.test', passwordResetKey: hash, passwordResetExpiresAt: 1 };
  map({ _id: 'alice@example.test', '~c8oAcl': 'c8o:admin', account });
  map({ _id: 'bob@example.test', account: { ...account, email: 'bob@example.test' } });
  map({ _id: 'carol@example.test', '~c8oAcl': 'c8o:admin', account: { ...account, passwordResetKey: 'aW5zZWN1cmUtcGxhaW50ZXh0LWtleS1mcm9tLTIwMjU' } });
  map({ _id: 'dave@example.test', '~c8oAcl': 'c8o:admin', account: { ...account, passwordResetKey: null } });
  assert.deepEqual(emitted, [{ key: hash, value: { email: 'alice@example.test', expiresAt: 1 } }]);
});
