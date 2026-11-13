// claude-packs logs: which hooks earn their place. Reads every log, rotated ones included, and joins each refusal to its verdict.
//   logs                                 per hook: calls, refusals, right, wrong, not judged, crashes, time
//   logs refusals [--hook <h>] [--open]  every refusal with its reason (--open: not judged yet)
//   logs mark <id> right|wrong "<why>"   the verdict, added to .claude/logs/verdicts.jsonl; nothing is rewritten
//   logs skills                          per installed skill: uses (Skill tool, /name prompt), last use; the never used (skills.jsonl)
//   logs rules                           per installed rule: loads (at launch, by its paths), last load; the never loaded (rules.jsonl)
//   logs crashes                         every crash, and whether it is cleared (KF-40: a crash is no refusal, and has no verdict)
//   logs clear <hook>|all fixed|superseded "<why>"   clears the crashes so far, for doctor (KF-18); a later crash is red again
import { appendFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ensureDir, readText } from '../packs/base/hooks/lib/files.mts';
import { readHookLog } from '../packs/base/hooks/lib/hook-log.mts';
import { asRecord, parseJson, toJson } from '../packs/base/hooks/lib/json.mts';
import { rulesReport, skillsReport } from './logs-usage.mts';
import type { Logger } from '../packs/base/hooks/lib/types.d.mts';

const DIR = join('.claude', 'logs');
const HOW: readonly string[] = ['fixed', 'superseded'];
export const ANSWERS: ReadonlySet<string> = new Set(['0', '2', '-', 'undefined', 'null']); // the codes of hooks.log that are no crash

/** One hook's part in a logged call. */
export interface LoggedHook { hook: string; ms: number; code: number | undefined }

/** One line of a `.claude/logs/*.jsonl` file (events, refusals, crashes, verdicts), each field narrowed from outside data. */
export interface LogRecord {
  id: string | undefined;
  t: string | undefined;
  hook: string | undefined;
  code: number | undefined;
  file: string | undefined;
  command: string | undefined;
  tool: string | undefined;
  reason: string | undefined;
  session: string | undefined;
  verdict: string | undefined;
  clear: string | undefined;
  hooks: LoggedHook[];
}

export interface HookSummary {
  hook: string;
  calls: number;
  refused: number;
  crashed: number;
  right: number;
  wrong: number;
  open: number;
  passedAfter: number;
  ms: number[];
}
export interface LogsSummary { first: string | undefined; last: string | undefined; calls: number; rows: HookSummary[] }

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined);

function loggedHook(value: unknown): LoggedHook[] {
  const h = asRecord(value);
  return h ? [{ hook: str(h['hook']) ?? '', ms: num(h['ms']) ?? 0, code: num(h['code']) }] : [];
}

/** A parsed line as a record, or none when it is not an object. */
function recordOf(value: unknown): LogRecord[] {
  const r = asRecord(value);
  if (!r) return [];
  const hooks = Array.isArray(r['hooks']) ? r['hooks'].flatMap(loggedHook) : [];
  return [{
    id: str(r['id']), t: str(r['t']), hook: str(r['hook']), code: num(r['code']), file: str(r['file']), command: str(r['command']),
    tool: str(r['tool']), reason: str(r['reason']), session: str(r['session']), verdict: str(r['verdict']), clear: str(r['clear']), hooks,
  }];
}

/** Every parsed line of `.claude/logs/<name>.jsonl` and its rotated files (`<name>-<stamp>.jsonl`), oldest file first. */
export function readJsonl(dir: string, name: string): unknown[] {
  const logs = join(dir, DIR);
  let files: string[] = [];
  try { files = readdirSync(logs).filter((f) => f === `${name}.jsonl` || (f.startsWith(`${name}-`) && f.endsWith('.jsonl'))).sort(); } catch { return []; }
  return files.flatMap((f) => (readText(join(logs, f)) ?? '').split('\n').filter(Boolean).map((l) => parseJson(l)));
}

const jsonlRecords = (dir: string, name: string): LogRecord[] => readJsonl(dir, name).flatMap(recordOf);

