// Helpers reading the Convertigo YAML sources of the project for the security tests.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

// The bean line of `name` and every line nested under it.
function bean(source, name) {
  const lines = source.split('\n');
  const start = lines.findIndex((line) => line.trimStart().startsWith(`↓${name} [`));
  if (start < 0) return null;
  const indent = lines[start].length - lines[start].trimStart().length;
  let end = start + 1;
  while (end < lines.length && (lines[end].trim() === '' || lines[end].length - lines[end].trimStart().length > indent)) {
    end++;
  }
  return lines.slice(start, end).join('\n');
}

// The JavaScript of the `expression: |` property of a step block.
function expression(block) {
  const lines = block.split('\n');
  const start = lines.findIndex((line) => /^\s*expression: \|$/.test(line));
  if (start < 0) return null;
  const indent = lines[start].length - lines[start].trimStart().length + 2;
  const body = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].trim() !== '' && lines[i].length - lines[i].trimStart().length < indent) break;
    body.push(lines[i].slice(indent));
  }
  let code = body.join('\n').replace(/\n+$/, '');
  if (code.startsWith("'") && code.endsWith("'")) {
    code = code.slice(1, -1).replace(/''/g, "'");
  }
  return code;
}

// The design document of the accounts database, as CouchDB receives it.
function designDocument() {
  const connector = read('_c8oProject/connectors/lib_usermanager_fullsync.yaml');
  const block = bean(connector, 'Design_document');
  const lines = block.split('\n');
  const start = lines.findIndex((line) => line === '    →: |');
  const text = lines.slice(start + 1).filter((line) => line.startsWith('      ')).map((line) => line.slice(6)).join('');
  return JSON.parse(text.replace(/^'|'$/g, '').replace(/''/g, "'"));
}

// Runs a CouchDB function source and returns it.
function couchFunction(source, context = {}) {
  vm.createContext(context);
  return vm.runInContext(`(${source})`, context);
}

module.exports = { root, read, bean, expression, designDocument, couchFunction };
