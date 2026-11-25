const assert = require('node:assert/strict');
const { createHash, timingSafeEqual } = require('node:crypto');
const test = require('node:test');
const vm = require('node:vm');
const { read } = require('./project-source.cjs');

const helperSource = read('js/legacyFormsAnonymousAccount.js');
const inventoriedId = 'a'.repeat(64);
const otherId = 'b'.repeat(64);
const sha1Hex = (value) => createHash('sha1').update(value).digest('hex');
const sha256Hex = (value) => createHash('sha256').update(value).digest('hex');

function accountDocument(userId, email = userId) {
  return {
    _id: userId,
    account: {
      email,
      status: 'confirmed',
      hashPassword: 'an-existing-password-hash',
      salt: 'an-existing-salt',
    },
  };
}

// The old publication flow created the anonymous account with password = user.
function publishedAccountDocument(userId) {
  const doc = accountDocument(userId);
  doc.account.hashPassword = sha1Hex(`${userId}+${doc.account.salt}`);
  return doc;
}

function guard(options = {}) {
  const warnings = [];
  const views = [];
  let inventoryReads = 0;
  let projectLookups = 0;
  const fullSyncClient = {
    getView(database, design, view, query) {
      views.push({ database, design, view, query });
      if (options.viewFailure) {
        throw new Error(`FullSync unavailable for ${options.userId || inventoriedId}`);
      }
      if (options.viewResponses && options.viewResponses[view]) {
        return JSON.stringify(options.viewResponses[view]);
      }
      return JSON.stringify({ rows: [] });
    },
    // Memberships are searched with Mango: the fixture keeps describing them as get_groups_by_user rows.
    postFind(database, query) {
      views.push({ database, design: 'mango', view: 'get_groups_by_user', query: query.value });
      if (options.viewFailure) {
        throw new Error(`FullSync unavailable for ${options.userId || inventoriedId}`);
      }
      assert.equal(database, 'c8ofullsyncgrp');
      assert.equal(query.value.selector.type, 'c8oGrp');
      const rows = (options.viewResponses && options.viewResponses.get_groups_by_user || { rows: [] }).rows;
      return JSON.stringify({ docs: rows.map((row) => ({ _id: row.id, type: 'c8oGrp', user: query.value.selector.user,
        group: row.value, ...(row.doc || {}) })) });
    },
  };
  const symbols = {
    symbolsGetValue(name) {
      if (name === 'lib_UserManager.legacyFormsAnonymousAuthMode') {
        return options.mode;
      }
      if (name === 'lib_UserManager.legacyFormsAnonymousAccountIds') {
        inventoryReads++;
        return options.inventory;
      }
      throw new Error(`Unexpected symbol ${name}`);
    },
    // The engine compiles a ${name} reference into the symbol value, with its %ENV% variables resolved.
    getCompiledValue(value) {
      const reference = /^\$\{([^=}]+)\}$/.exec(value);
      const values = { 'lib_UserManager.legacyFormsAnonymousAuthMode': options.mode, 'lib_UserManager.legacyFormsAnonymousAccountIds': options.inventory };
      const resolved = reference ? values[reference[1]] : value;
      return resolved == null ? resolved : String(resolved).replace(/%([A-Za-z0-9_]+)%/g, (all, name) => ((options.env || {})[name] ?? all));
    },
    getOriginalProjectByName(name) {
      assert.equal(name, 'C8Oforms');
      projectLookups++;
      return options.formsInstalled === false ? null : {};
    },
  };
  class HashMap {
    put(key, value) { this[key] = value; }
  }
  class JString {
    constructor(value) { this.value = String(value); }
    getBytes() { return Buffer.from(this.value, 'utf8'); }
  }
  const context = {
    com: { twinsoft: { convertigo: { engine: { Engine: { theApp: {
      databaseObjectsManager: symbols,
      couchDbManager: { getFullSyncClient: () => fullSyncClient },
    } } } } } },
    java: {
      lang: { SecurityException: class SecurityException extends Error {}, String: JString },
      security: { MessageDigest: { isEqual: (a, b) => a.length === b.length && timingSafeEqual(a, b) } },
      util: { HashMap },
    },
    org: { apache: { commons: { codec: { digest: { DigestUtils: { sha1Hex, sha256Hex } } } } },
      codehaus: { jettison: { json: { JSONObject: class { constructor(text) { this.value = JSON.parse(text); } } } } } },
    log: { warn: (message) => warnings.push(String(message)) },
  };
  vm.createContext(context);
  vm.runInContext(helperSource, context);
  return {
    classify: (userId, doc) => context.isLegacyFormsAnonymousAccount(userId, doc),
    decide: (userId, doc, authPath = 'password') => context.shouldRejectLegacyFormsAnonymousAccount(userId, doc, authPath),
    warnings,
    views,
    get inventoryReads() { return inventoryReads; },
    get projectLookups() { return projectLookups; },
  };
}

