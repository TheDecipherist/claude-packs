#!/usr/bin/env node
// buildq: the machine-wide build queue that build-guard sends every heavy job to (KF-1: the hook named a tool no pack shipped). Its cores come from the
// load governor, across every project on the machine; a job waits for them by itself, and a dead job's are taken back.
// The exit status is the command's own, so `node .claude/tools/buildq.mjs ninja && next` means what it says. A status read after a pipe or an echo is theirs, not the build's (KF-37).
//   node .claude/tools/buildq.mjs <command> [args...]    run it once the governor grants it cores
//   node .claude/tools/buildq.mjs --status               how many of the governor's slots are taken
// W8.8 item 2: the slots are the load governor's (packs/base/hooks/lib/governor.mts), shared with every governed job on the machine;
// BUILDQ_DIR and BUILDQ_SLOTS, the old slot folders, are retired. A job waits in the governor's queue while it says wait.
// KWB-111: every job takes its share of one core budget (BUILDQ_CORES, layout guards.buildq.cores, or a third of the
// machine): its -j or --jobs is cut to it and CMake, CTest and make are told it; it runs at a low priority (BUILDQ_PRIORITY=normal: not).
// Typed (typescript order W4): the environment, the folder, the pid and the platform are passed to `main`, never read by it.
import { spawnSync } from 'node:child_process';
import { capJobs, coreBudget, gentle, projectLayout } from '../hooks/lib/core-budget.mts';
import type { Env } from '../hooks/lib/core-budget.mts';
import { budgetOf, free, inFlight, machineHost, queueUp, take } from '../hooks/lib/governor.mts';
import type { GovernorHost, Request, TakeResult } from '../hooks/lib/governor.mts';
import { napSync } from '../hooks/lib/governor-store.mts';
import { isMain } from '../hooks/lib/hook-log.mts';

const WAIT_MS = 500;

/** What `--status` prints: the governor's slots in use of its budget (every governed job, builds and the rest). */
export function statusText(host: GovernorHost, project: string): string {
  const used = inFlight(host).jobs.reduce((sum, j) => sum + j.slots, 0);
  return `${used} of ${budgetOf(host, project).slots} slots taken`;
}

/** Where the job runs and with what: the caller's environment, folder, pid and platform. */
export interface Where { env: Env; cwd: string; pid: number; platform: string }

/** Takes a grant for the build, waiting in the governor's queue (first in, first served) while it says wait. */
function grantFor(host: GovernorHost, request: Request & { pid: number; command: string }): Extract<TakeResult, { ok: true }> {
  let ticket: string | null = null;
  for (let r = take(host, request); ; r = take(host, { ...request, ticket })) {
    if (r.ok) return r;
    ticket ??= queueUp(host, request);
    napSync(WAIT_MS);
  }
}

/** Runs `asked` once the governor grants it cores (up to the job's own budget), at a low priority; the command's own exit status. */
export function run(asked: readonly string[], { env, cwd, pid, platform }: Where, host: GovernorHost = machineHost(env)): number {
  const project = env['CLAUDE_PROJECT_DIR'] ?? cwd;
  // W8.8 item 2: the governor owns the slots (BUILDQ_DIR's slot folders are retired); KWB-111's core budget stays the most one build
  // may ask for, and KWB-150 holds: a build alone takes all of it, a build beside others takes what is free (at least 1 core)
  // W8.8 0b: the build runs at its agent's priority (CLAUDE_PACKS_PRIORITY, set from the brief), the governor's default without one
  const priority = env['CLAUDE_PACKS_PRIORITY'] ? Number(env['CLAUDE_PACKS_PRIORITY']) : undefined;
  const { grant } = grantFor(host, { kind: 'build', upTo: coreBudget(env, projectLayout(project)), priority, pid, project, command: asked.join(' ') });
  try {
    const command = gentle(capJobs(asked, grant.slots), { platform, env });
    const [program = '', ...rest] = command;
    const r = spawnSync(program, rest, { stdio: 'inherit', env: { ...env, ...grant.settings.env } });
    if (r.error) console.error(`buildq: ${program}: ${r.error.message}`);
    return r.status ?? 1;
  } finally {
    free(host, grant.id);
  }
}

/** The tool: `--status`, a usage line (exit 2), or the job. */
export function main(args: readonly string[], where: Where): number {
  if (args[0] === '--status') {
    console.log(statusText(machineHost(where.env), where.env['CLAUDE_PROJECT_DIR'] ?? where.cwd));
    return 0;
  }
  if (!args.length) {
    console.error('usage: node .claude/tools/buildq.mjs <command> [args...] | --status');
    return 2;
  }
  return run(args, where);
}

if (isMain(import.meta.url)) process.exit(main(process.argv.slice(2), { env: process.env, cwd: process.cwd(), pid: process.pid, platform: process.platform }));
