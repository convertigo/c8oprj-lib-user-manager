const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const { read } = require('./project-source.cjs');

function load(globals = {}) {
  const context = vm.createContext(globals);
  vm.runInContext(read('js/publicUrl.js'), context);
  return context;
}

const resolve = (settings) => JSON.parse(JSON.stringify(load().trustedPublicUrl(settings)));
const PUBLIC = 'https://forms.example.com/convertigo';

test('each trusted source gives the base of the links, in its order of precedence', () => {
  const all = {
    symbol: 'https://symbol.example.com/convertigo',
    environment: 'https://env.example.com/convertigo',
    endpoint: 'https://endpoint.example.com/convertigo',
    localUrl: 'https://local.example.com/convertigo',
    studio: true,
    requestUrl: () => 'https://request.example.com/convertigo/',
  };
  assert.deepEqual(resolve(all), { url: 'https://symbol.example.com/convertigo/', source: 'lib_UserManager.publicUrl' });
  assert.deepEqual(resolve({ ...all, symbol: '' }), { url: 'https://env.example.com/convertigo/', source: 'CONVERTIGO_PUBLIC_URL' });
  assert.deepEqual(resolve({ ...all, symbol: null, environment: null }),
    { url: 'https://endpoint.example.com/convertigo/', source: 'Convertigo Server endpoint URL' });
  assert.deepEqual(resolve({ ...all, symbol: '', environment: '', endpoint: '' }),
    { url: 'https://local.example.com/convertigo/', source: 'Convertigo Server local URL' });
  assert.deepEqual(resolve({ ...all, symbol: '', environment: '', endpoint: '', localUrl: 'http://localhost:18080/convertigo' }),
    { url: 'https://request.example.com/convertigo/', source: 'Studio request' });
});

test('an environment variable the engine could not resolve leaves the symbol unset', () => {
  // The engine keeps %NAME% when the variable is undefined and has no default.
  assert.equal(resolve({ symbol: '%CONVERTIGO_PUBLIC_URL%', environment: PUBLIC }).source, 'CONVERTIGO_PUBLIC_URL');
  assert.equal(resolve({ symbol: ' %UNKNOWN% ', endpoint: PUBLIC }).source, 'Convertigo Server endpoint URL');
  assert.equal(resolve({ symbol: 'https://%HOST%/convertigo', localUrl: PUBLIC }).source, 'Convertigo Server local URL');
  // A resolved value is used as is.
  assert.equal(resolve({ symbol: ' https://forms.example.com/convertigo/ ' }).url, 'https://forms.example.com/convertigo/');
});

test('the local URL of the engine is used only when it is not the local host', () => {
  for (const local of ['http://localhost:28080/convertigo', 'http://LOCALHOST/convertigo', 'http://127.0.0.1:28080/convertigo',
    'http://127.1.2.3/convertigo', 'http://[::1]:28080/convertigo', 'http://0.0.0.0:28080/convertigo', 'http://c8o.localhost/convertigo']) {
    assert.throws(() => resolve({ localUrl: local }), /not configured/, local);
  }
  // The value C8oCloud sets with -Dconvertigo.engine.application_server.convertigo.url.
  assert.deepEqual(resolve({ localUrl: 'https://test-nocode.convertigo.net/convertigo' }),
    { url: 'https://test-nocode.convertigo.net/convertigo/', source: 'Convertigo Server local URL' });
  assert.equal(resolve({ localUrl: 'https://localhost.example.com/convertigo' }).source, 'Convertigo Server local URL');
  // A malformed local URL is not a source, it is never an error.
  assert.throws(() => resolve({ localUrl: 'not an url' }), /not configured/);
});

test('the request is never trusted outside the Studio', () => {
  const requestUrl = () => 'https://attacker.example.net/convertigo/';
  assert.throws(() => resolve({ requestUrl }), /not configured/);
  assert.throws(() => resolve({ studio: false, requestUrl }), /not configured/);
  assert.throws(() => resolve({ studio: 'true', requestUrl }), /not configured/);
  assert.throws(() => resolve({}), /The public URL of the server is not configured: set lib_UserManager\.publicUrl, the environment variable CONVERTIGO_PUBLIC_URL or the engine endpoint/);
  assert.equal(resolve({ studio: true, requestUrl: () => 'http://localhost:18080/convertigo/' }).url, 'http://localhost:18080/convertigo/');
  assert.throws(() => resolve({ studio: true, requestUrl: () => '' }), /not configured/);
});

