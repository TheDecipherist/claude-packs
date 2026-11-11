// git-guard (PreToolUse, Bash; and Stop): the git mistakes that cost days, refused before the command runs. Exit 2 refuses.
//
// ALWAYS (Sub37 WB-3): a token never lands in git config. `git push -u <url-with-token>` records that URL as the
// branch's upstream, and `remote add/set-url`, `clone`, `submodule` and `config` store it as a remote; the token then
// sits in .git/config in plain text. Pushing to a token URL WITHOUT -u stores nothing and is allowed.
//
// THE HOUSE LAWS: a new install has them (KF-8). A project installed before 1.1.0 switches them on itself, with .claude/layout.json
// "enable": ["guards/git-house"] or "guards": { "git": { "house": true } }; one whose history is on main moves to the branch flow first:
//   1. No `git add -A`, `add .`, `add --all`, `commit -a`. Stage by path.
//   2. No checkout / restore / stash / reset --hard / clean over uncommitted work; no override lets one through.
//      `git restore --staged` (unstage only) passes. The project's safe form, if any, is named (guards.git.safeRestore).
//   3. A push names https://...github.com/<owner>/<repo>.git with the token variable, and never forces.
//   4. Every `gh` names the token (GH_TOKEN=$<tokenVar>); a repo is created as <owner>/<name> --private.
//   5. A token is never written into a remote URL or a config file, and never pasted literally.
//   6. Nothing under a never-staged folder (~/firmware) is staged.
//   7. No branch is deleted; nothing is rebased or amended; no hook is skipped (--no-verify).
//   8. With guards.git.refuseTrunk true: no commit straight onto a trunk (main, master); guards.git.branchStart says how.
//   9. No commit while the branch's earlier commits are not on GitHub (a new branch's first commit passes; a push earlier
//      in the same command counts), and at Stop no local branch ahead of GitHub or missing there (KWB-26; lib/pushed.mts:
//      GitHub's heads looked up at most once a minute, out of reach means a warning, never a refusal). With
//      guards.git.pushNeedsYes every push is the owner's: neither half refuses, and Stop tells, once a session, the
//      branches holding commits no GitHub branch has (KWB-157).
//  10. At Stop, no landing leaves the main checkout's trunk behind the remote's (KWB-96, lib/trunk-lag.mts): refused while the
//      main checkout holds the trunk with nothing uncommitted; with uncommitted work or another branch there, the user is told.
// Only a real git or gh call is judged: heredoc bodies and quoted text are blanked, and a part counts only when its
// first word (after VAR=value) is git or gh. `cd` and `git -C` move the folder the dirty-tree and trunk checks look at.
// The laws hold in every repo a command reaches. `--selftest` proves both halves.
// On the hook contract (typescript order W4): `hook(event, ctx)` returns its Verdict. `problem` (the token law) and `house`
// (the house laws) are exported for the selftest and for stage-guard, which calls the same law. Its state is kept out of the
// project: GitHub's last look in the git dir, a session's Stop memory in the caller's TMPDIR (lib/remote-heads.mts, stop-verdict.mts).
import { homedir } from 'node:os';
import { normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bareWords } from './lib/command-prefix.mts';
import { NEW_INSTALL_GIT, ghLaw, loggedInAs, pushLaw } from './lib/git-auth.mts';
import type { HouseEnv } from './lib/git-guard-selftest.mts';
import { gitLines, gitOut, gitRun } from './lib/git-run.mts';
import { escapeRegExp } from './lib/glob.mts';
import { isMain, runAsHook } from './lib/hook-log.mts';
import { forRepo, ownerPushes, stopVerdict, unpushed, unpushedMessage } from './lib/pushed.mts';
import { failed } from './lib/remote-heads.mts';
import { blankQuotes, dropHeredocs } from './lib/shell-lex.mts';
import type { GitEnv, GitGuards } from './lib/remote-heads.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import { trunkLag } from './lib/trunk-lag.mts';
import type { Hook } from './lib/types.d.mts';
import { pass, refuse } from './lib/verdict.mts';

