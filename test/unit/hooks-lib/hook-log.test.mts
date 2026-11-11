// hook-log.mts: the log's rotation and its size limit (read from the layout file, the memo keyed by its mtime), and the tail every
// hook ends with (runAsHook, through dispatchHook): --selftest, a declared by-hand flag, an unknown flag, a failing selftest,
// a hook that throws.
import assert from 'node:assert/strict';
import { readdirSync, utimesSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { put, readText, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { LOG, LOGS, appendRotated, asHook, contextOf, dispatchHook, isMain, readHookLog, runAsHook, takesContext } from '../../../packs/base/hooks/lib/hook-log.mts';
import { snapshot, writtenSince } from '../../../packs/base/hooks/lib/selftest.mts';
import { pass, refuse } from '../../../packs/base/hooks/lib/verdict.mts';
import type { Hook, HookContext } from '../../../packs/base/hooks/lib/types.d.mts';

function project(layout?: unknown): string {
  const root = scratchDir('hook-log-');
  put(join(root, '.claude', 'keep'), '');
  if (layout !== undefined) put(join(root, '.claude', 'layout.json'), JSON.stringify(layout));
  return root;
}

const rotated = (root: string): string[] => { try { return readdirSync(join(root, LOGS)); } catch { return []; } };

// asHook writes to the project the environment names: a scratch one for the test, the old value put back after.
async function inProject<T>(root: string, run: () => Promise<T>): Promise<T> {
  const was = process.env.CLAUDE_PROJECT_DIR;
  process.env.CLAUDE_PROJECT_DIR = root;
  try { return await run(); } finally { if (was === undefined) delete process.env.CLAUDE_PROJECT_DIR; else process.env.CLAUDE_PROJECT_DIR = was; }
}

test('a log past guards.logs.maxKb moves whole to .claude/logs and a new one starts', () => {
  const root = project({ guards: { logs: { maxKb: 1 } } });
  appendRotated(root, LOG, 'a'.repeat(600));
  assert.deepEqual(rotated(root), []);
  appendRotated(root, LOG, 'b'.repeat(600));
  assert.equal(rotated(root).length, 1);
  assert.equal(readText(join(root, LOG)), null);
});

test('the limit is read again when the layout file changes: the memo key holds its mtime', () => {
  const root = project({ guards: { logs: { maxKb: 1 } } });
  const layout = join(root, '.claude', 'layout.json');
  appendRotated(root, LOG, 'a'.repeat(900));
  put(layout, JSON.stringify({ guards: { logs: { maxKb: 100 } } }));
  const later = new Date(Date.now() + 5000);
  utimesSync(layout, later, later);
  appendRotated(root, LOG, 'b'.repeat(900));
  assert.deepEqual(rotated(root), [], 'the larger limit holds: nothing rotated');
});

test('a planted bad layout and a missing .claude both leave the log alone: the default limit, no throw', () => {
  const root = project();
  put(join(root, '.claude', 'layout.json'), '{ not json');
  appendRotated(root, LOG, 'x\n');
  assert.equal(readText(join(root, LOG)), 'x\n');
  const bare = scratchDir('hook-log-bare-');
  appendRotated(bare, LOG, 'x\n');
  assert.equal(readText(join(bare, LOG)), null, 'it never creates .claude');
});

test('readHookLog reads lines of five or more fields with a numeric ms, and the rotated ones on request', () => {
  const root = project();
  put(join(root, LOGS, 'hooks-20260101-000000.log'), '2026-01-01T00:00:00.000Z\tPreToolUse\told\t5\t0\tBash\n');
  put(join(root, LOG), '2026-01-02T00:00:00.000Z\tStop\tnew\t7\t2\t-\nshort\tline\nt\te\th\tNaN\t0\t-\n');
  assert.deepEqual(readHookLog(root).map((e) => e.hook), ['new']);
  assert.deepEqual(readHookLog(root, { rotated: true }).map((e) => [e.hook, e.ms, e.code]), [['old', 5, '0'], ['new', 7, '2']]);
});

test('--selftest runs the selftest and its code is the code', async () => {
  let hooked = false;
  assert.equal(await dispatchHook(['--selftest'], 'x', () => { hooked = true; return 0; }, () => 0), 0);
  assert.equal(hooked, false);
});

test('a selftest that fails returns its code, and the hook is not run', async () => {
  let hooked = false;
  assert.equal(await dispatchHook(['--selftest'], 'x', () => { hooked = true; return 0; }, () => 1), 1);
  assert.equal(hooked, false);
});

test('a declared by-hand flag runs its handler with the arguments; --selftest still comes first', async () => {
  const seen: string[][] = [];
  const flags = { '--check': (args: readonly string[]) => { seen.push([...args]); return 3; } };
  assert.equal(await dispatchHook(['--check', 'a'], 'x', () => 0, () => 0, { flags }), 3);
  assert.deepEqual(seen, [['--check', 'a']]);
  assert.equal(await dispatchHook(['--check', '--selftest'], 'x', () => 0, () => 9, { flags }), 9);
  assert.equal(seen.length, 1);
});

test('an unknown flag is ignored as before: the hook runs on stdin, its call is logged with its exit code', async () => {
  const root = project();
  const code = await inProject(root, () => dispatchHook(['--no-such-flag'], 'planted', () => 2, () => 0, { flags: { '--check': () => 5 }, stdin: () => '{}' }));
  assert.equal(code, 2);
  assert.deepEqual(readHookLog(root).map((e) => [e.hook, e.code]), [['planted', '2']]);
});

test('a hook that throws still has its call logged (exit 1) and the error comes out', async () => {
  const root = project();
  await inProject(root, async () => {
    await assert.rejects(dispatchHook([], 'boom', () => { throw new Error('planted'); }, () => 0, { stdin: () => '{}' }), /planted/);
  });
  assert.deepEqual(readHookLog(root).map((e) => [e.hook, e.code]), [['boom', '1']]);
});

test('asHook gives 0 for a hook that returns nothing and logs it', async () => {
  const root = project();
  assert.equal(await inProject(root, () => asHook('quiet', () => undefined, () => '')), 0);
  assert.deepEqual(readHookLog(root).map((e) => [e.hook, e.code]), [['quiet', '1']], 'the log says what the hook returned: none is written as 1, as before');
});

test('imported, not run: isMain is false and runAsHook does nothing', async () => {
  const other = new URL('./not-the-program.mts', import.meta.url).href;
  assert.equal(isMain(other), false);
  let ran = false;
  await runAsHook(other, 'x', () => { ran = true; return 0; }, () => { ran = true; return 0; });
  assert.equal(ran, false);
});

// ---- the hook contract (typescript order W4): hook(event, ctx) -> Verdict beside hook(text) -> number ----
const EVENT = JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'x' } });

