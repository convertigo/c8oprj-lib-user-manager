const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const { read, bean, expression } = require('./project-source.cjs');

// The engine compiles a ${name} reference into the symbol value, with its %ENV% variables resolved.
function compiled(symbolValues, env = {}) {
  return (value) => {
    const reference = /^\$\{([^=}]+)\}$/.exec(value);
    const resolved = reference ? symbolValues[reference[1]] : value;
    return resolved == null ? resolved : String(resolved).replace(/%([A-Za-z0-9_]+)%/g, (all, name) => (name in env ? env[name] : all));
  };
}

function policy(symbolValues = {}, env = {}) {
  const context = vm.createContext({
    com: { twinsoft: { convertigo: { engine: { Engine: { theApp: { databaseObjectsManager: {
      symbolsGetValue: (name) => (name in symbolValues ? symbolValues[name] : null),
      getCompiledValue: compiled(symbolValues, env),
    } } } } } } },
  });
  vm.runInContext(read('js/directorySignInPolicy.js'), context);
  return context;
}

function request(uri, project = null) {
  return {
    getRequestURI: () => uri,
    getParameter: (name) => (name === '__project' ? project : null),
  };
}

test('SignInAD and SignInADBulk are only callable by the sequences of a project', () => {
  for (const name of ['SignInAD', 'SignInADBulk']) {
    assert.match(read(`_c8oProject/sequences/${name}.yaml`), /^accessibility: Private\n/, name);
  }
});

test('a direct call is a request to lib_UserManager, resolved as the engine does', () => {
  const { isDirectLibUserManagerRequest: direct } = policy();
  assert.equal(direct(request('/convertigo/projects/lib_UserManager/.json')), true);
  assert.equal(direct(request('/convertigo/system/projects/lib_UserManager/.xml')), true);
  // The C8o client of an application names the project of the requestable.
  assert.equal(direct(request('/convertigo/projects/MyApp/.json', 'lib_UserManager')), true);
  // A sequence of another project calls it within the request of that project.
  assert.equal(direct(request('/convertigo/projects/C8Oforms/.json')), false);
  assert.equal(direct(request('/convertigo/projects/lib_UserManager/.json', 'C8Oforms')), false);
  assert.equal(direct(request('/convertigo/projects/lib%5FUserManager/.json')), false);
  assert.equal(direct(null), false);
});

test('direct LDAP sign-in is refused unless the server configuration allows the user groups', () => {
  assert.deepEqual([...policy().getDirectLdapSignInGroups()], []);
  assert.deepEqual([...policy({ 'lib_UserManager.ldapDirectSignInGroups': ' ' }).getDirectLdapSignInGroups()], []);
  const groups = policy({ 'lib_UserManager.ldapDirectSignInGroups': 'Forms Users; Admins,\nSupport' }).getDirectLdapSignInGroups();
  assert.deepEqual([...groups], ['Forms Users', 'Admins', 'Support']);

  const { isDirectLdapSignInAllowed: allowed } = policy();
  assert.equal(allowed(['Forms Users'], ['Staff', 'forms users']), true);
  assert.equal(allowed(['Forms Users'], ['Staff']), false);
  assert.equal(allowed(['Forms Users'], []), false);
  assert.equal(allowed(['*'], []), true);
  assert.equal(allowed([], ['Forms Users']), false);
});

test('SignInLDAPBulk applies the direct call policy before authenticating the user', () => {
  const source = read('_c8oProject/sequences/SignInLDAPBulk.yaml');
  assert.doesNotMatch(source, /^accessibility: /m, 'the LDAP login of lib_UserManager_ui_ngx calls it from the client');
  const order = ['↓TrustedDirectory [', '↓DirectSignInPolicy [', '↓SignInLDAP [', '↓DirectSignInGroups [', '↓Set_authenticated_user ['];
  const positions = order.map((marker) => source.indexOf(marker));
  assert.ok(positions.every((position) => position >= 0), 'every step must exist');
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, 'the policy must run before the authentication');

  const code = expression(bean(source, 'DirectSignInPolicy'));
  const run = (symbols, uri) => {
    const scope = vm.createContext({
      include: () => vm.runInContext(read('js/directorySignInPolicy.js'), scope),
      context: { httpServletRequest: request(uri) },
      com: policy(symbols).com,
      java: { lang: { SecurityException: class SecurityException extends Error {} } },
      trustedDirectorySetting: (name) => (symbols[name] == null ? '' : symbols[name]),
      userIdAttribute: 'client', groupAttribute: 'client', groupDisplayAttribute: 'client',
      ldapBasePath: 'client', ldapBasePathGroup: 'client', casesensitive: 'client', domainNameUser: 'client',
    });
    vm.runInContext(code, scope);
    return scope;
  };
  // Called by a sequence of another project: nothing changes.
  const internal = run({}, '/convertigo/projects/C8Oforms/.json');
  assert.equal(internal.directSignIn, false);
  assert.equal(internal.userIdAttribute, 'client');
  // Called directly: refused by default, else with the settings of the server only.
  assert.throws(() => run({}, '/convertigo/projects/lib_UserManager/.json'), /Direct LDAP sign-in is disabled/);
  const direct = run({ 'lib_UserManager.ldapDirectSignInGroups': 'Forms Users', 'lib_UserManager.ldapBasePath': 'ou=people' }, '/convertigo/projects/lib_UserManager/.json');
  assert.equal(direct.directSignIn, true);
  assert.deepEqual(
    [direct.ldapBasePath, direct.ldapBasePathGroup, direct.userIdAttribute, direct.groupAttribute, direct.groupDisplayAttribute, direct.casesensitive, direct.domainNameUser],
    ['ou=people', '', 'uid', 'group', 'cn', 'true', '']);

  const check = expression(bean(source, 'DirectSignInGroups'));
  const decide = (scope, groups) => vm.runInContext(check, Object.assign(scope, { groups }));
  assert.throws(() => decide(direct, ['Staff']), /LDAP sign-in is not allowed for this user/);
  assert.doesNotThrow(() => decide(direct, ['Staff', 'Forms Users']));
  assert.doesNotThrow(() => decide(internal, []));
});