// ---------- always: a token never stored ----------
const URL_USER = /\b[a-z][\w+.-]*:\/\/([^\s/@\x27\x22]+)@/gi;   // \x27 and \x22 are the two quote marks
const SECRET_USER = /:|\$|^(gh[pousr]_|github_pat_|glpat-|x-access-token|oauth2)/i;

export const tokenUrls = (text: string): string[] => [...text.matchAll(URL_USER)].filter((m) => SECRET_USER.test(m[1] ?? '')).map((m) => m[0]);
export const mask = (url: string): string => url.replace(/:\/\/[^@]+@/, '://***@');

// Each git subcommand that would store a token URL in git config, and what it stores (null: this form stores nothing).
const STORES_TOKEN: Readonly<Record<string, (args: string, where: string) => string | null>> = {
  push: (args, where) => (/(^|\s)(--set-upstream|-[a-zA-Z]*u[a-zA-Z]*)(\s|$)/.test(args) ? `push -u with ${where} would write the token into .git/config as the branch's upstream` : null),
  remote: (args, where) => (/^\s*(add|set-url)\b/.test(args) ? `remote ${args.trim().split(/\s+/)[0]} would store ${where} in .git/config` : null),
  clone: (_args, where) => `clone would store ${where} as origin in the new repo's .git/config`,
  submodule: (_args, where) => `submodule would store ${where} in .gitmodules and .git/config`,
  config: (_args, where) => `config would store ${where} in git config`,
};

export function problem(command: string): string | null {
  for (const raw of command.split(/&&|\|\||;|\||\n/)) {
    const m = bareWords(raw.trim().split(/\s+/)).join(' ').match(/^git((?:\s+(?:-C|-c)\s+\S+)*)\s+([\w-]+)(.*)$/);
    if (!m) continue;
    const sub = m[2] ?? '';
    const args = m[3] ?? '';
    const urls = tokenUrls(args);
    const first = urls[0];
    if (first === undefined) continue;
    const stored = Object.hasOwn(STORES_TOKEN, sub) ? STORES_TOKEN[sub]?.(args, mask(first)) : null;
    if (stored) return stored;
  }
  return null;
}

// ---------- the house laws ----------
/** guards.git as the house laws read it. */
export interface HouseCfg extends GitGuards { neverStage?: readonly string[] }

export const DEFAULTS: HouseCfg = {
  house: false,
  tokenVar: 'PERSONAL_GITHUB_TOKEN',
  ghAuth: 'token',       // 'cli': gh is logged in on this machine, so no call names a token
  trunkNeedsYes: false,  // true: only the owner pushes the trunk, so neither a commit nor the session's end waits for it
  pushNeedsYes: false,   // true: only the owner pushes, any branch: no commit or session end waits; Stop tells what GitHub lacks (KWB-157)
  trunks: ['main', 'master'],
  refuseTrunk: false,
  neverStage: ['~/firmware'],
  branchStart: 'git switch -c work/<name>',
  accountNote: '',
};                       // guards.git.owner unset: a push or a new repo is not held to one; safeRestore unset: no safe form is named

const at = (cwd: string, env: GitEnv): { cwd: string; env: NonNullable<GitEnv>; timeoutMs: number } => ({ cwd, env, timeoutMs: 10_000 });

/** What the house laws ask of the machine, answered by git and gh in the caller's environment. */
function realEnv(env: NonNullable<GitEnv>): HouseEnv {
  return {
    vars: env,
    login: () => loggedInAs(env),
    dirty: (cwd) => gitLines(['--no-optional-locks', 'status', '--porcelain'], at(cwd, env)).filter((l) => l.trim()),
    branch: (cwd) => gitOut(['rev-parse', '--abbrev-ref', 'HEAD'], at(cwd, env)) ?? '',
    hasHead: (cwd) => gitRun(['rev-parse', '-q', '--verify', 'HEAD'], at(cwd, env)).ok,
    remoteUrl: (cwd, name) => gitOut(['remote', 'get-url', name], at(cwd, env)) || null,
    merging: (cwd) => gitRun(['rev-parse', '-q', '--verify', 'MERGE_HEAD'], at(cwd, env)).ok,
  };
}

