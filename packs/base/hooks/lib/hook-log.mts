// hook-log: every hook's run time, one line per call in the project's .claude/hooks.log (KWB-24: The user saw 17 hooks take 48 s on
// one rm and nothing said which). A line: ISO time, event, hook, ms, exit code, tool, tab-separated. The node hooks write it
// through this file (the runner for the hooks it runs, asHook for a hook run on its own); the python ones through
// lib/house.py's log_hook, the same line. doctor reads it (median and worst per hook over its last 100 calls).
// Nothing is ever cleared. Past LOG_MAX_BYTES a log moves whole to .claude/logs/ under a dated name and a new one starts (appendRotated).
// Until a project knows which hooks earn their place it needs all of its history, so no rotated file is deleted.
// lib/event-log.mjs keeps the detail: every call, and every refusal with its reason.
//   asHook(name, fn): a hook run as its own process: stdin to fn(text), the time since the process began, logged; the exit code
//   isMain(import.meta.url): true when this module is the program node was started with (never when the runner imports it)
//   runAsHook(url, name, main, selftest, options): the tail every hook ends with: when run directly, --selftest, a declared
//     by-hand flag, or the hook itself on stdin; then the process exits with the code
//   logHook(root, { event, hook, ms, code, tool })    readHookLog(root) -> [{ time, event, hook, ms, code, tool }]
// This file is the hooks' process boundary (typescript order d-23): it alone reads the process (argv, env, cwd, stdin, stderr,
// exit), so the repo lint's gates 11 and 12 leave it out by name.
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { logCall } from './event-log.mts';
import { readJson } from './json.mts';
import { readLayout } from './layout.mts';
import { isMain } from './project.mts';
import { isVerdict } from './verdict.mts';
import { readPayload } from './writes.mts';
import type { Hook, HookContext, Verdict } from './types.d.mts';

export const LOG: string = join('.claude', 'hooks.log');
export const LOG_MAX_BYTES = 1024 * 1024;
export const LOGS: string = join('.claude', 'logs');

/** One line of hooks.log. `code` is the text of the exit code (`-` when none was written). */
import type { HookLogLine } from './types.d.mts';
/** One line of the hook log (types.d.mts owns the shape; the CLI reads an install's log through it). */
export type HookLogEntry = HookLogLine & { queue?: number; source?: string };

/** What logHook is given: `ms` and `hook` are the call's; the rest are written as `-` when missing. The `event` line the runner
 *  writes per event (hook `event`) adds `queue` (ms from the event's arrival to its first hook) and `source` (`runner`, `daemon`,
 *  `proxy`) as the 7th and 8th columns; a per-hook line has neither. */
export interface HookLogCall { event?: string; hook?: string | null; ms: number; code?: number | null; tool?: string; queue?: number; source?: string }

interface LayoutLogs { guards?: { logs?: { maxKb?: unknown } } }

// The size limit, read from the layout file alone (hook-log needs no layout module for one number). The memo's key holds
// the file's mtime, so a layout edited while a resident runner lives is read again (typescript order W3.3, d-10).
const limits = new Map<string, number>();
const mtimeOf = (file: string): number => { try { return statSync(file).mtimeMs; } catch { return 0; } };
function maxBytes(root: string): number {
  const file = join(root, '.claude', 'layout.json');
  const key = `${root}\0${mtimeOf(file)}`;
  const known = limits.get(key);
  if (known !== undefined) return known;
  const kb = readJson<LayoutLogs>(file)?.guards?.logs?.maxKb;
  const bytes = Number(kb ?? LOG_MAX_BYTES / 1024) * 1024;
  limits.set(key, bytes);
  return bytes;
}
/** The time as a name part: `20261112-071314`. The one stamp of a rotated log's name (the daemon's log, in resident/, has a copy to drop). */
export const stamp = (): string => new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);

// Moves a full log to .claude/logs/<name>-<time><ext>. A second writer finding it gone just carries on: nothing is lost.
function rotate(root: string, file: string): void {
  const ext = extname(file);
  const name = basename(file, ext);
  const dir = join(root, LOGS);
  mkdirSync(dir, { recursive: true });
  let to = join(dir, `${name}-${stamp()}${ext}`);
  for (let n = 1; existsSync(to); n += 1) to = join(dir, `${name}-${stamp()}-${n}${ext}`);
  renameSync(file, to);
}

