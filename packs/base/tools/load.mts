#!/usr/bin/env node
// `claude-packs load` (typescript order W8.8 item 0), also installed as `.claude/tools/load.mjs` so an agent in any project asks with
// one node start: the governor's straight answer to "how much can I use now".
//   load ask [--for test|build|fuzz|agent|install|other] [--want N] [--priority P] [--json]   go with the settings, or wait and why
//   load take [N] --for KIND [--priority P] [--pid PID] [--json]   reserve: a grant id and what it may use (refused: wait, exit 1)
//   load free ID [--json]                         give a grant back (a grant whose pid is gone is freed on the next read)
//   load jobs [--json]                            the jobs in flight and the queue
// Exit 0: go, granted or freed; 1: wait, refused or no such grant; 2: usage. The environment and the process facts come in through
// `main`'s arguments, never read inside it.
import { execFileSync } from 'node:child_process';
import { basename } from 'node:path';
import { ask, free, inFlight, machineHost, take } from '../hooks/lib/governor.mts';
import type { GovernorHost, JobKind } from '../hooks/lib/governor.mts';
import { isKind } from '../hooks/lib/governor-store.mts';
import { isMain } from '../hooks/lib/project.mts';
import type { Env } from '../hooks/lib/types.d.mts';

const USAGE = 'usage: load ask [--for KIND] [--want N] [--priority P] [--json] | load take [N] --for KIND [--priority P] [--pid PID] [--json] | load free ID | load jobs [--json]';
const PS_MS = 2000;

/** Who runs the command: its project, its parent's pid, and how to find the session that holds a grant. */
export interface Caller { env: Env; cwd: string; ppid: number; holder?: (ppid: number) => number }

interface Parsed {
  verb: string;
  kind: JobKind | undefined;
  want: number | undefined;
  pid: number | undefined;
  priority: number | undefined;
  json: boolean;
  words: string[];
}

/** Each flag that takes a value: what it sets, or why the value is wrong. */
const VALUE_FLAGS = {
  '--for': (v: string, out: Parsed) => (isKind(v) ? void (out.kind = v) : `--for takes one of test, build, fuzz, agent, install, other (got "${v}")`),
  '--want': (v: string, out: Parsed) => (Number(v) >= 1 ? void (out.want = Number(v)) : `--want takes a number of cores (got "${v}")`),
  '--pid': (v: string, out: Parsed) => (Number(v) >= 1 ? void (out.pid = Math.floor(Number(v))) : `--pid takes a pid (got "${v}")`),
  '--priority': (v: string, out: Parsed) => (v !== '' && Number(v) >= 0 && Number(v) <= 1 ? void (out.priority = Number(v)) : `--priority takes 0 to 1 (got "${v}")`),
} satisfies Record<string, (value: string, out: Parsed) => string | undefined>;
const isValueFlag = (word: string): word is keyof typeof VALUE_FLAGS => Object.hasOwn(VALUE_FLAGS, word);

/** The words; the priority, when no --priority is given, is the caller's CLAUDE_PACKS_PRIORITY (a lead sets it for an agent). */
function parse(args: readonly string[], env: Env): Parsed | string {
  const fromEnv = env['CLAUDE_PACKS_PRIORITY'];
  const out: Parsed = { verb: args[0] ?? '', kind: undefined, want: undefined, pid: undefined, json: false, words: [],
    priority: fromEnv ? Number(fromEnv) : undefined };
  for (let i = 1; i < args.length; i += 1) {
    const word = args[i] ?? '';
    if (word === '--json') out.json = true;
    else if (isValueFlag(word)) {
      const wrong = VALUE_FLAGS[word](args[i + 1] ?? '', out);
      if (wrong !== undefined) return wrong;
      i += 1;
    } else out.words.push(word);
  }
  return out;
}

/** The process that holds a grant taken from a shell: the nearest Claude Code above the caller (the session or agent, which outlives
 *  this tool call), else the caller's parent. One `ps` call; only `take` pays it, so `ask` stays one node start. */
