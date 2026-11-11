// run-hooks: one node process runs every kit hook of one settings entry, instead of one node process per hook (KWB-24:
// The user saw 17 hooks take 48 s on one rm; each was its own node start, all at once, on a loaded machine). settings.json
// names the runner and its hooks in one command: node ".../run-hooks.mjs" .claude/hooks/a.mjs .claude/hooks/b.mjs
// Each hook module exports hook(text) (the event's JSON text, as stdin was). It returns a Verdict ({ code, stdout, stderr },
// types.d.mts: the interface every hook reaches in W4) or, until W4 has moved them all, an exit code with its output written to
// the process's streams. The runner calls them in turn, keeps each one's stdout and stderr, writes each one's timing line to
// .claude/hooks.log (lib/hook-log.mjs) and its own (hook "run-hooks": the whole process, node's start-up included), and exits 2
// if any hook refused. A hook that throws, or exits with anything but 0 or 2, crashed, and lib/crash-policy.mjs decides what the
// call does (KF-18: a crash on a tool call refuses once, and says so). lib/unread-writes.mjs says when no hook could read what a
// command writes (KF-40). The merged output is held to 9,000 characters (Claude Code cuts a hook's output at 10,000), with a
// line saying what was cut. Every hook still runs on its own too (node .claude/hooks/a.mjs, its selftest, a hand-made entry).
//   node run-hooks.mjs <hook path or name>...   (stdin: the event)
//   node run-hooks.mjs --selftest
import { readFileSync, rmSync, writeSync } from 'node:fs';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { crashVerdict } from './lib/crash-policy.mts';
import { logCall } from './lib/event-log.mts';
import { childError, ensureDir, put, readText, scratchDir } from './lib/files.mts';
import { appendRotated, isMain, logHook, projectRoot, readHookLog } from './lib/hook-log.mts';
import { parseJson, toJson } from './lib/json.mts';
import { verdicts } from './lib/selftest.mts';
import { unreadWrites } from './lib/unread-writes.mts';
import type { Env } from './lib/shell-writes.mts';
import type { HookEvent, Verdict } from './lib/types.d.mts';

const HERE = dirname(fileURLToPath(import.meta.url));
export const RUNNER = 'run-hooks';
/** What the merged text of one event may hold: Claude Code cuts a hook's output at 10,000 characters. */
export const OUT_CAP = 9000;
export const nameOf = (arg: string): string => basename(arg).replace(/\.mjs$/, '');
const fileOf = (arg: string): string => (isAbsolute(arg) ? arg : join(HERE, `${nameOf(arg)}.mjs`));

/** What a hook module's `hook` gives back: a Verdict, or (until W4 moves every hook) an exit code, its output in the streams. */
export type HookResult = Verdict | number | void | undefined;
type ModuleHook = (text: string) => HookResult | Promise<HookResult>;

type Json = Record<string, unknown>;
const asRecord = (value: unknown): Json | null => (value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : null);
const isVerdict = (value: unknown): value is Verdict => {
  const v = asRecord(value);
  return v !== null && typeof v.code === 'number' && typeof v.stdout === 'string' && typeof v.stderr === 'string';
};

function hookOf(mod: unknown): ModuleHook | null {
  const fn = asRecord(mod)?.hook;
  return typeof fn === 'function' ? (fn as ModuleHook) : null;
}

const cutNote = (n: number): string => `\n[run-hooks: ${n} characters of the hooks' output were cut here; Claude Code cuts a hook's output at 10,000]\n`;

// The text of the longest string field a merged JSON object carries, found where hooks put their words.
function wordiest(obj: Json): { get: () => string; set: (s: string) => void } | null {
  const holders: { get: () => string; set: (s: string) => void }[] = [];
  for (const k of ['systemMessage', 'reason', 'stopReason']) {
    if (typeof obj[k] === 'string') holders.push({ get: () => String(obj[k]), set: (s) => { obj[k] = s; } });
  }
  const spec = asRecord(obj.hookSpecificOutput);
  if (spec && typeof spec.additionalContext === 'string') holders.push({ get: () => String(spec.additionalContext), set: (s) => { spec.additionalContext = s; } });
  return holders.sort((a, b) => b.get().length - a.get().length)[0] ?? null;
}

/** The merged text held to OUT_CAP: plain text is cut at the end; a JSON object has its wordiest message cut, so it still parses. */
export function capOut(text: string): string {
  if (text.length <= OUT_CAP) return text;
  const obj = asRecord(parseJson(text));
  const holder = obj ? wordiest(obj) : null;
  if (obj && holder) {
    const whole = holder.get();
    let kept = whole.length;
    while (kept > 0) {
      kept = Math.max(0, kept - Math.max(1, toJson(obj).length - OUT_CAP + cutNote(whole.length).length));
      holder.set(whole.slice(0, kept) + cutNote(whole.length - kept));
      if (toJson(obj).length <= OUT_CAP) return toJson(obj);
    }
  }
  const keep = OUT_CAP - cutNote(text.length).length;
  return text.slice(0, keep) + cutNote(text.length - keep);
}

