// lib/pack-manifest.mts: what a pack.json must say.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { manifestProblems } from '../../../lib/pack-manifest.mjs';

const good = { name: 'demo', version: '1.2.0', description: 'a pack', type: 'stock', author: 'someone', license: 'MIT', repository: { url: 'https://example.com/x.git' } } as const;

test('a complete manifest has no problems, an author object with a name counts', () => {
  assert.deepEqual(manifestProblems(good, 'demo'), []);
  assert.deepEqual(manifestProblems({ ...good, author: { name: 'someone' } } as never, 'demo'), []);
});

test('each missing or wrong field is named with its folder', () => {
  const problems = manifestProblems({ name: 'demo', version: '1.2', type: 'weird', repository: { url: 'nope' } } as never, 'demo');
  assert.deepEqual(problems.map((p) => p.replace(/^pack demo /, '')), [
    'needs a version like 1.2.0', 'needs a description', 'needs a type: stock or custom', 'needs an author: who made it',
    'needs a license', 'needs repository.url: the git url it lives at',
  ]);
});

test('a name that differs from its folder is a problem of its own, and the folder is the default name', () => {
  assert.equal(manifestProblems(good, 'other')[0], 'pack other says its name is demo');
  assert.deepEqual(manifestProblems(good), []);
});