test('the guard blocks by default a detected legacy anonymous account, without inventory', () => {
  for (const mode of [undefined, null, '', '  ', 'enforce', 'ENFORCE']) {
    const subject = guard({ mode, inventory: '' });
    assert.equal(subject.decide(otherId, publishedAccountDocument(otherId)), true, String(mode));
    assert.ok(subject.warnings.every((message) => !message.includes(otherId)));
  }
});

test('an invalid mode keeps the guard enforced and logs a warning without the account ID', () => {
  const subject = guard({ mode: 'of', inventory: '' });
  assert.equal(subject.decide(otherId, publishedAccountDocument(otherId)), true);
  assert.ok(subject.warnings.some((message) => /Invalid legacy Forms anonymous auth guard mode/.test(message)));
  assert.ok(subject.warnings.every((message) => !message.includes(otherId)));
});

test('the off mode rolls the guard back without classifying anything', () => {
  const subject = guard({ mode: 'off', inventory: inventoriedId });
  assert.equal(subject.decide(inventoriedId, publishedAccountDocument(inventoriedId)), false);
  assert.equal(subject.inventoryReads, 0);
  assert.equal(subject.projectLookups, 0);
  assert.equal(subject.views.length, 0);
});

test('an explicit inventory blocks an edited orphan in enforce and inventory modes only', () => {
  const changedEmail = accountDocument(inventoriedId, 'changed@example.net');
  for (const authPath of ['password', 'token']) {
    for (const mode of [undefined, 'enforce', 'inventory']) {
      const enforcing = guard({ mode, inventory: `${otherId}, ${inventoriedId}` });
      assert.equal(enforcing.decide(inventoriedId, changedEmail, authPath), true);
      assert.equal(enforcing.views.length, 0);
    }
    const observing = guard({ mode: 'observe', inventory: inventoriedId });
    assert.equal(observing.decide(inventoriedId, changedEmail, authPath), false);
    assert.ok(observing.warnings.length > 0);
  }
});

test('the inventory mode ignores the other evidence', () => {
  const subject = guard({ mode: 'inventory', inventory: otherId, viewFailure: true });
  assert.equal(subject.decide(inventoriedId, publishedAccountDocument(inventoriedId)), false);
  assert.equal(subject.projectLookups, 0);
  assert.equal(subject.views.length, 0);
});

test('an invalid inventory fails open even when its first ID matches', () => {
  const subject = guard({ inventory: `${inventoriedId},not-a-hex-id` });
  assert.throws(() => subject.classify(inventoriedId, accountDocument(inventoriedId)), /Invalid legacy anonymous account inventory/);
  assert.equal(subject.decide(inventoriedId, accountDocument(inventoriedId)), false);
  assert.equal(subject.views.length, 0);
  assert.ok(subject.warnings.every((message) => !message.includes(inventoriedId)));
});

test('a 64-hex account without Forms evidence is allowed', () => {
  const subject = guard({ inventory: otherId });
  assert.equal(subject.classify(inventoriedId, accountDocument(inventoriedId)), false);
  assert.equal(subject.decide(inventoriedId, accountDocument(inventoriedId)), false);
  assert.ok(subject.views.length > 0);
});

