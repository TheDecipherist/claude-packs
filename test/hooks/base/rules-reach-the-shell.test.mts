// rules-reach-the-shell: a path-scoped rule reaches a Bash call that touches its files. The hook's contract, then its caches.
import assert from 'node:assert/strict';
import { utimesSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { bash } from '../../fixtures/installs.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';
import { GIVE_BUDGET, hook } from '../../../packs/base/hooks/rules-reach-the-shell.mts';
import { put, scratchProject } from '../../../packs/base/hooks/lib/selftest.mts';

holdsTheContract({
  hook: 'rules-reach-the-shell.mjs',
  dir: () => fixture('base'),
  same: (project) => ({ payload: bash('cat build.md', project), status: 0 }),
});

const rule = (line: string): string => `---\npaths:\n  - "build.md"\n---\n\n# Plan\n\n${line}\n`;

// The resident runner keeps the module loaded, so the parsed rules and each session's held set are cached in-process (WB-8 in
// supernova2_monitor: 6 ms a call before). A cache must never hand out a rule older than its file, nor give one twice.
test('an edited rule is read again, and a rule is given once per session in one process', () => {
  const dir = scratchProject({ '.claude/rules/plan.md': rule('Date a log line.'), 'build.md': '# b\n' });
  const ctx = { projectDir: dir, cwd: dir, env: process.env, now: Date.now(), layout: {}, log: () => undefined } as never;
  const call = (session: string): string => {
    const event = { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'cat build.md' }, cwd: dir, session_id: session };
    const verdict = hook(event, ctx);
    assert.ok(!(verdict instanceof Promise), 'the hook answers at once');
    return verdict.stdout;
  };
  assert.match(call('a'), /Date a log line/);
  assert.equal(call('a'), '', 'the same session is not given the rule again');
  put(join(dir, '.claude/rules/plan.md'), rule('Put the zone on a log line.'));
  const later = new Date(Date.now() + 5000);
  utimesSync(join(dir, '.claude/rules/plan.md'), later, later);
  assert.match(call('b'), /Put the zone on a log line/, 'a new session gets the rule as its file now reads');
  assert.doesNotMatch(call('c'), /Date a log line/);
});

// supernova2_monitor: one call gave about 30 rules and Claude Code cut 55,113 characters of them, each logged as given
test('a rule held back by the budget comes with the session\'s next Bash call, whatever it touches', () => {
  const long = (n: string): string => `---\npaths:\n  - "build.md"\n---\n\n# Long ${n}\n\n${'Keep it. '.repeat(280)}\n`;
  const dir = scratchProject({ '.claude/rules/l1.md': long('one'), '.claude/rules/l2.md': long('two'), '.claude/rules/l3.md': long('three'), 'build.md': '# b\n' });
  const ctx = { projectDir: dir, cwd: dir, env: process.env, now: Date.now(), layout: {}, log: () => undefined } as never;
  const run = (command: string): string => {
    const verdict = hook({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command }, cwd: dir, session_id: 'p' }, ctx);
    assert.ok(!(verdict instanceof Promise));
    return verdict.stdout;
  };
  const first = run('cat build.md');
  assert.ok(first.length <= GIVE_BUDGET + 600, `the first call gives ${first.length} characters`);
  assert.doesNotMatch(first, /# Long three/);
  assert.match(run('git status --short'), /# Long three/, 'the next call, naming no file, brings the rule held back');
  assert.equal(run('git status --short'), '', 'and nothing after that');
});
