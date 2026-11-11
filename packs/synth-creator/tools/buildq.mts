#!/usr/bin/env node
// buildq: the machine-wide build queue that build-guard sends every heavy job to (KF-1: the hook named a tool no pack shipped). Two jobs at a time, across every
// project on the machine; a job waits for a slot by itself. A slot is a folder made atomically, holding its owner's pid; a dead owner's slot is taken back.
// The exit status is the command's own, so `node .claude/tools/buildq.mjs ninja && next` means what it says. A status read after a pipe or an echo is theirs, not the build's (KF-37).
//   node .claude/tools/buildq.mjs <command> [args...]    run it in the next free slot
//   node .claude/tools/buildq.mjs --status               how many slots are taken
// BUILDQ_DIR: where the slots live (default: the machine's temp folder). BUILDQ_SLOTS: how many (default 2).
// KWB-111: every job takes its share of one core budget (BUILDQ_CORES, layout guards.buildq.cores, or a third of the
// machine): its -j or --jobs is cut to it and CMake, CTest and make are told it; it runs at a low priority (BUILDQ_PRIORITY=normal: not).
// Typed (typescript order W4): the environment, the folder, the pid and the platform are passed to `main`, never read by it.
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildSlots, isLive, ownerOf, slotAt } from '../hooks/lib/build-slots.mts';
import type { BuildSlots } from '../hooks/lib/build-slots.mts';
import { budgetEnv, capJobs, coreBudget, gentle, projectLayout, shareOf } from '../hooks/lib/core-budget.mts';
import type { Env } from '../hooks/lib/core-budget.mts';
import { isMain } from '../hooks/lib/hook-log.mts';

const WAIT_MS = 500;
const nap = (ms: number): void => { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); };

/** The slots that are taken (a live owner holds each). */
const taken = ({ dir, slots }: BuildSlots): number => Array.from({ length: slots }, (_, n) => slotAt(dir, n)).filter(isLive).length;

/** Takes the first free slot for `pid` (a dead owner's is taken back), or null when every one is held. */
function claim({ dir, slots }: BuildSlots, pid: number): string | null {
  mkdirSync(dir, { recursive: true });
  for (let n = 0; n < slots; n += 1) {
    const slot = slotAt(dir, n);
    try {
      mkdirSync(slot);
      writeFileSync(join(slot, 'pid'), `${pid}\n`);
      return slot;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
      if (ownerOf(slot) !== null && !isLive(slot)) rmSync(slot, { recursive: true, force: true });
    }
  }
  return null;
}

/** What `--status` prints. */
export const statusText = (queue: BuildSlots): string => `${taken(queue)} of ${queue.slots} slots taken`;

/** Where the job runs and with what: the caller's environment, folder, pid and platform. */
export interface Where { env: Env; cwd: string; pid: number; platform: string }

/** Runs `asked` in the next free slot, with its share of the core budget at a low priority; the command's own exit status. */
export function run(asked: readonly string[], { env, cwd, pid, platform }: Where): number {
  const queue = buildSlots(env);
  let slot = claim(queue, pid);
  for (; slot === null; slot = claim(queue, pid)) nap(WAIT_MS);
  try {
    // KWB-111: the job takes its share of the machine's core budget, at a low priority; KWB-150: by the jobs running as it
    // starts, its own counted, so a build alone takes the whole budget
    const most = shareOf(coreBudget(env, projectLayout(env['CLAUDE_PROJECT_DIR'] ?? cwd)), queue.slots, taken(queue));
    const command = gentle(capJobs(asked, most), { platform, env });
    const [program = '', ...rest] = command;
    const r = spawnSync(program, rest, { stdio: 'inherit', env: budgetEnv(env, most) });
    if (r.error) console.error(`buildq: ${program}: ${r.error.message}`);
    return r.status ?? 1;
  } finally {
    rmSync(slot, { recursive: true, force: true });
  }
}

/** The tool: `--status`, a usage line (exit 2), or the job. */
export function main(args: readonly string[], where: Where): number {
  if (args[0] === '--status') {
    console.log(statusText(buildSlots(where.env)));
    return 0;
  }
  if (!args.length) {
    console.error('usage: node .claude/tools/buildq.mjs <command> [args...] | --status');
    return 2;
  }
  return run(args, where);
}

if (isMain(import.meta.url)) process.exit(main(process.argv.slice(2), { env: process.env, cwd: process.cwd(), pid: process.pid, platform: process.platform }));