// A crash, in its own log or, in an old log, in refusals.jsonl with a code other than 2. Old lines are read as they are, never rewritten.
const crashesOf = (dir: string): LogRecord[] => [...jsonlRecords(dir, 'crashes'), ...jsonlRecords(dir, 'refusals').filter((r) => r.code !== 2)];
const refusalsOf = (dir: string): LogRecord[] => jsonlRecords(dir, 'refusals').filter((r) => r.code === 2);

/** hook -> the time of its last clear ("all" stands for every hook). doctor counts only a crash after it. */
export function clearsOf(dir: string): Map<string, string> {
  const clears = new Map<string, string>();
  for (const v of jsonlRecords(dir, 'verdicts')) if (v.clear !== undefined) clears.set(v.clear, v.t ?? '');
  return clears;
}
export const clearedAt = (clears: ReadonlyMap<string, string>, hook: string): string => [clears.get(hook), clears.get('all')].filter(Boolean).sort().at(-1) ?? '';

const addVerdict = (dir: string, line: Record<string, string>): void => {
  ensureDir(join(dir, DIR));
  appendFileSync(join(dir, DIR, 'verdicts.jsonl'), `${toJson({ ...line, t: new Date().toISOString() })}\n`);
};

function clearCrashes(dir: string, [, hook, how, ...why]: readonly string[], log: Logger): number {
  if (!hook || !how || !HOW.includes(how) || !why.length) throw new Error('use `logs clear <hook>|all fixed|superseded "<why>"`');
  const logged = readHookLog(dir, { rotated: true }).filter((r) => !ANSWERS.has(String(r.code)));
  if (![...crashesOf(dir), ...logged].some((c) => hook === 'all' || c.hook === hook)) throw new Error(`no crash of ${hook}: \`logs crashes\` lists them`);
  addVerdict(dir, { clear: hook, how, why: why.join(' ') });
  log(`${hook}: crashes so far cleared as ${how}`);
  return 0;
}

const where = (r: LogRecord): string => r.file ?? r.command ?? r.tool ?? '-';
const firstLine = (r: LogRecord): string => (r.reason ?? '').split('\n')[0] ?? '';

function listCrashes(dir: string, log: Logger): number {
  const clears = clearsOf(dir);
  const list = crashesOf(dir);
  for (const c of list) {
    const state = c.t !== undefined && c.t <= clearedAt(clears, c.hook ?? '') ? 'cleared' : 'open';
    log(`${c.id} ${c.t} ${c.hook} ${state}\n  ${where(c)}\n  ${firstLine(c)}`);
  }
  log(`${list.length} crash(es)`);
  return 0;
}

const verdictsOf = (dir: string): Map<string, LogRecord> => {
  const by = new Map<string, LogRecord>();
  for (const v of jsonlRecords(dir, 'verdicts')) if (v.id !== undefined) by.set(v.id, v);
  return by;
};
const middle = (list: readonly number[]): number => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)] ?? 0;

// A refusal followed by a pass on the same file in the same session: the writer changed something and went on.
function passedAfter(refusal: LogRecord, events: readonly LogRecord[]): boolean {
  if (refusal.t === undefined) return false;
  const after = (e: LogRecord): boolean => e.t !== undefined && e.t > (refusal.t ?? '');
  return events.some((e) => after(e) && e.session === refusal.session && e.file && e.file === refusal.file
    && e.hooks.some((h) => h.hook === refusal.hook && h.code === 0));
}