// What a push sends to: the URL in the command, or the URL of the remote it names (null when neither is known).
function pushTarget(w: readonly string[], here: string, env: HouseEnv): string | null {
  const a = w.slice(w.indexOf('push') + 1).filter((x) => !x.startsWith('-'));
  const first = a[0];
  if (first === undefined) return null;
  return /[:/]/.test(first) ? first : env.remoteUrl?.(here, first) ?? null;
}

// git's subcommand: the first word after git that is not an option (-C <dir> and -c <key=value> take one more)
function subOf(w: readonly string[]): string | undefined {
  let i = 1;
  while (i < w.length && (w[i] ?? '').startsWith('-')) i += ['-C', '-c', '--git-dir', '--work-tree'].includes(w[i] ?? '') ? 2 : 1;
  return w[i];
}

const neverRx = (entry: string): RegExp => (entry.startsWith('~/')
  ? new RegExp(`(~|\\$HOME|/Users/[^/\\s]+|/home/[^/\\s]+)/${escapeRegExp(entry.slice(2))}`)
  : new RegExp(escapeRegExp(entry.replace(/^\/+/, ''))));
const expand = (p: string): string => p.replace(/^\$HOME(?=\/|$)/, '~').replace(/^~(?=\/|$)/, homedir());
const baseName = (word: string | undefined): string => (word ?? '').split('/').pop() ?? '';

const STAGE_ALL = 'Stage by explicit path: `git add <paths>` and `git commit -- <paths>`. `add -A`, `add .` and `commit -a` sweep in other work.';
const NO_VERIFY = 'Never --no-verify (or -n): the pre-commit hook is the gate. When it refuses, fix what it names; if a commit must hold something that fails the gates (a planted fault for a test), do not commit it: work on an uncommitted copy.';

/** A checkout, restore, stash, clean or reset over uncommitted work: the refusal's text, or null. */
function undoRefusal(p: string, here: string, env: HouseEnv, c: HouseCfg): string | null {
  const undo = p.match(/\bgit\b\s+(?:-C\s+\S+\s+)?(checkout|restore|stash|clean|reset)\b(.*)/);
  if (!undo) return null;
  const verb = undo[1] ?? '';
  const rest = undo[2] ?? '';
  const harmless = (verb === 'stash' && /\b(list|show|pop|apply)\b/.test(rest)) ||
    (verb === 'restore' && /\s--staged\b/.test(rest) && !/\s(--worktree|-W)\b/.test(rest)) ||
    (verb === 'reset' && !rest.includes('--hard')) || (verb === 'checkout' && /\s-b\b/.test(rest)) ||
    (verb === 'clean' && /\s-[a-zA-Z]*n/.test(rest)) ||
    (verb === 'checkout' && /\s--(?:theirs|ours)\b/.test(rest) && env.merging?.(here)); // KF-21: a conflict resolved, not an undo
  if (harmless) return null;
  // an untracked file is touched only by clean: checkout, restore, stash and reset --hard leave it, and git itself refuses a
  // checkout that would overwrite one (KWB-147: a worktree's node_modules link, the status line's state file)
  const d = env.dirty(here).filter((l) => verb === 'clean' || !l.startsWith('??'));
  if (!d.length) return null;
  const safe = c.safeRestore
    ? `Commit it, or use the safe form: ${c.safeRestore} (git status, every dirty file copied aside and checked, then only those paths restored).`
    : 'Commit it first (a work-in-progress commit on a branch), then undo what you meant to.';
  return `\`git ${verb}\` on a tree with uncommitted work. Two days of work were lost this way. Uncommitted now:\n    ${d.slice(0, 12).join('\n    ')}\n${safe} No override exists.`;
}