test('contextOf: the project, folder, environment, parent, time and layout of this process, each overridable', () => {
  const root = project({ folders: { src: { path: 'src' } }, concepts: {} });
  const made = contextOf({ projectDir: root });
  assert.equal(made.projectDir, root);
  assert.equal(made.cwd, process.cwd());
  assert.equal(made.sessionPid, process.ppid);
  assert.ok(Math.abs(made.now - Date.now()) < 5000);
  assert.deepEqual(Object.keys(made.layout.folders), ['src'], 'the layout is the project\'s own');
  const over = contextOf({ projectDir: root, cwd: '/elsewhere', sessionPid: 7, env: { A: '1' } });
  assert.deepEqual([over.cwd, over.sessionPid, over.env.A], ['/elsewhere', 7, '1']);
});

test('takesContext: two parameters is the contract, one is the old kind', () => {
  const two: Hook = (_event, _ctx) => pass;
  assert.equal(takesContext(two), true);
  assert.equal(takesContext((_text: string) => 0), false);
});

test('a two-parameter hook gets the parsed event and a context; its Verdict code is the exit code, logged once', async () => {
  const root = project();
  const seen: [string | undefined, HookContext][] = [];
  const judge: Hook = (ev, ctx) => { seen.push([ev.tool_name, ctx]); return refuse('planted refusal'); };
  assert.equal(await inProject(root, () => asHook('planted', judge, () => EVENT)), 2);
  assert.equal(seen[0]?.[0], 'Bash');
  assert.equal(seen[0]?.[1].projectDir, root);
  assert.deepEqual(readHookLog(root).filter((r) => r.hook === 'planted').map((r) => [r.event, r.code, r.tool]), [['PreToolUse', '2', 'Bash']]);
});

test('a one-parameter hook still runs as it did: the text in, the code out', async () => {
  const root = project();
  let got = '';
  assert.equal(await inProject(root, () => asHook('old', (text: string) => { got = text; return 0; }, () => EVENT)), 0);
  assert.equal(got, EVENT);
  assert.equal(readHookLog(root).filter((r) => r.hook === 'old').length, 1);
});

test('a two-parameter hook that returns no Verdict, or throws, is a crash: the error comes out, the call is logged as 1', async () => {
  const root = project();
  const silent = ((_event: unknown, _ctx: unknown) => undefined) as unknown as Hook;
  await assert.rejects(inProject(root, () => asHook('silent', silent, () => EVENT)), /returned no Verdict/);
  await assert.rejects(inProject(root, () => asHook('boom', (_e, _c) => { throw new Error('planted'); }, () => EVENT)), /planted/);
  assert.deepEqual(readHookLog(root).map((r) => [r.hook, r.code]), [['silent', '1'], ['boom', '1']]);
});

test('dispatchHook takes either kind: --selftest first, a flag next, else the hook', async () => {
  const root = project();
  const judge: Hook = (_event, _ctx) => refuse('x');   // declared with both parameters: `length` 2 is what makes it this kind
  assert.equal(await dispatchHook(['--selftest'], 'j', judge, () => 0), 0);
  assert.equal(await inProject(root, () => dispatchHook([], 'j', judge, () => 0, { stdin: () => EVENT })), 2);
  assert.equal(await dispatchHook(['--check'], 'j', judge, () => 0, { flags: { '--check': () => 4 } }), 4);
});

test('the write trap: a judge that writes a file is seen, one that leaves the project alone is not; the runner\'s logs do not count', () => {
  const root = project();
  put(join(root, 'a.txt'), 'one\n');
  const before = snapshot(root);
  put(join(root, LOG), 'a line the runner wrote\n');
  assert.deepEqual(writtenSince(root, before), []);
  put(join(root, 'a.txt'), 'changed text\n');
  put(join(root, 'new.txt'), 'x');
  assert.deepEqual(writtenSince(root, before), ['a.txt', 'new.txt']);
});
