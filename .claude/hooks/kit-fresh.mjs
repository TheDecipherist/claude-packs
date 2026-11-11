#!/usr/bin/env node
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
import { join } from 'node:path';
import { asHook, isMain } from './lib/hook-log.mjs';
import { parseJson } from './lib/json.mjs';
import { atCommit, atStart } from './lib/kit-fresh-look.mjs';
import { claudeRoot } from './lib/project.mjs';

/** the checkout a session or a command in `cwd` works in: a worktree's own, never the main checkout's */
const rootOf = (cwd) => claudeRoot(join(cwd, 'x'));

function main(text) {
  const ev = parseJson(text);
  if (!ev) return 0;   // not a refusal: nothing to judge
  const root = rootOf(ev.cwd ?? process.cwd());
  if (ev.hook_event_name === 'SessionStart') {
    const v = atStart(root);
    if (!v) return 0;
    if (v.block) { console.error(v.say); return 2; }
    console.log(v.say);
    return 0;
  }
  if (ev.hook_event_name === 'PreToolUse' && ev.tool_name === 'Bash') {
    const refusal = atCommit(root, ev.tool_input?.command);
    if (refusal) { console.error(refusal); return 2; }
  }
  return 0;
}

function check() {
  const v = atStart(rootOf(process.cwd()));
  if (!v) return 0;
  (v.block ? console.error : console.log)(v.say);
  return v.block ? 2 : 0;
}

export const hook = main;
if (isMain(import.meta.url)) {
  const { selftest } = process.argv.includes('--selftest') ? await import('./lib/kit-fresh-selftest.mjs') : {};
  process.exit(selftest ? selftest() : process.argv.includes('--check') ? check() : await asHook('kit-fresh', main));
}