// Several hooks' stdout: one is passed as it is; JSON objects are merged (their messages joined), anything else joined by lines.
export function mergeOut(outs: readonly string[]): string {
  const said = outs.filter((o) => o.trim());
  if (said.length < 2) return capOut(said[0] ?? '');
  const objs = said.map((o) => asRecord(parseJson(o)));
  const plain = objs.some((o) => o === null);
  if (plain) return capOut(said.map((o) => o.replace(/\n$/, '')).join('\n') + '\n');
  const out: Json = {};
  for (const o of objs) {
    for (const [k, v] of Object.entries(o ?? {})) {
      const have = out[k];
      const here = asRecord(v);
      const prior = asRecord(have);
      if (k === 'hookSpecificOutput' && prior) {
        const ctx = [prior.additionalContext, here?.additionalContext].filter(Boolean).join('\n');
        out[k] = { ...prior, ...here, ...(ctx ? { additionalContext: ctx } : {}) };
      } else if (typeof v === 'string' && typeof have === 'string' && ['systemMessage', 'reason', 'stopReason'].includes(k)) out[k] = `${have}\n${v}`;
      else out[k] = v;
    }
  }
  return capOut(JSON.stringify(out));
}

// A number-returning hook writes to the process's streams, so they are caught while it runs. W4 removes this, and the call
// that uses it, when the last hook returns a Verdict.
const capture = (stream: NodeJS.WriteStream, sink: string[]): (() => void) => {
  const write = stream.write;
  stream.write = ((chunk: unknown, ...rest: unknown[]): boolean => {
    sink.push(String(chunk));
    const cb = rest.find((r) => typeof r === 'function');
    if (typeof cb === 'function') cb();
    return true;
  }) as typeof stream.write;
  return () => { stream.write = write; };
};

export interface RunResult { code: number; stdout: string; stderr: string }
/** What of the process the runner reaches for, given by whoever calls it (the tail below, or a test): the environment, and the
 *  streams a number-returning hook writes to. */
export interface Caller { env: Env; stdout: NodeJS.WriteStream; stderr: NodeJS.WriteStream }
interface Judged { hook: string; ms: number; code: number; reason: string; out: string }

// -> { code, stdout, stderr }. Each hook's own time is logged (its module's first import included).
export async function runAll(args: readonly string[], text: string, root: string, caller: Caller): Promise<RunResult> {
  const ev: HookEvent = asRecord(parseJson(text)) ?? {}; // an unparsable event: the hooks read it themselves
  const outs: string[] = [];
  const err: string[] = [];
  const judged: Judged[] = [];
  let code = 0;
  for (const arg of args) {
    const name = nameOf(arg);
    const out: string[] = [];
    const before = err.length;
    const t0 = performance.now();
    const undo = [capture(caller.stdout, out), capture(caller.stderr, err)];
    let c = 0;
    try {
      const fn = hookOf(await import(pathToFileURL(fileOf(arg)).href));
      if (!fn) throw new Error(`${name} exports no hook(text)`);
      const result = await fn(text);
      if (isVerdict(result)) {
        c = result.code;
        out.push(result.stdout);
        err.push(result.stderr);
      } else c = Number.isInteger(result) ? (result as number) : 0;
    } catch (e) {
      c = 1;
      err.push(`run-hooks: ${name} failed: ${e instanceof Error ? (e.stack ?? e.message) : childError(e)}\n`);
    } finally {
      for (const u of undo) u();
    }
    outs.push(out.join(''));
    const ms = performance.now() - t0;
    logHook(root, { event: ev.hook_event_name, hook: name, ms, code: c, tool: ev.tool_name ?? ev.source });
    judged.push({ hook: name, ms, code: c, reason: err.slice(before).join(''), out: out.join('') });
    if (c === 2) code = 2;
  }
  logCall(root, text, judged, appendRotated, performance.now());
  const crash = crashVerdict(root, ev, judged, Date.now());
  if (crash.stderr) err.push(crash.stderr);
  if (crash.code === 2) code = 2;
  outs.push(...[crash.stdout, code === 0 ? unreadWrites(ev, root, caller.env) : ''].filter((s): s is string => Boolean(s)));
  return { code, stdout: mergeOut(outs), stderr: err.join('') };
}