test('an account which is not 64-hex is never classified', () => {
  const subject = guard({});
  const doc = publishedAccountDocument('alice@example.test');
  assert.equal(subject.decide('alice@example.test', doc), false);
  assert.equal(subject.inventoryReads, 0);
  assert.equal(subject.views.length, 0);
});

test('a Forms relation blocks by default and is only logged in observe mode', () => {
  const parentId = 'published_form123';
  const userId = sha256Hex(parentId);
  const viewResponses = { all: { rows: [{ id: `${parentId}_anonymous`, doc: { '~c8oAcl': userId } }] } };
  assert.equal(guard({ inventory: '', viewResponses }).decide(userId, accountDocument(userId)), true);
  const observing = guard({ mode: 'observe', inventory: '', viewResponses });
  assert.equal(observing.classify(userId, accountDocument(userId)), true);
  assert.equal(observing.decide(userId, accountDocument(userId)), false);
  assert.ok(observing.warnings.length > 0);
});

test('a failing Forms view allows authentication and omits the account ID from the warning', () => {
  const subject = guard({ inventory: '', viewFailure: true });
  assert.equal(subject.decide(inventoriedId, accountDocument(inventoriedId)), false);
  assert.equal(subject.views.length, 1);
  assert.ok(subject.warnings.length > 0);
  assert.ok(subject.warnings.every((message) => !message.includes(inventoriedId)));
});

test('both authentication sequences call the guard before setting the authenticated user', () => {
  for (const [sequence, authPath] of [['SignIn', 'password'], ['CheckSecureToken', 'token']]) {
    const source = read(`_c8oProject/sequences/${sequence}.yaml`);
    const guardCall = source.indexOf(`shouldRejectLegacyFormsAnonymousAccount(`);
    const authenticate = source.indexOf('SetAuthenticatedUserStep');
    assert.ok(guardCall >= 0, `${sequence} must call the guard`);
    assert.ok(source.includes(`include("js/legacyFormsAnonymousAccount.js");`));
    assert.ok(source.includes(`, "${authPath}")) {`), `${sequence} must name its path`);
    assert.ok(authenticate >= 0, `${sequence} must authenticate the user`);
    assert.ok(guardCall < authenticate, `${sequence} must check before authentication`);
  }
});

test('a token authenticates only a confirmed account holding it', () => {
  const source = read('_c8oProject/sequences/CheckSecureToken.yaml');
  const check = /↓jIfThenElse \[steps\.IfThenElseStep-1739194723830\]: \n\s+condition: (.+)\n/.exec(source)[1];
  const accepts = (doc, payload, token) => Boolean(vm.runInContext(check, vm.createContext({ doc, payload, token })));
  const doc = { account: { status: 'confirmed', hashPassword: 'h' }, JWTokens: ['t'] };
  assert.equal(accepts(doc, { pwd_hash: 'h' }, 't'), true);
  assert.equal(accepts({ ...doc, account: { ...doc.account, status: 'draft' } }, { pwd_hash: 'h' }, 't'), false);
  assert.equal(accepts({ ...doc, JWTokens: undefined }, { pwd_hash: 'h' }, 't'), false);
  assert.equal(accepts({ error: 'not_found' }, { pwd_hash: 'h' }, 't'), false);
});

test('the guard mode and inventory may come from environment variables (%NAME%)', () => {
  const off = guard({ mode: '%GUARD_MODE%', env: { GUARD_MODE: 'off' }, inventory: inventoriedId });
  assert.equal(off.decide(inventoriedId, publishedAccountDocument(inventoriedId)), false);
  const listed = guard({ mode: 'inventory', inventory: '%GUARD_IDS%', env: { GUARD_IDS: `${otherId} ${inventoriedId}` } });
  assert.equal(listed.decide(inventoriedId, accountDocument(inventoriedId, 'changed@example.net')), true);
});