/** The summary `logs` prints: per hook its calls, refusals, verdicts, crashes and median time, the most refused first. */
export function logsSummary(dir: string): LogsSummary {
  const events = jsonlRecords(dir, 'events');
  const verdicts = verdictsOf(dir);
  const rows = new Map<string, HookSummary>();
  const row = (hook: string): HookSummary => {
    const have = rows.get(hook);
    if (have) return have;
    const made: HookSummary = { hook, calls: 0, refused: 0, crashed: 0, right: 0, wrong: 0, open: 0, passedAfter: 0, ms: [] };
    rows.set(hook, made);
    return made;
  };
  for (const e of events) for (const h of e.hooks) { const r = row(h.hook); r.calls += 1; r.ms.push(h.ms); }
  for (const c of crashesOf(dir)) row(c.hook ?? '').crashed += 1;
  for (const f of refusalsOf(dir)) {
    const r = row(f.hook ?? '');
    r.refused += 1;
    const v = f.id === undefined ? undefined : verdicts.get(f.id)?.verdict;
    if (v === 'right') r.right += 1; else if (v === 'wrong') r.wrong += 1; else r.open += 1;
    if (passedAfter(f, events)) r.passedAfter += 1;
  }
  return { first: events[0]?.t, last: events.at(-1)?.t, calls: events.length, rows: [...rows.values()].sort((a, b) => b.refused - a.refused || b.calls - a.calls) };
}

function markVerdict(dir: string, rest: readonly string[], log: Logger): number {
  const [, id, verdict, ...why] = rest;
  if (!id || (verdict !== 'right' && verdict !== 'wrong') || !why.length) throw new Error('use `logs mark <id> right|wrong "<why>"`');
  if (crashesOf(dir).some((r) => r.id === id)) throw new Error(`${id} is a crash, which refused nothing: \`logs clear <hook> fixed|superseded "<why>"\` clears it`);
  if (!refusalsOf(dir).some((r) => r.id === id)) throw new Error(`no refusal ${id}: \`logs refusals\` lists them`);
  addVerdict(dir, { id, verdict, why: why.join(' ') });
  log(`${id}: ${verdict}`);
  return 0;
}

function listRefusals(dir: string, rest: readonly string[], log: Logger): number {
  const hook = rest.includes('--hook') ? rest[rest.indexOf('--hook') + 1] : null;
  const verdicts = verdictsOf(dir);
  const verdictOf = (r: LogRecord): string | undefined => (r.id === undefined ? undefined : verdicts.get(r.id)?.verdict);
  const judged = (r: LogRecord): boolean => r.id !== undefined && verdicts.has(r.id);
  const list = refusalsOf(dir).filter((r) => (!hook || r.hook === hook) && (!rest.includes('--open') || !judged(r)));
  for (const r of list) log(`${r.id} ${r.t} ${r.hook} ${verdictOf(r) ?? 'not judged'}\n  ${where(r)}\n  ${firstLine(r)}`);
  log(`${list.length} refusal(s)`);
  return 0;
}

const pad = (width: number, value: string | number, left: boolean): string => (left ? String(value).padEnd(width) : String(value).padStart(width));

/** `claude-packs logs ...`: prints through `log`; the exit code. A malformed subcommand throws its usage line. */
export function logsCommand(dir: string, rest: readonly string[], log: Logger = console.log): number {
  const [sub] = rest;
  if (sub === 'mark') return markVerdict(dir, rest, log);
  if (sub === 'crashes') return listCrashes(dir, log);
  if (sub === 'clear') return clearCrashes(dir, rest, log);
  if (sub === 'skills') return skillsReport(dir, log);
  if (sub === 'rules') return rulesReport(dir, log);
  if (sub === 'refusals') return listRefusals(dir, rest, log);
  const s = logsSummary(dir);
  if (!s.calls) { log('no calls logged yet (.claude/logs/ fills as the hooks run)'); return 0; }
  log(`${s.calls} calls, ${s.first} to ${s.last}`);
  const table = (cells: readonly (string | number)[]): string => cells.map((c, i) => pad([24, 7, 8, 6, 6, 6, 6, 6, 6][i] ?? 6, c, i === 0)).join('');
  log(table(['hook', 'calls', 'refused', 'right', 'wrong', 'open', 'fixed', 'crash', 'ms']));
  for (const r of s.rows) log(table([r.hook, r.calls, r.refused, r.right, r.wrong, r.open, r.passedAfter, r.crashed, middle(r.ms)]));
  log('fixed: the same file passed the same hook later in that session. Judge the open ones: `logs refusals --open`, then `logs mark <id> right|wrong "<why>"`.');
  return 0;
}