async function selftest(real: Caller): Promise<number> {
  const dir = scratchDir('run-hooks-');
  ensureDir(join(dir, '.claude'));
  const fake = (name: string, body: string): string => { const f = join(dir, `${name}.mjs`); put(f, `export function hook(text) {\n${body}\n}\n`); return f; };
  const ok = fake('says-ok', "process.stdout.write('{\"systemMessage\":\"a\"}'); return 0;");
  const no = fake('refuses', "process.stderr.write('BLOCKED by refuses\\n'); return JSON.parse(text).tool_name === 'Bash' ? 2 : 0;");
  const also = fake('also-says', "console.log(JSON.stringify({ systemMessage: 'b' })); return 0;");
  const boom = fake('throws', "throw new Error('planted');");
  const veto = fake('returns-verdict', "return { code: 2, stdout: '', stderr: 'VERDICT refusal\\n' };");
  const talk = fake('returns-words', "return { code: 0, stdout: JSON.stringify({ systemMessage: 'v' }), stderr: '' };");
  const loud = Array.from({ length: 30 }, (_, i) => fake(`loud-${i}`, `return { code: 0, stdout: JSON.stringify({ systemMessage: ${toJson(`h${i} `.repeat(250).slice(0, 500))} }), stderr: '' };`));
  const wall = Array.from({ length: 30 }, (_, i) => fake(`wall-${i}`, `return { code: 0, stdout: ${toJson(`w${i} `.repeat(250).slice(0, 499))} + '\\n', stderr: '' };`));
  const caller: Caller = { ...real, env: {} };
  const bash = toJson({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'rm x' } });
  const cases: [string, number | boolean | string | null, number | boolean | string | null][] = [];
  const r1 = await runAll([ok, no, also], bash, dir, caller);
  cases.push(['a refusal is the runner\'s exit 2', r1.code, 2]);
  cases.push(['its message reaches stderr', r1.stderr.includes('BLOCKED by refuses'), true]);
  cases.push(['two JSON outputs merge into one', asRecord(parseJson(r1.stdout))?.systemMessage === 'a\nb', true]);
  const r2 = await runAll([ok, no], toJson({ hook_event_name: 'PreToolUse', tool_name: 'Write' }), dir, caller);
  cases.push(['no refusal: exit 0', r2.code === 0 && r2.stdout === '{"systemMessage":"a"}', true]);
  const r3 = await runAll([boom, ok], bash, dir, caller);
  cases.push(['a hook that throws refuses the call, says so, and the next still runs', r3.code === 2 && r3.stderr.includes('throws crashed') && r3.stdout.includes('"a"'), true]);
  const r4 = await runAll([boom, ok], bash, dir, caller);
  cases.push(['the same call again goes through, and says so', r4.code === 0 && r4.stdout.includes('throws crashed'), true]);
  const rows = readHookLog(dir);
  cases.push(['one timing line per hook per call', rows.length === 9 && rows.filter((r) => r.hook === 'refuses').map((r) => r.code).join() === '2,0', true]);
  cases.push(['the line names the event and the tool', rows[0]?.event === 'PreToolUse' && rows[0]?.tool === 'Bash', true]);
  const lines = (f: string): Json[] => (readText(join(dir, '.claude/logs', f)) ?? '').split('\n').filter(Boolean).map((l) => asRecord(parseJson(l)) ?? {});
  const refused = lines('refusals.jsonl');
  cases.push(['every call is a line of events.jsonl', lines('events.jsonl').length, 4]);
  cases.push(['a refusal keeps its reason and what was tried', refused[0]?.hook === 'refuses' && String(refused[0]?.reason).includes('BLOCKED by refuses') && refused[0]?.command === 'rm x', true]);
  cases.push(['a crash is kept, in its own log', !refused.some((r) => r.hook === 'throws') && lines('crashes.jsonl').some((r) => r.hook === 'throws' && r.code === 1), true]);
  const r5 = await runAll([talk, veto], bash, dir, caller);
  cases.push(['a hook that returns a Verdict is judged by it: its code, its stderr, its stdout', r5.code === 2 && r5.stderr.includes('VERDICT refusal') && r5.stdout.includes('"v"'), true]);
  const r6 = await runAll(loud, toJson({ hook_event_name: 'UserPromptSubmit' }), dir, caller);
  const merged = asRecord(parseJson(r6.stdout));
  cases.push(['30 hooks of 500 characters: the merged JSON is held to 9,000 and still parses', r6.stdout.length <= OUT_CAP && merged !== null, true]);
  cases.push(['and a line says what was cut', String(merged?.systemMessage).includes('characters of the hooks\' output were cut'), true]);
  const r7 = await runAll(wall, toJson({ hook_event_name: 'UserPromptSubmit' }), dir, caller);
  cases.push(['30 plain-text hooks: held to 9,000, the cut named at the end', r7.stdout.length <= OUT_CAP && r7.stdout.includes('were cut here'), true]);
  cases.push(['a short merge is untouched', mergeOut(['a\n', 'b\n']), 'a\nb\n']);
  rmSync(dir, { recursive: true, force: true });
  return verdicts('run-hooks', cases);
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  const caller: Caller = { env: process.env, stdout: process.stdout, stderr: process.stderr };
  if (args.includes('--selftest')) process.exit(await selftest(caller));
  let text = '';
  try { text = readFileSync(0, 'utf8'); } catch { /* no stdin */ }
  const root = projectRoot();
  const r = await runAll(args, text, root, caller);
  const ev: HookEvent = asRecord(parseJson(text)) ?? {}; // logged as '-' when there is none
  logHook(root, { event: ev.hook_event_name, hook: RUNNER, ms: performance.now(), code: r.code, tool: ev.tool_name ?? ev.source });
  // written at once, then out: a hook may leave a timer or a child behind, and the event never waits on it
  for (const [fd, s] of [[1, r.stdout], [2, r.stderr]] as const) if (s) try { writeSync(fd, s); } catch { /* a closed pipe */ }
  process.exit(r.code);
}
