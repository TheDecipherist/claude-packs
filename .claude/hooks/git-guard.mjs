#!/usr/bin/env node
// git-guard (PreToolUse, Bash): the git mistakes that cost days, refused before the command runs. Exit 2 refuses.
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
//      in the same command counts), and at Stop no local branch ahead of GitHub or missing there (KWB-26; lib/pushed.mjs:
//      GitHub's heads looked up at most once a minute, out of reach means a warning, never a refusal). With
//      guards.git.pushNeedsYes every push is the owner's: neither half refuses, and Stop tells, once a session, the
//      branches holding commits no GitHub branch has (KWB-157).
//  10. At Stop, no landing leaves the main checkout's trunk behind the remote's (KWB-96, lib/trunk-lag.mjs): refused while the
//      main checkout holds the trunk with nothing uncommitted; with uncommitted work or another branch there, the user is told.
// Only a real git or gh call is judged: heredoc bodies and quoted text are blanked, and a part counts only when its
// first word (after VAR=value) is git or gh. `cd` and `git -C` move the folder the dirty-tree and trunk checks look at.
// The laws hold in every repo a command reaches. `--selftest` proves both halves.
import { homedir } from 'node:os';
import { join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bareWords } from './lib/command-prefix.mjs';
import { readLayout } from './lib/layout.mjs';
import { claudeRoot } from './lib/project.mjs';
import { asHook, isMain, projectRoot } from './lib/hook-log.mjs';
import { NEW_INSTALL_GIT, ghLaw, loggedInAs, pushLaw } from './lib/git-auth.mjs';
import { forRepo, ownerPushes, stopVerdict, unpushed, unpushedMessage } from './lib/pushed.mjs';
import { trunkLag } from './lib/trunk-lag.mjs';
import { gitLines, gitOut, gitRun } from './lib/git-run.mjs';


