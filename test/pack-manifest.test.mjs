// 0.19.0 (Tim, 2026-11-04): a pack.json says if it is stock or custom, has a git url, fields like a package.json, and who made it.
import { manifestProblems } from '../lib/pack-manifest.mjs';
import { availablePacks, readPack } from '../lib/packs.mjs';
import { CLI, assert, execFileSync, test } from './kit-cli.mjs';

const custom = { name: 'acme', version: '1.2.0', description: 'Acme laws', type: 'custom', author: 'Acme Platform', license: 'UNLICENSED', repository: { type: 'git', url: 'git@git.acme.example:p/acme.git' } };

test('every pack the kit ships is a stock pack with a full manifest', () => {
  for (const name of availablePacks()) {
    const p = readPack(name);
    assert.deepEqual(manifestProblems(p, name), [], name);
    assert.equal(p.type, 'stock', name);
    assert.match(p.repository.url, /TheDecipherist\/claude-packs/, name);
    assert.equal(p.repository.directory, `packs/${name}`, name);
  }
});

test('a custom pack passes with an author and a git url, and each missing field is named', () => {
  assert.deepEqual(manifestProblems(custom), []);
  assert.deepEqual(manifestProblems({ ...custom, author: { name: 'Acme', email: 'a@acme.example' } }), []);
  for (const [field, value, said] of [['author', '', /needs an author/], ['repository', {}, /needs repository\.url/], ['repository', { url: 'not a url' }, /needs repository\.url/],
    ['type', 'mine', /needs a type: stock or custom/], ['version', '1', /needs a version/], ['license', undefined, /needs a license/], ['description', ' ', /needs a description/]]) {
    assert.match(manifestProblems({ ...custom, [field]: value }).join('\n'), said, field);
  }
  assert.match(manifestProblems(custom, 'other').join('\n'), /says its name is acme/);
});

test('list shows each pack\'s version, type and author', () => {
  assert.match(execFileSync('node', [CLI, 'list'], { encoding: 'utf8' }), /^mongo +1\.0\.0 +stock +Tim Clausen: MongoDB/m);
});