test('a configured value that is not a public URL is an error, never ignored', () => {
  for (const invalid of ['javascript:alert(1)', 'https://user@host/convertigo', 'https://host/convertigo?x=1',
    'https://host/convertigo#x', '//host/convertigo', 'https://ho st/convertigo', 'https:\\\\host']) {
    assert.throws(() => resolve({ symbol: invalid, endpoint: PUBLIC }), /Invalid public URL for the account emails \(lib_UserManager\.publicUrl\)/, invalid);
    assert.throws(() => resolve({ environment: invalid }), /\(CONVERTIGO_PUBLIC_URL\)/, invalid);
    assert.throws(() => resolve({ endpoint: invalid }), /\(Convertigo Server endpoint URL\)/, invalid);
  }
});

test('configuredPublicUrl reads the symbol, the environment and the engine properties', () => {
  const calls = [];
  const engine = (overrides) => ({
    Engine: {
      theApp: { databaseObjectsManager: { getCompiledValue: (value) => { calls.push(value); return overrides.symbol ?? ''; } } },
      isStudioMode: () => overrides.studio ?? false,
    },
    EnginePropertiesManager: {
      PropertyName: { APPLICATION_SERVER_CONVERTIGO_ENDPOINT: 'endpoint', APPLICATION_SERVER_CONVERTIGO_URL: 'url' },
      getProperty: (name) => (name === 'endpoint' ? overrides.endpoint ?? '' : overrides.localUrl ?? 'http://localhost:28080/convertigo'),
    },
  });
  const run = (overrides) => {
    const context = load({
      com: { twinsoft: { convertigo: { engine: engine(overrides) } } },
      java: { lang: { System: { getenv: (name) => (name === 'CONVERTIGO_PUBLIC_URL' ? overrides.environment ?? null : null) } } },
      context: { getConvertigoUrl: () => 'https://attacker.example.net/convertigo/' },
    });
    return context.configuredPublicUrl();
  };
  assert.equal(run({ symbol: PUBLIC }), `${PUBLIC}/`);
  assert.deepEqual(calls, ['${lib_UserManager.publicUrl=}']);
  assert.equal(run({ environment: 'https://env.example.com/convertigo' }), 'https://env.example.com/convertigo/');
  assert.equal(run({ endpoint: 'https://endpoint.example.com/convertigo' }), 'https://endpoint.example.com/convertigo/');
  assert.equal(run({ localUrl: 'https://test-nocode.convertigo.net/convertigo' }), 'https://test-nocode.convertigo.net/convertigo/');
  assert.throws(() => run({}), /not configured/);
  assert.equal(run({ studio: true }), 'https://attacker.example.net/convertigo/', 'the Studio keeps the former behavior');
});

test('the reset and confirmation emails build their links from the trusted base only', () => {
  for (const name of ['ForgotPassword', 'ForgotPasswordWithBrand', 'ConfirmAccount']) {
    const source = read(`_c8oProject/sequences/${name}.yaml`);
    assert.doesNotMatch(source, /getConvertigoUrl|getProjectUrl|getAbsoluteRequestedUrl/, name);
    // The email branch, computed before the account is read: an unconfigured server answers the same way for every email.
    const emailBranch = source.slice(source.search(/\n  ↓jElse \[steps\.ElseStep-\d+\]: \n/));
    assert.match(emailBranch, /^\n  ↓jElse \[steps\.ElseStep-\d+\]: \n    ↓Public_url \[steps\.SimpleStep-\d+\]: \n[^\n]*\n      expression: \|\n        include\("js\/publicUrl\.js"\);\n        var publicUrl = configuredPublicUrl\(\);\n/, name);
    assert.match(emailBranch, /expression: publicUrl \+ 'projects\/lib_UserManager_ui_ngx\/DisplayObjects\/mobile\/\w+Page\/'/, name);
  }
});
