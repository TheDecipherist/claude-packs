// lib/suggest.mts: which packs a project needs, read from its files; the configuration an `init <pack>` that names none takes.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { detectedConfig, suggest, suggestionOf } from '../../../lib/suggest.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';

function nodeProject(): string {
  const dir = scratchDir('suggest-');
  put(`${dir}/package.json`, JSON.stringify({ name: 'x', dependencies: {} }));
  for (const f of ['a', 'b', 'c']) put(`${dir}/src/${f}.ts`, `export const ${f} = 1;\n`);
  return dir;
}

test('a project with code gets a configuration, its always packs and the exact install command, and the log says it', () => {
  const dir = nodeProject();
  const said: string[] = [];
  const pick = suggest(dir, { log: (l) => said.push(l) });
  assert.equal(pick.early, false);
  assert.equal(pick, pick, 'the pick is returned');
  assert.equal(said[0], `configuration: ${pick.config} (${pick.why})`);
  assert.ok(said.some((l) => l.startsWith('always: ')));
  assert.match(said.join('\n'), /Install exactly this: .* init --auto$/);
  assert.deepEqual(suggestionOf(dir).config, pick.config);
});

test('a project with no code yet says it comes from the notes alone, and names no configuration for a pack request', () => {
  const dir = scratchDir('suggest-early-');
  put(`${dir}/NOTES.md`, '# an idea\n');
  const said: string[] = [];
  const pick = suggest(dir, { log: (l) => said.push(l) });
  assert.equal(pick.early, true);
  assert.ok(said.some((l) => l.startsWith('no source yet')));
  assert.equal(detectedConfig(dir, ['base']), null);
});

test('an init that names packs takes the project\'s configuration only when it allows them (a planted pack it does not take)', () => {
  const dir = nodeProject();
  const config = suggestionOf(dir).config;
  assert.equal(detectedConfig(dir, ['base']), config);
  assert.throws(() => detectedConfig(dir, ['no-such-pack']), /unknown pack "no-such-pack"/);
});