// ---------- always: a token never stored ----------
const URL_USER = /\b[a-z][\w+.-]*:\/\/([^\s/@'"]+)@/gi;
const SECRET_USER = /:|\$|^(gh[pousr]_|github_pat_|glpat-|x-access-token|oauth2)/i;

export const tokenUrls = (text) => [...text.matchAll(URL_USER)].filter((m) => SECRET_USER.test(m[1])).map((m) => m[0]);
export const mask = (url) => url.replace(/:\/\/[^@]+@/, '://***@');

export function problem(command) {
  for (const raw of command.split(/&&|\|\||;|\||\n/)) {
    const m = bareWords(raw.trim().split(/\s+/)).join(' ').match(/^git((?:\s+(?:-C|-c)\s+\S+)*)\s+([\w-]+)(.*)$/);
    if (!m) continue;
    const [, , sub, args] = m;
    const urls = tokenUrls(args);
    if (!urls.length) continue;
    const where = mask(urls[0]);
    const stored = Object.hasOwn(STORES_TOKEN, sub) ? STORES_TOKEN[sub](args, where) : null;
    if (stored) return stored;
  }
  return null;
}

// Each git subcommand that would store a token URL in git config, and what it stores (null: this form stores nothing).
const STORES_TOKEN = {
  push: (args, where) => (/(^|\s)(--set-upstream|-[a-zA-Z]*u[a-zA-Z]*)(\s|$)/.test(args) ? `push -u with ${where} would write the token into .git/config as the branch's upstream` : null),
  remote: (args, where) => (/^\s*(add|set-url)\b/.test(args) ? `remote ${args.trim().split(/\s+/)[0]} would store ${where} in .git/config` : null),
  clone: (_args, where) => `clone would store ${where} as origin in the new repo's .git/config`,
  submodule: (_args, where) => `submodule would store ${where} in .gitmodules and .git/config`,
  config: (_args, where) => `config would store ${where} in git config`,
};

// ---------- the house laws ----------
export const DEFAULTS = {
  house: false,
  owner: null,           // guards.git.owner: this project's GitHub owner. Unset, a push or a new repo is not held to one
  tokenVar: 'PERSONAL_GITHUB_TOKEN',
  ghAuth: 'token',       // 'cli': gh is logged in on this machine, so no call names a token
  trunkNeedsYes: false,  // true: only the owner pushes the trunk, so neither a commit nor the session's end waits for it
  pushNeedsYes: false,   // true: only the owner pushes, any branch: no commit or session end waits; Stop tells what GitHub lacks (KWB-157)
  trunks: ['main', 'master'],
  refuseTrunk: false,
  neverStage: ['~/firmware'],
  safeRestore: null,
  branchStart: 'git switch -c work/<name>',
  accountNote: '',
};

const at = (cwd) => ({ cwd, env: process.env, timeoutMs: 10_000 });   // W4 passes the event's ctx.env
const real = {
  login: () => loggedInAs(process.env),   // W4 passes the event's ctx.env
  dirty: (cwd) => gitLines(['--no-optional-locks', 'status', '--porcelain'], at(cwd)).filter((l) => l.trim()),
  branch: (cwd) => gitOut(['rev-parse', '--abbrev-ref', 'HEAD'], at(cwd)) ?? '',
  hasHead: (cwd) => gitRun(['rev-parse', '-q', '--verify', 'HEAD'], at(cwd)).ok,
  remoteUrl: (cwd, name) => gitOut(['remote', 'get-url', name], at(cwd)) || null,
  merging: (cwd) => gitRun(['rev-parse', '-q', '--verify', 'MERGE_HEAD'], at(cwd)).ok,
};
// What a push sends to: the URL in the command, or the URL of the remote it names (null when neither is known).
const pushTarget = (w, here, env) => { const a = w.slice(w.indexOf('push') + 1).filter((x) => !x.startsWith('-')); return !a.length ? null : /[:/]/.test(a[0]) ? a[0] : env.remoteUrl?.(here, a[0]) ?? null; };
// git's subcommand: the first word after git that is not an option (-C <dir> and -c <key=value> take one more)
const subOf = (w) => { let i = 1; while (i < w.length && w[i].startsWith('-')) i += ['-C', '-c', '--git-dir', '--work-tree'].includes(w[i]) ? 2 : 1; return w[i]; };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const neverRx = (entry) => (entry.startsWith('~/') ? new RegExp(`(~|\\$HOME|/Users/[^/\\s]+|/home/[^/\\s]+)/${esc(entry.slice(2))}`) : new RegExp(esc(entry.replace(/^\/+/, ''))));
const expand = (p) => p.replace(/^\$HOME(?=\/|$)/, '~').replace(/^~(?=\/|$)/, homedir());

export function house(cmd, cwd = '.', env = real, cfg = {}) {
  const c = { ...DEFAULTS, ...cfg };
  const { owner, tokenVar: tok } = c;
  let body = cmd.replace(/<<-?\s*['"]?(\w+)['"]?[\s\S]*?\n\1\b/g, '');
  body = body.replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, "''");
  let here = cwd;
  let pushedBefore = false;
  for (const part of body.split(/&&|\|\||;|\||\n|\(|\)|`|\$\(/)) {
    let w = part.trim().split(/\s+/).filter(Boolean);
    if (w.length >= 2 && w[0] === 'cd' && w[1] !== "''") { here = normalize(resolve(here, expand(w[1]))); continue; }
    if (w.length >= 3 && w[0].split('/').pop() === 'git' && w[1] === '-C' && w[2] !== "''") here = normalize(resolve(here, expand(w[2])));
    while (w.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0]) || ['env', 'command', 'time', 'nohup', 'exec'].includes(w[0]))) w = w.slice(1);
    if (!w.length || !['git', 'gh'].includes(w[0].split('/').pop())) continue;
    const p = w.join(' ');
    const sub = w[0].split('/').pop() === 'git' ? subOf(w) : null; // the subcommand, never a word in an argument: `git rev-parse x^{commit}` commits nothing
    const dryRun = sub === 'add' && /\s(-n|--dry-run)(\s|$)/.test(p); // KF-10: it stages nothing
    if ((sub === 'add' && !dryRun && /(\s-A\b|\s--all\b|\s\.(\s|$))/.test(p)) || (sub === 'commit' && /\s-[a-zA-Z]*a[a-zA-Z]*\b(?!\S)/.test(p) && !p.includes('--amend'))) {
      return 'Stage by explicit path: `git add <paths>` and `git commit -- <paths>`. `add -A`, `add .` and `commit -a` sweep in other work.';
    }
    for (const never of c.neverStage ?? []) if (sub === 'add' && neverRx(never).test(p)) return `Nothing under ${never} is ever committed.`;
    const undo = p.match(/\bgit\b\s+(?:-C\s+\S+\s+)?(checkout|restore|stash|clean|reset)\b(.*)/);
    if (undo) {
      const [, verb, rest] = undo;
      const harmless = (verb === 'stash' && /\b(list|show|pop|apply)\b/.test(rest)) ||
        (verb === 'restore' && /\s--staged\b/.test(rest) && !/\s(--worktree|-W)\b/.test(rest)) ||
        (verb === 'reset' && !rest.includes('--hard')) || (verb === 'checkout' && /\s-b\b/.test(rest)) ||
        (verb === 'clean' && /\s-[a-zA-Z]*n/.test(rest)) ||
        (verb === 'checkout' && /\s--(?:theirs|ours)\b/.test(rest) && env.merging?.(here)); // KF-21: a conflict resolved, not an undo
      if (!harmless) {
        // an untracked file is touched only by clean: checkout, restore, stash and reset --hard leave it, and git itself refuses a
        // checkout that would overwrite one (KWB-147: a worktree's node_modules link, the status line's state file)
        const d = env.dirty(here).filter((l) => verb === 'clean' || !l.startsWith('??'));
        if (d.length) {
          const safe = c.safeRestore
            ? `Commit it, or use the safe form: ${c.safeRestore} (git status, every dirty file copied aside and checked, then only those paths restored).`
            : 'Commit it first (a work-in-progress commit on a branch), then undo what you meant to.';
          return `\`git ${verb}\` on a tree with uncommitted work. Two days of work were lost this way. Uncommitted now:\n    ${d.slice(0, 12).join('\n    ')}\n${safe} No override exists.`;
        }
      }
    }
    if (/\bgit\b.*\bbranch\b.*\s(-D|-d|--delete)\b/.test(p) || /\bgit\b.*\bpush\b.*(\s--delete\b|\s:[\w/.-]+)/.test(p)) {
      return 'A branch is never deleted. Branches are the record of the build; they stay, here and on GitHub.';
    }
    if (['rebase', 'filter-branch'].includes(sub) || (sub === 'commit' && p.includes('--amend'))) return 'Nothing is rebased or amended. Make a new commit.';
    if (['commit', 'push', 'merge', 'am'].includes(sub) && /\s(--no-verify|-n)(\s|$)/.test(p)) {
      return 'Never --no-verify (or -n): the pre-commit hook is the gate. When it refuses, fix what it names; if a commit must hold something that fails the gates (a planted fault for a test), do not commit it: work on an uncommitted copy.';
    }
    if (c.refuseTrunk && sub === 'commit' && (c.trunks ?? []).includes(env.branch(here)) && env.hasHead(here)) {
      return `This is the trunk. Every task is built on its own branch and merged when complete: ${c.branchStart}.`;
    }
    // WB-107: an agent's isolated worktree cannot push (its harness refuses), so the lead pushes its branch; Stop still holds it
    if (!pushedBefore && env.unpushed && sub === 'commit' && !/\/\.claude\/worktrees\/agent-[^/]+(\/|$)/.test(here) && !ownerPushes(c, env.branch(here))) {
      const u = env.unpushed(here, c);
      if (u?.error) env.warn?.(`git-guard: GitHub was not checked before this commit (${u.error}); the commit goes ahead unchecked. Push when it is back (KWB-26).`);
      else if (u?.commits?.length) return unpushedMessage(u, c);
    }
    if (/\bgit\b.*\bpush\b/.test(p)) {
      if (/\s(-f|--force|--force-with-lease)\b/.test(p)) return 'Never force a push. Nothing pushed is rebased or amended.';
      const refused = pushLaw(p, pushTarget(w, here, env), c);
      if (refused) return refused;
      pushedBefore = true;
    }
    const ghRefused = ghLaw(cmd, p, c, process.env, env.login);   // env.login: gh's own account, asked only when a gh call is refused
    if (ghRefused) return ghRefused;
    if (/\bgh\s+repo\s+create\b/.test(p) && ((owner && !p.includes(`${owner}/`)) || !p.includes('--private'))) return `A repo is created as ${owner}/<name> --private.`;
    if (/\bgit\b.*\b(remote\s+(add|set-url)|config)\b/.test(p) && new RegExp(`x-access-token|ghp_|github_pat_|${esc(tok)}`).test(p)) {
      return 'The token is never stored in a remote URL or a config file. Name it on the push only.';
    }
  }
  if (/\b(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/.test(cmd)) return `A literal GitHub token is in this command. Use $${tok} from ~/.env.`;
  return null;
}

function main(text) {
  let payload;
  try { payload = JSON.parse(text); } catch { return 0; }
  const command = payload.tool_input?.command ?? '';
  // the project's laws: its own layout (a worktree with its own layout.json is judged by it, else the project's)
  const layout = readLayout(claudeRoot(projectRoot(), join(process.env.CLAUDE_PROJECT_DIR ?? process.cwd(), '.claude', 'layout.json'), process.cwd()));
  const cfg = { ...DEFAULTS, ...(layout.enable?.includes('guards/git-house') ? NEW_INSTALL_GIT : {}), ...(layout.guards?.git ?? {}) }; // KF-8: an existing project opts in
  if (payload.hook_event_name === 'Stop') {
    if (!cfg.house) return 0;
    const v = stopVerdict(projectRoot(), process.env, cfg, payload.session_id, { lag: trunkLag }); // KWB-96: and the main checkout's trunk
    if (v.stdout) process.stdout.write(v.stdout);
    if (v.stderr) process.stderr.write(v.stderr);
    return v.code;
  }
  const why = problem(command);
  if (why) {
    process.stderr.write(
      `BLOCKED by git-guard: ${why}.\nA token is used, never stored. Push with a one-shot credential helper that reads it from the environment:\n` +
        "  git -c credential.helper='!f() { echo username=x-access-token; echo password=$TOKEN; }; f' push -u origin <branch>\n" +
        'or push to the token URL without -u, then set the upstream by name:\n' +
        '  git config branch.<branch>.remote origin && git config branch.<branch>.merge refs/heads/<branch>\n',
    );
    return 2;
  }
  if (!cfg.house || !/git|gh |ghp_|github_pat_/.test(command)) return 0;
  const warnings = [];
  const env = { ...real, unpushed: (cwd, c) => unpushed(cwd, process.env, real.branch(cwd), forRepo(cwd, process.env, projectRoot(), c)), warn: (m) => warnings.push(m) };
  const reason = house(command, payload.cwd ?? process.cwd(), env, cfg);
  if (warnings.length) process.stdout.write(JSON.stringify({ systemMessage: warnings.join('\n') }));
  if (!reason) return 0;
  process.stderr.write(`git-guard: ${reason}\n`);
  return 2;
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? await (await import('./lib/git-guard-selftest.mjs')).selftest(fileURLToPath(import.meta.url), { problem, house }) : await asHook('git-guard', main));