export function house(cmd: string, cwd: string, env: HouseEnv, cfg: HouseCfg = {}): string | null {
  const c: HouseCfg = { ...DEFAULTS, ...cfg };
  const owner = c.owner;
  const tok = c.tokenVar ?? 'PERSONAL_GITHUB_TOKEN';
  const body = blankQuotes(dropHeredocs(cmd));
  let here = cwd;
  let pushedBefore = false;
  for (const part of body.split(/&&|\|\||;|\||\n|\(|\)|\x60|\$\(/)) {
    let w = part.trim().split(/\s+/).filter(Boolean);
    if (w.length >= 2 && w[0] === 'cd' && w[1] !== "''") { here = normalize(resolve(here, expand(w[1] ?? ''))); continue; }
    if (w.length >= 3 && baseName(w[0]) === 'git' && w[1] === '-C' && w[2] !== "''") here = normalize(resolve(here, expand(w[2] ?? '')));
    while (w.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0] ?? '') || ['env', 'command', 'time', 'nohup', 'exec'].includes(w[0] ?? ''))) w = w.slice(1);
    if (!w.length || !['git', 'gh'].includes(baseName(w[0]))) continue;
    const p = w.join(' ');
    const sub = baseName(w[0]) === 'git' ? subOf(w) : undefined; // the subcommand, never a word in an argument: `git rev-parse x^{commit}` commits nothing
    const dryRun = sub === 'add' && /\s(-n|--dry-run)(\s|$)/.test(p); // KF-10: it stages nothing
    if ((sub === 'add' && !dryRun && /(\s-A\b|\s--all\b|\s\.(\s|$))/.test(p)) || (sub === 'commit' && /\s-[a-zA-Z]*a[a-zA-Z]*\b(?!\S)/.test(p) && !p.includes('--amend'))) return STAGE_ALL;
    for (const never of c.neverStage ?? []) if (sub === 'add' && neverRx(never).test(p)) return `Nothing under ${never} is ever committed.`;
    const undone = undoRefusal(p, here, env, c);
    if (undone) return undone;
    if (/\bgit\b.*\bbranch\b.*\s(-D|-d|--delete)\b/.test(p) || /\bgit\b.*\bpush\b.*(\s--delete\b|\s:[\w/.-]+)/.test(p)) {
      return 'A branch is never deleted. Branches are the record of the build; they stay, here and on GitHub.';
    }
    if (['rebase', 'filter-branch'].includes(sub ?? '') || (sub === 'commit' && p.includes('--amend'))) return 'Nothing is rebased or amended. Make a new commit.';
    if (['commit', 'push', 'merge', 'am'].includes(sub ?? '') && /\s(--no-verify|-n)(\s|$)/.test(p)) return NO_VERIFY;
    if (c.refuseTrunk && sub === 'commit' && (c.trunks ?? []).includes(env.branch(here) ?? '') && env.hasHead(here)) {
      return `This is the trunk. Every task is built on its own branch and merged when complete: ${c.branchStart}.`;
    }
    // WB-107: an agent's isolated worktree cannot push (its harness refuses), so the lead pushes its branch; Stop still holds it
    if (!pushedBefore && env.unpushed && sub === 'commit' && !/\/\.claude\/worktrees\/agent-[^/]+(\/|$)/.test(here) && !ownerPushes(c, env.branch(here))) {
      const u = env.unpushed(here, c);
      if (failed(u)) env.warn?.(`git-guard: GitHub was not checked before this commit (${u.error}); the commit goes ahead unchecked. Push when it is back (KWB-26).`);
      else if (u?.commits.length) return unpushedMessage(u, c);
    }
    if (/\bgit\b.*\bpush\b/.test(p)) {
      if (/\s(-f|--force|--force-with-lease)\b/.test(p)) return 'Never force a push. Nothing pushed is rebased or amended.';
      const refused = pushLaw(p, pushTarget(w, here, env), c);
      if (refused) return refused;
      pushedBefore = true;
    }
    const ghRefused = ghLaw(cmd, p, c, env.vars ?? {}, env.login);   // env.login: gh's own account, asked only when a gh call is refused
    if (ghRefused) return ghRefused;
    if (/\bgh\s+repo\s+create\b/.test(p) && ((owner && !p.includes(`${owner}/`)) || !p.includes('--private'))) return `A repo is created as ${owner}/<name> --private.`;
    if (/\bgit\b.*\b(remote\s+(add|set-url)|config)\b/.test(p) && new RegExp(`x-access-token|ghp_|github_pat_|${escapeRegExp(tok)}`).test(p)) {
      return 'The token is never stored in a remote URL or a config file. Name it on the push only.';
    }
  }
  if (/\b(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/.test(cmd)) return `A literal GitHub token is in this command. Use $${tok} from ~/.env.`;
  return null;
}