export function sessionAbove(ppid: number): number {
  let table: string;
  try { table = execFileSync('ps', ['-axo', 'pid=,ppid=,comm='], { encoding: 'utf8', timeout: PS_MS }); } catch { return ppid; }
  const parent = new Map<number, { up: number; comm: string }>();
  for (const line of table.split('\n')) {
    const m = line.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/);
    if (m) parent.set(Number(m[1]), { up: Number(m[2]), comm: basename(m[3] ?? '') });
  }
  for (let pid = ppid, hops = 0; pid > 1 && hops < 64; hops += 1) {
    const row = parent.get(pid);
    if (row === undefined) break;
    if (row.comm === 'claude') return pid;
    pid = row.up;
  }
  return ppid;
}

const say = (json: boolean, line: string, value: unknown): void => { console.log(json ? JSON.stringify(value) : line); };

/** What one verb sees: the parsed words, the caller, the machine and the project the job runs for. */
interface Run { p: Parsed; caller: Caller; host: GovernorHost; project: string }

/** Each verb: its exit code (0 go, granted or freed; 1 wait, refused or none; 2 a wrong word). */
const VERBS = {
  ask: ({ p, host, project }: Run): number => {
    const answer = ask(host, { kind: p.kind, want: p.want, priority: p.priority, project });
    say(p.json, answer.line, answer);
    return answer.go ? 0 : 1;
  },
  take: ({ p, caller, host, project }: Run): number => {
    const want = p.want ?? (p.words[0] === undefined ? undefined : Number(p.words[0]));
    if (want !== undefined && !(want >= 1)) { console.error(`load: take wants a number of cores (got "${p.words[0] ?? ''}")\n${USAGE}`); return 2; }
    const pid = p.pid ?? (caller.holder ?? sessionAbove)(caller.ppid);
    const r = take(host, { kind: p.kind ?? 'other', want, priority: p.priority, project, pid });
    if (r.ok) say(p.json, r.grant.line, r.grant); else say(p.json, r.answer.line, r.answer);
    return r.ok ? 0 : 1;
  },
  free: ({ p, host }: Run): number => {
    const id = p.words[0];
    if (id === undefined) { console.error(USAGE); return 2; }
    const freed = free(host, id);
    say(p.json, freed ? `freed ${id}` : `no grant ${id} (already freed, or its holder ended)`, { id, freed });
    return freed ? 0 : 1;
  },
  jobs: ({ p, host }: Run): number => {
    const state = inFlight(host);
    const rows = state.jobs.map((j) => `${j.id} ${j.kind} ${j.slots} slots priority ${j.priority} pid ${j.pid}${j.pausedAt === null ? '' : ' paused'} ${j.project}`);
    const lines = [...rows, ...state.waiting.map((w) => `${w.id} ${w.kind} waiting for ${w.want} priority ${w.priority} pid ${w.pid} ${w.project}`)];
    say(p.json, lines.length ? lines.join('\n') : 'no jobs', state);
    return 0;
  },
} satisfies Record<string, (run: Run) => number>;
const isVerb = (word: string): word is keyof typeof VERBS => Object.hasOwn(VERBS, word);

/** The command; `host` is the governor's view of the machine (a test plants it). */
export function main(args: readonly string[], caller: Caller, host: GovernorHost = machineHost(caller.env)): number {
  const p = parse(args, caller.env);
  if (typeof p === 'string') { console.error(`load: ${p}\n${USAGE}`); return 2; }
  if (!isVerb(p.verb)) { console.error(USAGE); return 2; }
  return VERBS[p.verb]({ p, caller, host, project: caller.env['CLAUDE_PROJECT_DIR'] || caller.cwd });
}

if (isMain(import.meta.url)) process.exit(main(process.argv.slice(2), { env: process.env, cwd: process.cwd(), ppid: process.ppid }));