/** One or more lines onto a log, rotating it when full. Never throws, never creates .claude: a hook is never stopped by its own log. */
export function appendRotated(root: string, rel: string, text: string): void {
  try {
    if (!existsSync(join(root, '.claude'))) return;
    const file = join(root, rel);
    mkdirSync(join(file, '..'), { recursive: true });
    appendFileSync(file, text);
    if (statSync(file).size > maxBytes(root)) rotate(root, file);
  } catch { /* the log never stops a hook */ }
}

/** True when this module's file `url` is the program node was started with: project.mts owns it, every hook imports it from here. */
export { isMain };
/** The project the hook runs for: CLAUDE_PROJECT_DIR, else the folder the process runs in. */
export const projectRoot = (): string => resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());

export function hookLogLine({ event = '-', hook, ms, code, tool = '-', queue, source }: HookLogCall): string {
  const clean = (v: unknown): string => String(v ?? '-').replace(/[\t\n]/g, ' ') || '-';
  const more = source === undefined ? '' : `\t${Math.round(queue ?? 0)}\t${clean(source)}`;
  return `${new Date().toISOString()}\t${clean(event)}\t${clean(hook)}\t${Math.round(ms)}\t${code ?? '-'}\t${clean(tool)}${more}\n`;
}

export const logHook = (root: string, call: HookLogCall): void => appendRotated(root, LOG, hookLogLine(call));

/** One line per refused concept in .claude/usage.log: time, hook, concept (the shape hooks count what they refuse). */
export function logRefusal(root: string, hook: string, concepts: Iterable<string>): void {
  try {
    mkdirSync(join(root, '.claude'), { recursive: true });
    const t = new Date().toISOString();
    appendRotated(root, join('.claude', 'usage.log'), [...new Set(concepts)].map((c) => `${t}\t${hook}\t${c}\n`).join(''));
  } catch { /* the count is a report, never a reason to fail the hook */ }
}

const readOrEmpty = (file: string): string => { try { return readFileSync(file, 'utf8'); } catch { return ''; } };

function rotatedHookLogs(root: string): string[] {
  try { return readdirSync(join(root, LOGS)).filter((f) => /^hooks-.*\.log$/.test(f)).sort().map((f) => join(root, LOGS, f)); } catch { return []; }
}

/** The live log, or with `{ rotated: true }` every line it ever held (doctor's crash report: a crash is not over because its line moved). */
export function readHookLog(root: string, { rotated = false }: { rotated?: boolean } = {}): HookLogEntry[] {
  const old = rotated ? rotatedHookLogs(root) : [];
  const text = [...old, join(root, LOG)].map(readOrEmpty).join('\n');
  const entries: HookLogEntry[] = [];
  for (const line of text.split('\n')) {
    const c = line.split('\t');
    if (c.length < 5 || !/^\d+$/.test(c[3] ?? '')) continue;
    entries.push({ time: c[0] ?? '', event: c[1] ?? '', hook: c[2] ?? '', ms: Number(c[3]), code: c[4] ?? '', tool: c[5] ?? '-', ...(c[7] !== undefined && /^\d+$/.test(c[6] ?? '') ? { queue: Number(c[6]), source: c[7] } : {}) });
  }
  return entries;
}

const eventOf = (text: string): { event?: string; tool?: string } => {
  const p = readJsonText(text);
  if (p === null) return {};
  const tool = p.tool_name ?? p.source;
  return { ...(typeof p.hook_event_name === 'string' ? { event: p.hook_event_name } : {}), ...(typeof tool === 'string' ? { tool } : {}) };
};
const readJsonText = (text: string): Record<string, unknown> | null => {
  try { const p: unknown = JSON.parse(text); return p !== null && typeof p === 'object' ? p as Record<string, unknown> : null; } catch { return null; }
};

/** What a hook's main is until W4 moves it: the event text in, the exit code out, its words written to the process's streams. */
export type HookMain = (text: string) => number | void | Promise<number | void>;
/** Either kind of hook function: `hook(event, ctx)` returning a Verdict (declared with both parameters, `length` 2), or a HookMain. */
export type HookFn = HookMain | Hook;
/** True for a hook declared with both parameters: it is called with the event and a context and returns a Verdict. */
export const takesContext = (fn: HookFn): fn is Hook => fn.length >= 2;

/** The context of an event run on its own, from this process: the project (CLAUDE_PROJECT_DIR, else the folder), the folder, the
 *  environment, the parent process (Claude Code), now, the project's layout and a logger to stderr. `over` replaces any of them
 *  (a test, a caller that is not this process). The runner builds its own from its caller, once per event. */