const TOKEN_HELP = 'A token is used, never stored. Push with a one-shot credential helper that reads it from the environment:\n' +
  "  git -c credential.helper='!f() { echo username=x-access-token; echo password=$TOKEN; }; f' push -u origin <branch>\n" +
  'or push to the token URL without -u, then set the upstream by name:\n' +
  '  git config branch.<branch>.remote origin && git config branch.<branch>.merge refs/heads/<branch>\n';

/** guards.git from the layout, as an object, whatever else the layout holds under it. */
function gitGuards(guards: Readonly<Record<string, unknown>> | undefined): GitGuards {
  const git = guards?.['git'];
  return git !== null && typeof git === 'object' && !Array.isArray(git) ? git as GitGuards : {};
}

export const hook: Hook = (event, ctx) => {
  const command = event.tool_input?.command ?? '';
  // the project's laws: its own layout (KF-8: an existing project opts in)
  const cfg: HouseCfg = { ...DEFAULTS, ...(ctx.layout.enable?.includes('guards/git-house') ? NEW_INSTALL_GIT : {}), ...gitGuards(ctx.layout.guards) };
  if (event.hook_event_name === 'Stop') {
    if (!cfg.house) return pass;
    const v = stopVerdict(ctx.projectDir, ctx.env, cfg, event.session_id, { lag: trunkLag });   // KWB-96: and the main checkout's trunk
    return { code: v.code, stdout: v.stdout ?? '', stderr: v.stderr ?? '' };
  }
  const why = problem(command);
  if (why) return refuse(`BLOCKED by git-guard: ${why}.\n${TOKEN_HELP}`);
  if (!cfg.house || !/git|gh |ghp_|github_pat_/.test(command)) return pass;
  const warnings: string[] = [];
  const real = realEnv(ctx.env);
  const env: HouseEnv = {
    ...real,
    unpushed: (cwd, c) => unpushed(cwd, ctx.env, real.branch(cwd), forRepo(cwd, ctx.env, ctx.projectDir, c)),
    warn: (m) => warnings.push(m),
  };
  const reason = house(command, event.cwd ?? ctx.cwd, env, cfg);
  const stdout = warnings.length ? JSON.stringify({ systemMessage: warnings.join('\n') }) : '';
  return reason ? { ...refuse(`git-guard: ${reason}\n`), stdout } : { ...pass, stdout };
};

const TOKEN_URL = 'https://x-access-token:abc@github.com/a/b.git';

/** A command that stores a token is refused whichever checkout `-C` names; a plain push is not. */
export const worktreeCase: WorktreeCase = {
  steps: [
    { label: 'push -u with a token URL, git -C the worktree', event: { tool_name: 'Bash', tool_input: { command: `git -C {wt} push -u ${TOKEN_URL} work/x` } }, want: 2 },
    { label: 'push -u to a named remote, git -C the worktree', event: { tool_name: 'Bash', tool_input: { command: 'git -C {wt} push -u origin work/x' } }, want: 0 },
  ],
};

export async function selftest(): Promise<number> {
  const { selftest: run } = await import('./lib/git-guard-selftest.mts');
  return run(fileURLToPath(import.meta.url), { problem, house });
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'git-guard', hook, selftest);
