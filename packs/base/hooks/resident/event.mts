// resident/event: one event, from a decoded request to its reply (review-2-go 1.4, 1.11, 2.9 to 2.13, 4.2). The judges of the table's
// rows for the event run at once on the pool; after the first exit 2 the rest get GRACE_MS more, and every refusal is returned in the
// table's order, never the order they arrived in. Recorders then run in turn: those of a PreToolUse call for every call (they record
// the call, a refusal included), the rest only when nothing refused. A hook that has not answered by the client's deadline is named in
// an "over time" line and in the crash log; one that answers after the reply is logged `late`, its exit 2 counted by `logs`. The
// timing and event lines are written here, in one append, by this thread: workers only return `{hook, ms, code}`.
import { crashVerdict } from '../lib/crash-policy.mts';
import { CRASHES, REFUSALS, logCall, type HookRun } from '../lib/event-log.mts';
import { shortHash } from '../lib/hash.mts';
import { LOG, appendRotated, hookLogLine } from '../lib/hook-log.mts';
import { hookRowsFor } from '../lib/hook-table.mts';
import { parseJson, toJson } from '../lib/json.mts';
import { readLayout } from '../lib/layout.mts';
import { asRecord, mergeOut } from '../lib/merge-out.mts';
import { PROTOCOL, overTime, type Reply, type WireRequest } from '../lib/proxy-wire.mts';
import { real } from '../lib/project.mts';
import { unreadWrites } from '../lib/unread-writes.mts';
import { resolve } from 'node:path';
import { mayHaveWritten, type ResidentIndex } from './index.mts';
import type { Done, Job } from './messages.mts';
import type { Pool } from './pool.mts';
import type { HookEvent, HookTableRow } from '../lib/types.d.mts';

/** After the first refusal, how long the other judges get to answer before the reply goes (review-2-go 2.9). */
export const GRACE_MS = 30;

export interface Served {
  /** The project's real path: the one this daemon serves. */
  project: string;
  table: readonly HookTableRow[];
  pool: Pool;
  index: ResidentIndex;
  /** Hook events served, and when the last one arrived (the idle clock). */
  counts: { events: number; last: number; inflight: number };
  log: (line: string) => void;
}

const fallback: Reply = { code: 0, stdout: '', stderr: '', fallback: 'ts' };
type Ran = Done & { queue: number };
const names = (rows: readonly HookTableRow[]): string[] => rows.map((r) => r.hook);

interface JudgePhase { ran: Map<string, Ran>; slow: string[] }

/** Every judge at once; resolves at the grace after the first refusal, at the deadline, or when all have answered. A judge that
 *  answers after that is handed to `late`. */
function judgeAll(d: Served, judges: readonly HookTableRow[], job: (hook: string) => Job, deadline: number, late: (hook: string, done: Ran) => void): Promise<JudgePhase> {
  const ran = new Map<string, Ran>();
  return new Promise((resolve) => {
    let over = false;
    let grace: NodeJS.Timeout | undefined;
    const finish = (): void => {
      over = true;
      clearTimeout(grace);
      clearTimeout(cutoff);
      resolve({ ran, slow: names(judges).filter((h) => !ran.has(h)) });
    };
    const cutoff = setTimeout(finish, Math.max(0, deadline - Date.now()));
    if (judges.length === 0) finish();
    for (const { hook } of judges) {
      void d.pool.run(job(hook)).then((done) => {
        if (over) { late(hook, done); return; }
        ran.set(hook, done);
        if (done.code === 2 && grace === undefined) grace = setTimeout(finish, GRACE_MS);
        if (ran.size === judges.length) finish();
      });
    }
  });
}

