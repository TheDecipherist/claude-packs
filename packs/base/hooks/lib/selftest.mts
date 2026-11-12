// What a hook's `--selftest` runs on: a throwaway project, the hook run the way Claude Code runs
// it (payload on stdin, CLAUDE_PROJECT_DIR set) and its exit code judged. Every hook proves its
// law this way, so nobody probes a hook by pasting payloads into a shell command, where a guard
// that judges command text can refuse the probe itself (Sub37 WB-4). doctor runs every selftest.
// A selftest module is left out of the repo lint's no-process gates (d-20): it is the one place that runs as a process.
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { put, scratchDir, slash, walk } from './files.mts';
import { gitRun } from './git-run.mts';
import { toJson } from './json.mts';
import type { Layout, VerdictRow } from './types.d.mts';

const made: string[] = [];

export { put };   // its importers' name for writing a file; files.mts owns it
const SELFTEST_IDENTITY = { name: 'selftest', email: 'selftest@local' };
/** git in a selftest's scratch project, as the selftest; a failure throws, since the selftest's setup failed. */
export const git = (cwd: string, ...a: string[]): void => {
  const r = gitRun(a, { cwd, env: process.env, identity: SELFTEST_IDENTITY });
  if (!r.ok) throw new Error(`selftest setup: git ${a.join(' ')}: ${r.stderr.trim()}`);
};

/** files: { "rel/path": "text" }; layout, when given, becomes .claude/layout.json. The folder is removed by `verdicts`. */
export function scratchProject(files: Record<string, string> = {}, layout: Partial<Layout> | null = null): string {
  const dir = scratchDir('cp-selftest-');
  made.push(dir);
  if (layout) put(join(dir, '.claude/layout.json'), toJson(layout));
  for (const [rel, text] of Object.entries(files)) put(join(dir, rel), text);
  return dir;
}

/** The worktree case a hook exports beside `selftest` (`export const worktreeCase: WorktreeCase`), as data the test reads: each
 *  step fires the installed hook in a real project with an agent worktree and wants its exit code. Strings in `event` and in
 *  `files` may hold `{here}` (the main checkout) and `{wt}` (the worktree), swapped in by the test; `files` are written first,
 *  by path with those swapped in. The step's event is the payload as Claude Code sends it. */
export interface WorktreeStep { label: string; event: Record<string, unknown>; want: number }
export interface WorktreeCase { files?: Readonly<Record<string, string>>; steps: readonly WorktreeStep[] }

// The runner's own logs are not a judge's writes (the runner writes them for every hook, a judge or not).
const RUNNER_LOGS = /(?:^|\/)\.claude\/(?:hooks\.log|logs\/)/;
/** Every file under `dir` with its size and mtime, but the runner's logs: the state a judge's selftest must leave as it was. */
export function snapshot(dir: string): Map<string, string> {
  const seen = new Map<string, string>();
  for (const file of walk(dir)) {
    const rel = slash(relative(dir, file));
    if (RUNNER_LOGS.test(rel)) continue;
    const s = statSync(file);
    seen.set(rel, `${s.size}:${s.mtimeMs}`);
  }
  return seen;
}
/** The files that differ from a `snapshot` taken before (added, changed or gone): a judge's selftest row is `writtenSince(...).length`, wanted 0. */
export function writtenSince(dir: string, before: ReadonlyMap<string, string>): string[] {
  const now = snapshot(dir);
  return [...new Set([...before.keys(), ...now.keys()])].filter((k) => before.get(k) !== now.get(k)).sort();
}

/** What a hook run left: its exit code (null when it was stopped), stdout and stderr. */
export interface HookRun { status: number | null; stdout: string; stderr: string }

// A hook event goes through run-hooks.mjs, the way settings.json runs every kit hook (KWB-24), so each selftest proves the
// hook inside the runner; a by-hand mode (args, e.g. --init) runs the hook file itself.
const RUNNER = fileURLToPath(new URL('../run-hooks.mjs', import.meta.url));
export const runHook = (hook: string, dir: string, payload: unknown, args: readonly string[] = []): HookRun => {
  const r = spawnSync(process.execPath, args.length || !existsSync(RUNNER) ? [hook, ...args] : [RUNNER, hook], {
    cwd: dir, input: payload ? toJson(payload) : '', encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
  });
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
};

export const writeOf = (file_path: string, content = '// new\n') => ({ tool_name: 'Write', tool_input: { file_path, content } });
export const editOf = (file_path: string, old_string = 'a', new_string = 'b') => ({ tool_name: 'Edit', tool_input: { file_path, old_string, new_string } });
export const bashOf = (command: string, cwd?: string) => ({ tool_name: 'Bash', tool_input: { command }, ...(cwd ? { cwd } : {}) });
/** A transcript whose last prompt is `words`, for a hook that reads what the user asked this turn (suite-once, no-find). */
export function promptFile(dir: string, name: string, words: string): string {
  const file = join(dir, `${name}.jsonl`);
  put(file, `${toJson({ type: 'user', message: { content: words } })}\n`);
  return file;
}

// cases: [label, actual, wanted]. Prints "<name> selftest: OK (n cases)" or each failure; exit code.
export function verdicts(name: string, cases: readonly VerdictRow[]): number {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
  const bad = cases.filter(([, got, want]) => got !== want);
  for (const [label, got, want] of bad) console.error(`${name} selftest FAILED: ${label} (got ${got}, wanted ${want})`);
  if (!bad.length) console.log(`${name} selftest: OK (${cases.length} cases)`);
  return bad.length ? 1 : 0;
}
