// PreToolUse (Bash): stage files by name, never everything at once, and never secrets.
// `git add -A`, `git add .`, `git add --all` and `git commit -a` sweep build output, renders, scratch files and keys into
// history. Exit 2 refuses the command. `--selftest` proves it.
// On the hook contract (typescript order W4). The sweep law is git-guard's own (`house`, called for the git add and git commit
// parts of the command, in a tree it is told is clean): one law, one copy. What git-guard does not hold stays here: the wider
// sweeps (`add -u`, `add *`, `add :/`, `commit --all`) and the secret and key files.
import { fileURLToPath } from 'node:url';
import { house } from './git-guard.mts';
import { isMain, runAsHook } from './lib/hook-log.mts';
import { bashOf, runHook, scratchProject, snapshot, verdicts, writtenSince } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { Hook } from './lib/types.d.mts';
import { pass, refuse } from './lib/verdict.mts';

const SECRET = /(^|[\s/])(\.env(\.[\w.-]+)?|[\w.-]+\.(pem|key|p12|pfx)|id_(rsa|ed25519)|credentials\.json)(\s|$)/;
const SAFE_ENV = /\.env\.(example|sample|template)(\s|$)/;
const ADD = /^git\s+(?:-C\s+\S+\s+)?add\s+(.*)$/;
const COMMIT = /^git\s+(?:-C\s+\S+\s+)?commit\b/;
const DRY_RUN = /(^|\s)(-n|--dry-run)(\s|$)/;   // a dry run stages nothing (KF-10)

/** The machine as house's laws ask about it, with nothing in it: a clean tree on no branch, so only the sweep law can speak. */
const NOTHING = { dirty: (): string[] => [], branch: (): null => null, hasHead: (): boolean => false };

const segments = (command: string): string[] => command.split(/&&|\|\||;|\n/).map((s) => s.trim());

/** Why the command stages too much or the wrong thing, or null. */
export function problem(command: string): string | null {
  const gitParts = segments(command).filter((seg) => ADD.test(seg) || COMMIT.test(seg));
  const swept = gitParts.length ? house(gitParts.join(' && '), '/', NOTHING, { neverStage: [] }) : null;
  if (swept) return swept;
  for (const seg of gitParts) {
    const args = ADD.exec(seg)?.[1];
    if (args !== undefined && !DRY_RUN.test(args)) {
      if (/(^|\s)(-u|--update)(\s|$)/.test(args) || /(^|\s)(\*|:\/)(\s|$)/.test(args)) return 'stage the files you changed by name (git add path/one path/two), never everything at once';
      if (SECRET.test(` ${args} `) && !SAFE_ENV.test(` ${args} `)) return 'that looks like a secret or key file; it must never be committed';
    }
    if (COMMIT.test(seg) && /(^|\s)--all(\s|$)/.test(seg)) return 'commit -a stages every tracked change; stage by name first, then commit';
  }
  return null;
}

export const hook: Hook = (event, _ctx) => {
  const why = problem(event.tool_input?.command ?? '');
  return why ? refuse(`BLOCKED by stage-guard: ${why}.\nRun \`git status --short\` and add each intended file explicitly.\n`) : pass;
};

/** A sweep is refused in a worktree as in the main checkout, and staging a named file is not. */
export const worktreeCase: WorktreeCase = {
  steps: [
    { label: 'git -C the worktree add -A', event: { tool_name: 'Bash', tool_input: { command: 'git -C {wt} add -A' } }, want: 2 },
    { label: 'git -C the worktree add one file', event: { tool_name: 'Bash', tool_input: { command: 'git -C {wt} add src/dsp/Svf.cpp' } }, want: 0 },
  ],
};

export function selftest(): number {
  const hookFile = fileURLToPath(import.meta.url);
  const dir = scratchProject({ 'a.txt': 'one\n' });
  const before = snapshot(dir);
  const sh = (command: string): number | null => runHook(hookFile, dir, bashOf(command, dir)).status;
  const blocked: readonly [string, boolean][] = [
    ['git add -A', true], ['git add .', true], ['cd x && git add --all', true], ['git commit -am "wip"', true],
    ['git add .env', true], ['git add certs/server.key', true], ['git add -u', true], ['git commit --all -m x', true],
    ['git add src/dsp/Svf.cpp tests/svf_test.cpp', false], ['git add .env.example', false],
    ['git commit -m "fix: svf"', false], ['git status', false],
    ['git add -n .', false], ['git add --dry-run -A', false],   // KF-10: a dry run stages nothing
  ];
  return verdicts('stage-guard', [
    ...blocked.map(([command, block]): [string, boolean, boolean] => [command, problem(command) !== null, block]),
    ['git add -A through the runner is refused (seen)', sh('git add -A'), 2],
    ['git add one named file through the runner passes', sh('git add src/a.cpp'), 0],
    ['a judge writes no file (the write trap)', writtenSince(dir, before).join(','), ''],
  ]);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'stage-guard', hook, selftest);