export function contextOf(over: Partial<HookContext> = {}): HookContext {
  const projectDir = over.projectDir ?? projectRoot();
  return {
    projectDir,
    cwd: process.cwd(),
    env: process.env,
    sessionPid: process.ppid,
    now: Date.now(),
    layout: readLayout(projectDir),
    log: (line: string): void => { process.stderr.write(`${line}\n`); },
    ...over,
  };
}

/** A Verdict's words written at once to the process's streams (a hook may leave a timer behind, and the event never waits on it). */
export function writeVerdict(verdict: Verdict): void {
  for (const [fd, text] of [[1, verdict.stdout], [2, verdict.stderr]] as const) if (text) try { writeSync(fd, text); } catch { /* a closed pipe */ }
}

/** What arrives on stdin; empty when nothing does (a hook started by hand). The one stdin reader of the runner, the hooks and the bar. */
export function readStdinText(): string {
  try { return readFileSync(0, 'utf8'); } catch { return ''; }
}

/** A hook run on its own: the time is from the process's start (node's own start-up included, which is what a hook costs). */
export async function asHook(name: string | null | undefined, fn: HookFn, readStdin: () => string = readStdinText): Promise<number> {
  let text = '';
  try { text = readStdin(); } catch { /* no stdin */ }
  const said: string[] = [];
  const write = process.stderr.write.bind(process.stderr);
  process.stderr.write = ((chunk: string | Uint8Array, ...rest: unknown[]): boolean => { said.push(String(chunk)); return (write as (...a: unknown[]) => boolean)(chunk, ...rest); }) as typeof process.stderr.write;
  let code: number | void | undefined;
  try {
    if (takesContext(fn)) {
      // the contract: the parsed event and a context in, a Verdict out; its words are written here, its code is the exit code
      const verdict: unknown = await fn(readPayload(text) ?? {}, contextOf());
      if (!isVerdict(verdict)) throw new Error(`${name ?? 'the hook'} returned no Verdict`);
      writeVerdict(verdict);
      said.push(verdict.stderr);
      code = verdict.code;
    } else code = await fn(text);
  } finally {
    process.stderr.write = write;
    const hook = name ?? basename(process.argv[1] ?? '-').replace(/\.\w+$/, '');
    const root = projectRoot();
    logHook(root, { ...eventOf(text), hook, ms: performance.now(), code: code ?? 1 });
    logCall(root, text, [{ hook, ms: performance.now(), code: code ?? 1, reason: said.join('') }], appendRotated);
  }
  return code ?? 0;
}

/** A by-hand flag a hook declares: `--key`, `--cost`, `--check`. Its handler gets the arguments after the program's own two. */
export type FlagHandler = (args: readonly string[]) => number | Promise<number>;
export interface RunAsHookOptions {
  /** By-hand flags, by name with the dashes (`'--check'`): when argv holds one, its handler runs instead of the hook. */
  flags?: Readonly<Record<string, FlagHandler>>;
  /** Where the event text comes from: the process's stdin by default; a test gives its own. */
  stdin?: () => string;
}

/** Which way a hook's own process goes, by its arguments: `--selftest` first, then a declared flag in the order declared, else
 *  the hook on stdin. An argument no one declared is ignored, as the hooks ignored it before: Claude Code passes none. A
 *  selftest's code, a flag's code and the hook's code are returned; a hook that throws still has its call logged (asHook) and
 *  the error comes out to the caller. */
export async function dispatchHook(argv: readonly string[], name: string, main: HookFn, selftest: () => number | Promise<number>, options: RunAsHookOptions = {}): Promise<number> {
  if (argv.includes('--selftest')) return selftest();
  for (const [flag, handler] of Object.entries(options.flags ?? {})) if (argv.includes(flag)) return handler(argv);
  return asHook(name, main, options.stdin);
}

/** The tail of every hook: `runAsHook(import.meta.url, '<name>', main, selftest, { flags })`. Nothing happens when the hook is
 *  imported (the runner). Run directly, it dispatches (see dispatchHook) and exits with the code; a throw is printed as node
 *  would print it, and exits 1. */
export async function runAsHook(url: string, name: string, main: HookFn, selftest: () => number | Promise<number>, options: RunAsHookOptions = {}): Promise<void> {
  if (!isMain(url)) return;
  let code: number;
  try {
    code = await dispatchHook(process.argv.slice(2), name, main, selftest, options);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
    code = 1;
  }
  process.exit(code);
}
