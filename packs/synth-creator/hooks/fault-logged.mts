// fault-logged: a turn whose last reply admits a fault in the work ends only when this turn added an entry to the project's bug log
// or workflow-bug log (the fault is logged before it is fixed, and a fault told in a reply and never written is gone with the session).
// A Stop hook. The admission is read from the reply's own words: a bug found, a hook that blocked correct work, a red test that could
// not be explained, work lost. A sentence about a planted fault or an expected failure ("the planted fault turned the gate red", "the
// test failed as expected", "seen red without the fix", "red first") is the method working, never an admission.
// The log paths are `files.bugs` and `files.workflowBugs` in `.claude/layout.json` (defaults bugs.md and workflow-bugs.md); a log entry is
// any write to either file in the turn. It never loops: it sends a turn back once, and a turn already sent back (stop_hook_active) ends.
//   node fault-logged.mjs --selftest
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toJson } from './lib/json.mts';
import { contextOf, isMain, runAsHook } from './lib/hook-log.mts';
import { readLayout } from './lib/layout.mts';
import { put, runHook, scratchProject, verdicts } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import { lastTurn, writesOfTurn } from './lib/turn.mts';
import type { Env, Hook, HookEvent, VerdictRow } from './lib/types.d.mts';
import { pass, refuse } from './lib/verdict.mts';

// A sentence that tells of a fault planted on purpose, or a failure that was wanted: the method working.
const WANTED = /\b(?:planted|plants?|as expected|expected (?:to )?(?:fail|red)|failed on purpose|on purpose|deliberate(?:ly)?|red first|seen red|(?:without|before) the fix|expected failure|should fail|must fail)\b/i;

