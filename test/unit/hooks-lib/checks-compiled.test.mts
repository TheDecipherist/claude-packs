// checks-compiled.mts (W8.3): the lesson checks read once at update, keyed by the lock and the check files, read by the hook while the key holds.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { loadChecks } from '../../../packs/base/hooks/lesson-checks.mts';
import { COMPILED_FILE, checksKey, readCompiled, writeCompiledChecks } from '../../../packs/base/hooks/lib/checks-compiled.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { readJson, toJson, writeJson } from '../../../packs/base/hooks/lib/json.mts';

const check = (id: string): string => toJson({ id, why: 'w', rule: 'r', globs: ['**/*.js'], pattern: `${id}\\(`, bad: `${id}(`, good: 'ok' });

function project(): string {
  const dir = scratchDir('compiled-');
  put(join(dir, '.claude/checks/a.json'), check('alpha'));
  put(join(dir, '.claude/checks/b.json'), check('beta'));
  put(join(dir, '.claude/claude-packs.lock.json'), toJson({ kit: '1', files: {} }));
  return dir;
}

test('compiled at update: the hook reads the one file while the lock and the check files are as they were', () => {
  const dir = project();
  assert.equal(readCompiled(dir), null, 'nothing compiled yet');
  assert.equal(writeCompiledChecks(dir), true);
  assert.deepEqual(readCompiled<{ id: string }>(dir)?.map((c) => c.id), ['alpha', 'beta']);
  // the plant: a compiled file whose check the folder does not hold is the one loaded (the read is the compiled one)
  const file = join(dir, COMPILED_FILE);
  const kept = readJson<{ key: string; checks: Record<string, unknown>[] }>(file);
  assert.ok(kept);
  writeJson(file, { ...kept, checks: kept.checks.map((c) => ({ ...c, id: `${String(c['id'])}-compiled` })) });
  assert.deepEqual(loadChecks(dir).map((c) => c.id), ['alpha-compiled', 'beta-compiled']);
});

test('a check added or edited by the project, or a new lock, makes the compiled file stale: the files are read as before', () => {
  const dir = project();
  writeCompiledChecks(dir);
  const key = checksKey(dir);
  put(join(dir, '.claude/checks/c.json'), check('gamma'));
  assert.notEqual(checksKey(dir), key, 'a check the lock does not list');
  assert.equal(readCompiled(dir), null);
  assert.deepEqual(loadChecks(dir).map((c) => c.id).sort(), ['alpha', 'beta', 'gamma'], 'the stale file is not trusted');
  writeCompiledChecks(dir);
  put(join(dir, '.claude/checks/a.json'), check('alpha-two'));
  assert.equal(readCompiled(dir), null, 'an edit');
  assert.deepEqual(loadChecks(dir).map((c) => c.id).sort(), ['alpha-two', 'beta', 'gamma']);
  writeCompiledChecks(dir);
  assert.ok(readCompiled(dir));
  put(join(dir, '.claude/claude-packs.lock.json'), toJson({ kit: '2', files: {} }));
  assert.equal(readCompiled(dir), null, 'a new lock');
});

test('a check file that is not JSON is not compiled, and the hook still names it', () => {
  const dir = project();
  put(join(dir, '.claude/checks/bad.json'), '{ not json');
  assert.equal(writeCompiledChecks(dir), false);
  assert.throws(() => loadChecks(dir), /bad\.json is not JSON/);
});

test('a project with no checks folder compiles nothing', () => {
  assert.equal(writeCompiledChecks(scratchDir('compiled-')), false);
});
