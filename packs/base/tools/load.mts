#!/usr/bin/env node
// `claude-packs load` (typescript order W8.8 item 0), also installed as `.claude/tools/load.mjs` so an agent in any project asks with
// one node start: the governor's straight answer to "how much can I use now".
//   load ask [--for test|build|fuzz|agent|install|other] [--want N] [--json]   one line: go with the settings, or wait and why
//   load take [N] --for KIND [--pid P] [--json]   reserve: a grant id and what it may use (refused: wait, exit 1)
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

const USAGE = 'usage: load ask [--for KIND] [--want N] [--json] | load take [N] --for KIND [--pid P] [--json] | load free ID | load jobs [--json]';
const PS_MS = 2000;

/** Who runs the command: its project, its parent's pid, and how to find the session that holds a grant. */
export interface Caller { env: Env; cwd: string; ppid: number; holder?: (ppid: number) => number }

interface Parsed { verb: string; kind: JobKind | undefined; want: number | undefined; pid: number | undefined; json: boolean; words: string[] }

function parse(args: readonly string[]): Parsed | string {
  const out: Parsed = { verb: args[0] ?? '', kind: undefined, want: undefined, pid: undefined, json: false, words: [] };
  for (let i = 1; i < args.length; i += 1) {
    const word = args[i] ?? '';
    const next = args[i + 1] ?? '';
    if (word === '--json') out.json = true;
    else if (word === '--for') {
      if (!isKind(next)) return `--for takes one of test, build, fuzz, agent, install, other (got "${next}")`;
      out.kind = next;
      i += 1;
    } else if (word === '--want' || word === '--pid') {
      const n = Number(next);
      if (!(n >= 1)) return `${word} takes a number (got "${next}")`;
      if (word === '--want') out.want = n; else out.pid = Math.floor(n);
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

/** The command; `host` is the governor's view of the machine (a test plants it). */
export function main(args: readonly string[], caller: Caller, host: GovernorHost = machineHost(caller.env)): number {
  const p = parse(args);
  if (typeof p === 'string') { console.error(`load: ${p}\n${USAGE}`); return 2; }
  const project = caller.env['CLAUDE_PROJECT_DIR'] || caller.cwd;
  if (p.verb === 'ask') {
    const answer = ask(host, { kind: p.kind, want: p.want, project });
    say(p.json, answer.line, answer);
    return answer.go ? 0 : 1;
  }
  if (p.verb === 'take') {
    const want = p.want ?? (p.words[0] === undefined ? undefined : Number(p.words[0]));
    if (want !== undefined && !(want >= 1)) { console.error(`load: take wants a number of cores (got "${p.words[0] ?? ''}")\n${USAGE}`); return 2; }
    const pid = p.pid ?? (caller.holder ?? sessionAbove)(caller.ppid);
    const r = take(host, { kind: p.kind ?? 'other', want, project, pid });
    if (r.ok) say(p.json, r.grant.line, r.grant); else say(p.json, r.answer.line, r.answer);
    return r.ok ? 0 : 1;
  }
  if (p.verb === 'free' && p.words[0] !== undefined) {
    const id = p.words[0];
    const freed = free(host, id);
    say(p.json, freed ? `freed ${id}` : `no grant ${id} (already freed, or its holder ended)`, { id, freed });
    return freed ? 0 : 1;
  }
  if (p.verb === 'jobs') {
    const state = inFlight(host);
    const rows = state.jobs.map((j) => `${j.id} ${j.kind} ${j.slots} slots pid ${j.pid}${j.pausedAt === null ? '' : ' paused'} ${j.project}`);
    const lines = [...rows, ...state.waiting.map((w) => `${w.id} ${w.kind} waiting for ${w.want} pid ${w.pid} ${w.project}`)];
    say(p.json, lines.length ? lines.join('\n') : 'no jobs', state);
    return 0;
  }
  console.error(USAGE);
  return 2;
}

if (isMain(import.meta.url)) process.exit(main(process.argv.slice(2), { env: process.env, cwd: process.cwd(), ppid: process.ppid }));
