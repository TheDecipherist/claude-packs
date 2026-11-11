// selftest.mts: what a hook's --selftest is built from: the throwaway project, the state snapshot, the payload makers and the verdict line.
// (runHook spawns the runner; the hook tests fire it, so it is not run here.)
import assert from 'node:assert/strict';
import { existsSync, readFileSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { bashOf, editOf, git, promptFile, put, scratchProject, snapshot, verdicts, writeOf, writtenSince } from '../../../packs/base/hooks/lib/selftest.mts';

/** What verdicts printed, for the cases it was given. */
function judged(cases: Parameters<typeof verdicts>[1]): { code: number; out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  const [log, error] = [console.log, console.error];
  console.log = (...a: unknown[]): void => { out.push(a.join(' ')); };
  console.error = (...a: unknown[]): void => { err.push(a.join(' ')); };
  try { return { code: verdicts('demo', cases), out, err }; } finally { console.log = log; console.error = error; }
}

test('a scratch project holds the files and the layout it was given, and verdicts removes it', () => {
  const dir = scratchProject({ 'src/a.js': 'x\n' }, { folders: {}, concepts: {} });
  assert.equal(readFileSync(join(dir, 'src/a.js'), 'utf8'), 'x\n');
  assert.ok(existsSync(join(dir, '.claude/layout.json')));
  judged([]);
  assert.equal(existsSync(dir), false);
  assert.equal(existsSync(join(scratchProject(), '.claude/layout.json')), false, 'no layout unless one is given');
  judged([]);
});

test('a snapshot sees what was added, changed or removed since, and never the runner\'s own logs', () => {
  const dir = scratchDir('selftest-snap-');
  put(join(dir, 'a.txt'), 'one');
  put(join(dir, 'b.txt'), 'two');
  const before = snapshot(dir);
  assert.deepEqual(writtenSince(dir, before), []);
  put(join(dir, '.claude/hooks.log'), 'log');
  put(join(dir, '.claude/logs/events.jsonl'), 'log');
  assert.deepEqual(writtenSince(dir, before), [], 'runner logs are not a judge\'s writes');
  put(join(dir, 'c.txt'), 'new');
  writeFileSync(join(dir, 'a.txt'), 'changed!');
  utimesSync(join(dir, 'a.txt'), 1, 1);
  assert.deepEqual(writtenSince(dir, before), ['a.txt', 'c.txt']);
});

test('the payload makers give the shapes Claude Code sends', () => {
  assert.deepEqual(writeOf('/p/a.js'), { tool_name: 'Write', tool_input: { file_path: '/p/a.js', content: '// new\n' } });
  assert.deepEqual(editOf('/p/a.js', 'x', 'y'), { tool_name: 'Edit', tool_input: { file_path: '/p/a.js', old_string: 'x', new_string: 'y' } });
  assert.deepEqual(bashOf('ls'), { tool_name: 'Bash', tool_input: { command: 'ls' } });
  assert.deepEqual(bashOf('ls', '/p'), { tool_name: 'Bash', tool_input: { command: 'ls' }, cwd: '/p' });
  const dir = scratchDir('selftest-prompt-');
  assert.match(readFileSync(promptFile(dir, 'turn', 'run the whole suite'), 'utf8'), /"content":"run the whole suite"/);
});

test('verdicts prints OK for matching cases and each failure for the rest, with the exit code', () => {
  const ok = judged([['a', 0, 0], ['b', 2, 2]]);
  assert.deepEqual([ok.code, ok.out, ok.err], [0, ['demo selftest: OK (2 cases)'], []]);
  const bad = judged([['fine', 0, 0], ['planted fault got through', 0, 2]]);
  assert.equal(bad.code, 1);
  assert.deepEqual(bad.err, ['demo selftest FAILED: planted fault got through (got 0, wanted 2)']);
  assert.deepEqual(bad.out, []);
});

test('git in a selftest project runs as the selftest and throws on a failed setup', () => {
  const dir = scratchDir('selftest-git-');
  git(dir, 'init', '-q');
  assert.ok(existsSync(join(dir, '.git')));
  assert.throws(() => git(dir, 'no-such-subcommand'), /selftest setup: git no-such-subcommand/);
});