test('the user name cannot change the LDAP search filter', () => {
  const { escapeLdapFilterValue: escape } = policy();
  assert.equal(escape('jdoe'), 'jdoe');
  assert.equal(escape('*)(uid=*'), '\\2a\\29\\28uid=\\2a');
  assert.equal(escape('a\\b\u0000'), 'a\\5cb\\00');
  const source = read('_c8oProject/sequences/SignInLDAPBulk.yaml');
  assert.match(source, /var userFilter = "\(" \+ String\(userIdAttribute\) \+ "=" \+ escapeLdapFilterValue\(uidUser\) \+ "\)";/);
});

// Runs the SignInLDAP step of SignInLDAPBulk against a directory that would accept any bind.
function signInLDAP(password) {
  const binds = [];
  class InitialLdapContext {
    constructor(env) {
      binds.push(env.get('SECURITY_PRINCIPAL'));
      throw new Error('no directory in the test');
    }
  }
  class Hashtable {
    constructor() { this.values = new Map(); }
    put(key, value) { this.values.set(key, value); }
    get(key) { return this.values.get(key); }
  }
  const names = ['INITIAL_CONTEXT_FACTORY', 'PROVIDER_URL', 'SECURITY_AUTHENTICATION', 'SECURITY_PRINCIPAL',
    'SECURITY_CREDENTIALS', 'SECURITY_PROTOCOL', 'REFERRAL'];
  const Context = Object.fromEntries(names.map((name) => [name, name]));
  const context = vm.createContext({
    user: 'victim', password, casesensitive: 'false', adminUser: 'service', adminPassword: 'service-password',
    ldapServer: 'ldap://directory:389', ldapBasePath: 'dc=example', domainNameUser: '', userIdAttribute: 'uid',
    groupAttribute: 'memberOf', ldapBasePathGroup: '', groupDisplayAttribute: 'cn',
    javax: { naming: { Context, directory: {}, ldap: {}, NamingException: Error } },
    JavaImporter: () => ({ Context, InitialLdapContext, SearchControls: class {}, NamingException: Error }),
    java: { lang: { System: { nanoTime: () => 0 } }, util: { Hashtable } },
    log: { debug() {}, error() {}, warn() {} },
  });
  vm.runInContext(expression(bean(read('_c8oProject/sequences/SignInLDAPBulk.yaml'), 'SignInLDAP')), context);
  return { binds, error: context.error, loggedIn: context.loggedIn, message: context.errorMessage };
}

test('SignInLDAPBulk never binds with an empty password (unauthenticated bind)', () => {
  const empty = signInLDAP('');
  assert.deepEqual(empty.binds, []);
  assert.equal(empty.error, true);
  assert.equal(empty.loggedIn, false);
  assert.equal(empty.message, 'LDAP sign-in requires a password');
  assert.deepEqual(signInLDAP(null).binds, []);
  // A real password goes on to the directory (here the service bind, which fails in the test).
  const typed = signInLDAP('secret');
  assert.equal(typed.binds.length, 1);
  assert.equal(typed.loggedIn, false);
});

test('the directory settings may come from environment variables (%NAME%), as with the former symbol references', () => {
  const groups = policy({ 'lib_UserManager.ldapDirectSignInGroups': '%LDAP_DIRECT_GROUPS%' }, { LDAP_DIRECT_GROUPS: 'Forms Users; Admins' })
    .getDirectLdapSignInGroups();
  assert.deepEqual([...groups], ['Forms Users', 'Admins']);
  for (const name of ['SignInAD', 'SignInADBulk', 'SignInLDAPBulk']) {
    const trusted = expression(bean(read(`_c8oProject/sequences/${name}.yaml`), 'TrustedDirectory'));
    assert.match(trusted, /return String\(symbolManager\.getCompiledValue\("\$" \+ "\{" \+ name \+ "\}"\)\);/, name);
  }
});
