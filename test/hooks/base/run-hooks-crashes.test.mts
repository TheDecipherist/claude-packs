// run-hooks: what doctor says of a crash, and how one is cleared (split from run-hooks.test.mts so no file sums over a minute).
import { readFileSync, statSync, utimesSync } from 'node:fs';
import { join } from 'node:path';
import { assert, cli, put, test } from '../../kit-cli.mts';
import { workProject } from '../work-project.mts';

const crashLine = (ms: number): string => `${new Date(Date.now() + ms).toISOString()}\tPreToolUse\tfolder-law\t3\t1\tWrite\n`;

test('KF-18: a crash fixed by hand clears with a stated reason, and a later crash is red again', () => {
  const dir = workProject();
  const log = join(dir, '.claude/hooks.log');
  put(log, crashLine(-1000 + 60_000));
  assert.equal(cli(dir, 'doctor').status, 1);
  assert.notEqual(cli(dir, 'logs', 'clear', 'folder-law', 'fixed').status, 0, 'a reason is required');
  assert.notEqual(cli(dir, 'logs', 'clear', 'folder-law', 'gone', 'x').status, 0, 'only fixed or superseded');
  assert.notEqual(cli(dir, 'logs', 'clear', 'secrets-guard', 'fixed', 'nothing to clear').status, 0, 'a hook with no crash has nothing to clear');
  const clear = cli(dir, 'logs', 'clear', 'folder-law', 'fixed', 'the', 'config', 'regex', 'was', 'mine');
  assert.equal(clear.status, 0, clear.stdout + clear.stderr);
  // the clear is stamped now and the crash line a minute ahead, so move the line back before the clear, as it really was
  put(log, crashLine(-60_000));
  assert.equal(cli(dir, 'doctor').status, 0);
  put(log, crashLine(-60_000) + crashLine(120_000));
  const r = cli(dir, 'doctor');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /folder-law\.mjs crashed on 1 call/);
  assert.match(readFileSync(join(dir, '.claude/logs/verdicts.jsonl'), 'utf8'), /the config regex was mine/);
});

test('KF-18: a crash older than a file in hooks/lib is history: an update that fixes a shared lib clears it', () => {
  const dir = workProject();
  const hookTime = statSync(join(dir, '.claude/hooks/folder-law.mjs')).mtimeMs;
  put(join(dir, '.claude/hooks.log'), `${new Date(hookTime + 5_000).toISOString()}\tPreToolUse\tfolder-law\t3\t1\tWrite\n`);
  assert.equal(cli(dir, 'doctor').status, 1);
  const later = new Date(hookTime + 10_000);
  utimesSync(join(dir, '.claude/hooks/lib/selftest.mjs'), later, later);
  assert.equal(cli(dir, 'doctor').status, 0);
});