const ADMITS: readonly RegExp[] = [
  /\b(?:found|hit|met|discovered|there (?:is|was)|turned up|introduced)\s+(?:a|an|another|the)\s+(?:\w+\s+){0,2}(?:bug|fault|regression)\b/i,
  /\b(?:my|our)\s+(?:bug|mistake|fault)\b|\bI\s+(?:broke|introduced a bug)\b/i,
  /\b(?:hook|guard|gate|check)\s+(?:wrongly\s+|incorrectly\s+|falsely\s+)?(?:blocked|refused|rejected)\s+(?:correct|valid|good|harmless|legitimate)\b/i,
  /\b(?:blocked|refused|rejected)\s+(?:correct|valid|good|harmless|legitimate)\s+(?:work|edits?|writes?|commands?)\b/i,
  /\b(?:test|gate|build)\b[^.\n]*\b(?:red|fail\w*)\b[^.\n]*\b(?:could\s*n[o']t|cannot|can't|unable to|do\s*n[o']t know how to)\s+explain\b|\b(?:could\s*n[o']t|cannot|can't|unable to)\s+explain\b[^.\n]*\b(?:red|fail\w*)\b/i,
  /\bunexplained\s+(?:red|failure|test)/i,
  /\b(?:lost|wiped|overwrote|clobbered|discarded)\s+(?:\w+\s+){0,2}(?:work|changes|edits|commits|files)\b/i,
];

const sentences = (text: string): string[] => text.split(/(?<=[.!?])\s+|\n+/).filter((s) => s.trim());

/** True when the reply admits a fault in the work, sentences about planted faults and expected failures left out. */
export function admitsFault(reply: string): boolean {
  return sentences(reply).filter((s) => !WANTED.test(s)).some((s) => ADMITS.some((re) => re.test(s)));
}

/** The log files the project keeps, as relative paths. */
export function logPaths(root: string): string[] {
  const files = readLayout(root).files ?? {};
  return [files['bugs'] ?? 'bugs.md', files['workflowBugs'] ?? 'workflow-bugs.md'];
}

const wroteALog = (event: HookEvent, root: string, env: Env): boolean => {
  const logs = logPaths(root);
  const turn = lastTurn(event.transcript_path ?? '');
  return writesOfTurn(turn, root, env).some((w) => logs.some((rel) => w.path === resolve(root, rel) || w.path.endsWith(`/${rel}`)));
};

export const hook: Hook = (event, ctx) => {
  if (event.hook_event_name !== 'Stop' || event.stop_hook_active) return pass;
  const reply = event.last_assistant_message ?? (event.transcript_path ? lastTurn(event.transcript_path).text : '');
  if (!admitsFault(reply) || wroteALog(event, ctx.projectDir, ctx.env)) return pass;
  const [bugs, workflow] = logPaths(ctx.projectDir);
  return refuse(
    `BLOCKED by fault-logged: your last reply admits a fault in the work, and this turn added no entry to ${bugs} or ${workflow}. `
    + 'Log it now, before the fix: when it was found, what happens, where. Use the workflow-bugs skill for a fault in the way the work is done '
    + '(a hook, the queue, a test run) and bugs.md for a fault in the product. If the reply only told of a planted fault or a failure expected '
    + 'by the test, say so in plain words. This turn is sent back once.',
  );
};

const write = (id: string, file: string, text: string): object => ({ type: 'assistant', cwd: '', message: { content: [{ type: 'tool_use', id, name: 'Write', input: { file_path: file, content: text } }] } });
const said = (text: string): object => ({ type: 'assistant', message: { content: [{ type: 'text', text }] } });
const turnOf = (...entries: object[]): string => [{ type: 'user', message: { content: 'go' } }, ...entries].map((e) => toJson(e)).join('\n');
const FAULT = 'I found a bug: the gate counts the last slot twice.';

/** A fault admitted and no log written in the worktree is sent back; the worktree's own log line lets it end. */
export const worktreeCase: WorktreeCase = {
  files: {
    '{wt}/none.jsonl': turnOf(said(FAULT)),
    '{wt}/logged.jsonl': turnOf(write('w1', '{wt}/workflow-bugs.md', '| WB-1 | 2026-11-13 | the gate counts the last slot twice |\n'), said(FAULT)),
  },
  steps: [
    { label: 'a fault admitted, no log written in the worktree', event: { hook_event_name: 'Stop', transcript_path: '{wt}/none.jsonl', cwd: '{wt}', last_assistant_message: FAULT }, want: 2 },
    { label: 'the same, the worktree log written', event: { hook_event_name: 'Stop', transcript_path: '{wt}/logged.jsonl', cwd: '{wt}', last_assistant_message: FAULT }, want: 0 },
  ],
};

export function selftest(): number {
  const dir = scratchProject({ 'src/a.ts': 'a\n' }, { files: { bugs: 'docs/my-bugs.md' } });
  const ctx = contextOf({ projectDir: dir, cwd: dir, env: { CLAUDE_PROJECT_DIR: dir } });
  const stop = (reply: string, entries: object[] = [], extra: Record<string, unknown> = {}): number => {
    const file = `${dir}/t${Math.random().toString(36).slice(2)}.jsonl`;
    // the transcript is a file the judge reads; the judge writes none
    put(file, `${turnOf(...entries, said(reply))}\n`);
    return runHook(fileURLToPath(import.meta.url), dir, { hook_event_name: 'Stop', transcript_path: file, last_assistant_message: reply, ...extra }).status ?? -1;
  };
  const other_event = (): number => { const v = hook({ hook_event_name: 'PostToolUse', last_assistant_message: FAULT }, ctx); return v instanceof Promise ? -1 : v.code; };
  const entry = write('l1', `${dir}/workflow-bugs.md`, '| WB-1 | x |\n');
  const own = write('l2', `${dir}/docs/my-bugs.md`, '| B-1 | x |\n');
  const other = write('l3', `${dir}/notes.md`, 'a note\n');
  const must = ['the planted fault turned the gate red', 'The test failed as expected.', 'Seen red without the fix, green with it.', 'Red first, then the fix.',
    'I planted a bug in the fixture and the gate caught it.', 'The hook refused the planted write, as it should.'];
  const rows: VerdictRow[] = [
    ['a bug admitted, no log', stop(FAULT), 2],
    ['a hook that blocked correct work, no log', stop('The stage-guard hook blocked correct work, a plain add of a named file.'), 2],
    ['a red test it could not explain, no log', stop('One test is red and I cannot explain why it fails.'), 2],
    ['work lost, no log', stop('I lost the work of the last hour when the checkout was reset.'), 2],
    ['the same reply once workflow-bugs.md was written this turn', stop(FAULT, [entry]), 0],
    ['the same once the layout-named bug log was written', stop(FAULT, [own]), 0],
    ['a write to another file is no log', stop(FAULT, [other]), 2],
    ['a turn already sent back ends (never loops)', stop(FAULT, [], { stop_hook_active: true }), 0],
    ['a plain report', stop('Landed. 46 of 46 green.'), 0],
    ...must.map((m): VerdictRow => [`must pass: ${m}`, stop(m), 0]),
    ['a hook event that is not Stop', other_event(), 0],
  ];
  return verdicts('fault-logged', rows);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'fault-logged', hook, selftest);