function lateLine(root: string, ev: HookEvent, hook: string, done: Done): void {
  const t = new Date().toISOString();
  appendRotated(root, LOG, hookLogLine({ event: ev.hook_event_name, hook, ms: done.ms, code: done.code, tool: ev.tool_name ?? ev.source }));
  if (done.code === 0) return;
  const id = shortHash(`${t}${hook}late`, 8);
  const line = toJson({ id, t, hook, code: done.code, reason: done.stderr, late: true, event: ev.hook_event_name, tool: ev.tool_name ?? ev.source, session: ev.session_id });
  appendRotated(root, done.code === 2 ? REFUSALS : CRASHES, `${line}\n`);
}

/** One event: a reply, or the TypeScript path's (`fallback`) for another project's event or a protocol this daemon does not speak. */
export async function serveEvent(d: Served, request: WireRequest, stdin: Buffer, arrival: number): Promise<Reply> {
  if (request.v !== PROTOCOL) return fallback;
  const root = resolve(request.env.CLAUDE_PROJECT_DIR ?? request.cwd);
  if (real(root) !== d.project) return fallback;   // the request carries data only: it never chooses what this daemon loads (4.2)
  const picked = Date.now() - arrival;
  const text = stdin.toString('utf8');
  const ev: HookEvent = asRecord(parseJson(text)) ?? {};
  const rows = hookRowsFor(d.table, ev);
  const base = { projectDir: root, cwd: request.cwd, env: request.env, sessionPid: request.ppid, now: Date.now(), layout: readLayout(root) };
  const job = (hook: string): Job => ({ hook, event: ev, ctx: base });
  d.counts.events += 1;
  d.counts.last = Date.now();

  const judges = rows.filter((r) => r.role === 'judge');
  const phase = await judgeAll(d, judges, job, request.deadline, (hook, done) => lateLine(root, ev, hook, done));
  const refused = [...phase.ran.values()].some((r) => r.code === 2);

  // the recorders: in turn, and only while the client still waits
  const record = rows.filter((r) => r.role === 'recorder' && (ev.hook_event_name === 'PreToolUse' || !refused));
  const skipped: string[] = [];
  for (const { hook } of record) {
    if (Date.now() >= request.deadline) { skipped.push(hook); continue; }
    phase.ran.set(hook, await d.pool.run(job(hook)));
  }
  const slow = [...phase.slow, ...skipped];

  // the verdict, in table order: arrival order never shows in the reply
  const arrived = rows.filter((r) => phase.ran.has(r.hook)).map((r): HookRun & { reason: string; out: string; queue: number } => {
    const r2 = phase.ran.get(r.hook) as Ran;
    return { hook: r.hook, ms: r2.ms, code: r2.code, reason: r2.stderr, out: r2.stdout, queue: r2.queue };
  });
  const crash = crashVerdict(root, ev, arrived, Date.now());
  const code = arrived.some((h) => h.code === 2) || crash.code === 2 ? 2 : 0;
  const note = slow.length > 0 ? toJson({ systemMessage: overTime(slow) }) : '';
  const outs = [...arrived.map((h) => h.out), crash.stdout, note, code === 0 ? unreadWrites(ev, root, request.env) : ''].filter((s): s is string => Boolean(s));
  const reply: Reply = { code, stdout: mergeOut(outs), stderr: [...arrived.map((h) => h.reason), crash.stderr ?? ''].join('') };

  // the lines: one append for the hooks and the event, then the call's own logs
  const wall = Date.now() - arrival;
  const tool = ev.tool_name ?? ev.source;
  const queue = picked + Math.max(0, ...arrived.map((h) => h.queue));
  appendRotated(root, LOG, arrived.map((h) => hookLogLine({ event: ev.hook_event_name, hook: h.hook, ms: h.ms, code: h.code, tool })).join('')
    + hookLogLine({ event: ev.hook_event_name, hook: 'event', ms: wall, code, tool, queue, source: 'daemon' }));
  logCall(root, text, [...arrived, ...slow.map((hook): HookRun => ({ hook, ms: 0, code: 1, reason: `${overTime([hook])}\n` }))], appendRotated, wall);
  if (ev.hook_event_name === 'PostToolUse' && mayHaveWritten(ev.tool_name)) d.index.stale();
  return reply;
}
