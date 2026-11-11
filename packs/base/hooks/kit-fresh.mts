// kit-fresh (SessionStart; PreToolUse Bash on a commit in the kit's own repo; run.sh before every session; KWB-156): a session never
// starts work on an outdated kit. One session started on a kit clone at 1.5.13 while the work was at 1.9.0, and nothing said so.
//   In a project: the installed kit (.claude/claude-packs.lock.json "kit") against npm's newest (`npm view`, asked at most once a
//   day, the answer kept in the user's cache folder). Older is said, with the update command. With nobody there
//   (CLAUDE_PACKS_UNATTENDED), the session does not start: `--check` exits 2 and run.sh stops before the session.
//   In the kit's own repo: `git fetch`, then the checkout against origin/main and every origin/work/<version>-* newer than its own
//   version. Newer work is named at SessionStart, and a commit here is refused until it is switched to or merged.
//   Offline or not reachable: what could not be checked is said, and nothing is blocked.
//   node kit-fresh.mjs              the hook (the event on stdin)
//   node kit-fresh.mjs --check      for run.sh: says what is outdated, exits 2 when the session must not start
//   node kit-fresh.mjs --selftest
// A judge on the hook contract (W4): it writes no file of the project. Its notice at SessionStart is `say`; its look is kept in
// two places outside the project, npm's answer for a day (the user's cache folder) and the fetch of origin (.git).
import { join } from 'node:path';
import { contextOf, isMain, runAsHook, writeVerdict } from './lib/hook-log.mts';
import { atCommit, atStart } from './lib/kit-fresh-look.mts';
import { selftest as selftestOf } from './lib/kit-fresh-selftest.mts';
import { claudeRoot } from './lib/project.mts';
import type { Hook, HookContext, Verdict } from './lib/types.d.mts';
import { pass, refuse, say } from './lib/verdict.mts';

/** the checkout a session or a command in `cwd` works in: a worktree's own, never the main checkout's */
const rootOf = (cwd: string, ctx: Pick<HookContext, 'projectDir' | 'cwd'>): string => claudeRoot(ctx.projectDir, join(cwd, 'x'), ctx.cwd);

/** What a session's start says: a notice on stdout, or a refusal when nobody is there and the kit is outdated. */
function startVerdict(ctx: HookContext, cwd: string): Verdict {
  const v = atStart(rootOf(cwd, ctx), { env: ctx.env, now: ctx.now });
  if (!v) return pass;
  return v.block ? refuse(v.say) : say(`${v.say}\n`);
}

export const hook: Hook = (event, ctx) => {
  const cwd = event.cwd ?? ctx.cwd;
  if (event.hook_event_name === 'SessionStart') return startVerdict(ctx, cwd);
  if (event.hook_event_name === 'PreToolUse' && event.tool_name === 'Bash') {
    const refusal = atCommit(rootOf(cwd, ctx), event.tool_input?.command, { env: ctx.env });
    if (refusal) return refuse(refusal);
  }
  return pass;
};

/** `--check`, for run.sh: the start's verdict from this process, its words written, its code the exit code. */
function check(): number {
  const ctx = contextOf();
  const verdict = startVerdict(ctx, ctx.cwd);
  writeVerdict(verdict);
  return verdict.code;
}

export const selftest = (): number => selftestOf();

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'kit-fresh', hook, selftest, { flags: { '--check': check } });
