#!/usr/bin/env node
// git-guard (PreToolUse, Bash): the git mistakes that cost days, refused before the command runs. Exit 2 refuses.
//
// ALWAYS (Sub37 WB-3): a token never lands in git config. `git push -u <url-with-token>` records that URL as the
// branch's upstream, and `remote add/set-url`, `clone`, `submodule` and `config` store it as a remote; the token then
// sits in .git/config in plain text. Pushing to a token URL WITHOUT -u stores nothing and is allowed.
//
// THE HOUSE LAWS, when the project switches them on (.claude/layout.json "guards": { "git": { "house": true } };
// a project whose history is on main moves to the branch flow first, then enables them):
//   1. No `git add -A`, `add .`, `add --all`, `commit -a`. Stage by path.
//   2. No checkout / restore / stash / reset --hard / clean over uncommitted work; no override lets one through.
//      `git restore --staged` (unstage only) passes. The project's safe form, if any, is named (guards.git.safeRestore).
//   3. A push names https://...github.com/<owner>/<repo>.git with the token variable, and never forces.
//   4. Every `gh` names the token (GH_TOKEN=$<tokenVar>); a repo is created as <owner>/<name> --private.
//   5. A token is never written into a remote URL or a config file, and never pasted literally.
//   6. Nothing under a never-staged folder (~/firmware) is staged.
//   7. No branch is deleted; nothing is rebased or amended; no hook is skipped (--no-verify).
//   8. With guards.git.refuseTrunk true: no commit straight onto a trunk (main, master); guards.git.branchStart says how.
// Only a real git or gh call is judged: heredoc bodies and quoted text are blanked, and a part counts only when its
// first word (after VAR=value) is git or gh. `cd` and `git -C` move the folder the dirty-tree and trunk checks look at.
// The laws hold in every repo a command reaches. `--selftest` proves both halves.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, normalize, resolve } from 'node:path';
import { readLayout } from './lib/layout.mjs';
import { claudeRoot } from './lib/project.mjs';

// ---------- always: a token never stored ----------
const URL_USER = /\b[a-z][\w+.-]*:\/\/([^\s/@'"]+)@/gi;
const SECRET_USER = /:|\$|^(gh[pousr]_|github_pat_|glpat-|x-access-token|oauth2)/i;

export const tokenUrls = (text) => [...text.matchAll(URL_USER)].filter((m) => SECRET_USER.test(m[1])).map((m) => m[0]);
export const mask = (url) => url.replace(/:\/\/[^@]+@/, '://***@');

export function problem(command) {
  for (const raw of command.split(/&&|\|\||;|\||\n/)) {
    const m = raw.trim().match(/^(?:\w+=\S*\s+)*git((?:\s+(?:-C|-c)\s+\S+)*)\s+([\w-]+)(.*)$/);
    if (!m) continue;
    const [, , sub, args] = m;
    const urls = tokenUrls(args);
    if (!urls.length) continue;
    const where = mask(urls[0]);
    if (sub === 'push' && /(^|\s)(--set-upstream|-[a-zA-Z]*u[a-zA-Z]*)(\s|$)/.test(args)) {
      return `push -u with ${where} would write the token into .git/config as the branch's upstream`;
    }
    if (sub === 'remote' && /^\s*(add|set-url)\b/.test(args)) return `remote ${args.trim().split(/\s+/)[0]} would store ${where} in .git/config`;
    if (sub === 'clone') return `clone would store ${where} as origin in the new repo's .git/config`;
    if (sub === 'submodule') return `submodule would store ${where} in .gitmodules and .git/config`;
    if (sub === 'config') return `config would store ${where} in git config`;
  }
  return null;
}

// ---------- the house laws ----------
export const DEFAULTS = {
  house: false,
  owner: 'TheDecipherist',
  tokenVar: 'PERSONAL_GITHUB_TOKEN',
  trunks: ['main', 'master'],
  refuseTrunk: false,
  neverStage: ['~/firmware'],
  safeRestore: null,
  branchStart: 'git switch -c work/<name>',
  accountNote: 'The default account on this machine is the MongoDB one.',
};

const gitOut = (cwd, ...a) => { try { return execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 10000 }); } catch { return null; } };
const real = {
  dirty: (cwd) => (gitOut(cwd, '--no-optional-locks', 'status', '--porcelain') ?? '').split('\n').filter((l) => l.trim()),
  branch: (cwd) => (gitOut(cwd, 'rev-parse', '--abbrev-ref', 'HEAD') ?? '').trim(),
  hasHead: (cwd) => gitOut(cwd, 'rev-parse', '-q', '--verify', 'HEAD') !== null,
};
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const neverRx = (entry) => (entry.startsWith('~/') ? new RegExp(`(~|\\$HOME|/Users/[^/\\s]+|/home/[^/\\s]+)/${esc(entry.slice(2))}`) : new RegExp(esc(entry.replace(/^\/+/, ''))));
const expand = (p) => p.replace(/^\$HOME(?=\/|$)/, '~').replace(/^~(?=\/|$)/, homedir());

export function house(cmd, cwd = '.', env = real, cfg = {}) {
  const c = { ...DEFAULTS, ...cfg };
  const { owner, tokenVar: tok } = c;
  let body = cmd.replace(/<<-?\s*['"]?(\w+)['"]?[\s\S]*?\n\1\b/g, '');
  body = body.replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, "''");
  let here = cwd;
  for (const part of body.split(/&&|\|\||;|\||\n|\(|\)|`|\$\(/)) {
    let w = part.trim().split(/\s+/).filter(Boolean);
    if (w.length >= 2 && w[0] === 'cd' && w[1] !== "''") { here = normalize(resolve(here, expand(w[1]))); continue; }
    if (w.length >= 3 && w[0].split('/').pop() === 'git' && w[1] === '-C' && w[2] !== "''") here = normalize(resolve(here, expand(w[2])));
    while (w.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0]) || ['env', 'command', 'time', 'nohup', 'exec'].includes(w[0]))) w = w.slice(1);
    if (!w.length || !['git', 'gh'].includes(w[0].split('/').pop())) continue;
    const p = w.join(' ');
    if (/\bgit\b.*\badd\b.*(\s-A\b|\s--all\b|\s\.(\s|$))/.test(p) || (/\bgit\b.*\bcommit\b.*\s-[a-zA-Z]*a[a-zA-Z]*\b(?!\S)/.test(p) && !p.includes('--amend'))) {
      return 'Stage by explicit path: `git add <paths>` and `git commit -- <paths>`. `add -A`, `add .` and `commit -a` sweep in other work.';
    }
    for (const never of c.neverStage ?? []) if (/\bgit\b.*\badd\b/.test(p) && neverRx(never).test(p)) return `Nothing under ${never} is ever committed.`;
    const undo = p.match(/\bgit\b\s+(?:-C\s+\S+\s+)?(checkout|restore|stash|clean|reset)\b(.*)/);
    if (undo) {
      const [, verb, rest] = undo;
      const harmless = (verb === 'stash' && /\b(list|show|pop|apply)\b/.test(rest)) ||
        (verb === 'restore' && /\s--staged\b/.test(rest) && !/\s(--worktree|-W)\b/.test(rest)) ||
        (verb === 'reset' && !rest.includes('--hard')) || (verb === 'checkout' && /\s-b\b/.test(rest)) ||
        (verb === 'clean' && /\s-[a-zA-Z]*n/.test(rest));
      if (!harmless) {
        const d = env.dirty(here);
        if (d.length) {
          const safe = c.safeRestore
            ? `Commit it, or use the safe form: ${c.safeRestore} (git status, every dirty file copied aside and checked, then only those paths restored).`
            : 'Commit it first (a work-in-progress commit on a branch), then undo what you meant to.';
          return `\`git ${verb}\` on a tree with uncommitted work. Two days of panel work were lost this way. Uncommitted now:\n    ${d.slice(0, 12).join('\n    ')}\n${safe} No override exists.`;
        }
      }
    }
    if (/\bgit\b.*\bbranch\b.*\s(-D|-d|--delete)\b/.test(p) || /\bgit\b.*\bpush\b.*(\s--delete\b|\s:[\w/.-]+)/.test(p)) {
      return 'A branch is never deleted. Branches are the record of the build; they stay, here and on GitHub.';
    }
    if (/\bgit\b.*\b(rebase|filter-branch)\b/.test(p) || /\bgit\b.*\bcommit\b.*--amend/.test(p)) return 'Nothing is rebased or amended. Make a new commit.';
    if (/\bgit\b.*\s(--no-verify|-n)(\s|$)/.test(p) && /\bgit\b.*\b(commit|push|merge|am)\b/.test(p)) {
      return 'Never --no-verify (or -n): the pre-commit hook is the gate. When it refuses, fix what it names; if a commit must hold something that fails the gates (a planted fault for a test), do not commit it: work on an uncommitted copy.';
    }
    if (c.refuseTrunk && /\bgit\b.*\bcommit\b/.test(p) && (c.trunks ?? []).includes(env.branch(here)) && env.hasHead(here)) {
      return `This is the trunk. Every task is built on its own branch and merged when complete: ${c.branchStart}.`;
    }
    if (/\bgit\b.*\bpush\b/.test(p)) {
      if (/\s(-f|--force|--force-with-lease)\b/.test(p)) return 'Never force a push. Nothing pushed is rebased or amended.';
      if (!new RegExp(`github\\.com/${esc(owner)}/[\\w.-]+`).test(p)) {
        return `A push must name the repo: git push https://x-access-token:$${tok}@github.com/${owner}/<repo>.git <branch>. ${c.accountNote}`;
      }
      if (!p.includes(`$${tok}`) && !p.includes(`\${${tok}}`)) return `A push names the token as $${tok}, never a pasted one.`;
    }
    if (/(^|\s)gh\s/.test(p) && !cmd.includes(`GH_TOKEN=$${tok}`)) return `Every \`gh\` names the token: source ~/.env && GH_TOKEN=$${tok} gh ... ${c.accountNote}`;
    if (/\bgh\s+repo\s+create\b/.test(p) && (!p.includes(`${owner}/`) || !p.includes('--private'))) return `A repo is created as ${owner}/<name> --private.`;
    if (/\bgit\b.*\b(remote\s+(add|set-url)|config)\b/.test(p) && new RegExp(`x-access-token|ghp_|github_pat_|${esc(tok)}`).test(p)) {
      return 'The token is never stored in a remote URL or a config file. Name it on the push only.';
    }
  }
  if (/\b(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/.test(cmd)) return `A literal GitHub token is in this command. Use $${tok} from ~/.env.`;
  return null;
}

function main() {
  let payload;
  try { payload = JSON.parse(readFileSync(0, 'utf8')); } catch { return 0; }
  const command = payload.tool_input?.command ?? '';
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
  // the project's laws: its own layout (a worktree with its own layout.json is judged by it, else the project's)
  const cfg = { ...DEFAULTS, ...(readLayout(claudeRoot(join(process.env.CLAUDE_PROJECT_DIR ?? process.cwd(), '.claude', 'layout.json'))).guards?.git ?? {}) };
  if (!cfg.house || !/git|gh |ghp_|github_pat_/.test(command)) return 0;
  const reason = house(command, payload.cwd ?? process.cwd(), real, cfg);
  if (!reason) return 0;
  process.stderr.write(`git-guard: ${reason}\n`);
  return 2;
}

function selftest() {
  const bad = [];
  // the token law (Sub37 WB-3)
  const tokenCases = [
    ['git push -u https://x-access-token:abc@github.com/a/b.git work/x', true],
    ['git push --set-upstream https://me:$TOKEN@github.com/a/b.git main', true],
    ['cd ../b && git -C ../b push origin x -u https://u:p@github.com/a/b.git', true],
    ['git remote set-url origin https://ghp_abc@github.com/a/b.git', true],
    ['git remote add o https://u:${T}@github.com/a/b.git', true],
    ['git clone https://x-access-token:abc@github.com/a/b.git', true],
    ['git config remote.origin.url https://u:t@github.com/a/b.git', true],
    ['git push https://x-access-token:$T@github.com/a/b.git work/x', false],
    ['git push -u origin work/x', false],
    ['git remote set-url origin https://github.com/a/b.git', false],
    ['git remote add o git@github-decipherist:TheDecipherist/b.git', false],
    ['git clone https://me@github.com/a/b.git', false],
    ['echo https://u:p@x.com/y', false],
  ];
  for (const [cmd, block] of tokenCases) if ((problem(cmd) !== null) !== block) bad.push(`token law: ${cmd}`);
  if (problem('git push -u https://u:SECRET@h/x.git b')?.includes('SECRET')) bad.push('the refusal prints the token');

  // the house laws
  const isDirty = { dirty: () => [' M design/gen_panel.py'], branch: () => 'step/C1-the-ribbon', hasHead: () => true };
  const clean = { ...isDirty, dirty: () => [] };
  const on = (branch, env = clean) => ({ ...env, branch: typeof branch === 'function' ? branch : () => branch });
  const push = 'git push https://x-access-token:$PERSONAL_GITHUB_TOKEN@github.com/TheDecipherist/synth.git main';
  const mustBlock = [
    ['git add -A', clean], ['git add .', clean], ["git commit -am 'x'", clean], ['git add ~/firmware/korg/m1.bin', clean],
    ['git -C /Users/someone/projects/other add -A', clean], ['cd ~/projects/other && git add -A', clean],
    ['cd ~/projects/other && git checkout -- tools/bank/kept.json', isDirty],
    ['git checkout -- design/gen_panel.py', isDirty], ['git stash', isDirty], ['git restore .', isDirty], ['git reset --hard HEAD~1', isDirty],
    ['git clean -fd', isDirty], ['GUARD_OK=1 git checkout -- x.h', isDirty], ['GUARD_OK=1 git restore build/Testing/Temporary/LastTest.log', isDirty],
    ['GUARD_OK=1 git restore --staged --worktree a.md', isDirty], ['git restore --staged --worktree a.md', isDirty],
    ['git push', clean], ['git push origin main', clean], [`${push} --force`, clean],
    ['git push https://x-access-token:$PERSONAL_GITHUB_TOKEN@github.com/mongodb/synth.git main', clean],
    ['gh repo create TheDecipherist/synth --private', clean],
    ['source ~/.env && GH_TOKEN=$PERSONAL_GITHUB_TOKEN gh repo create synth --private', clean],
    ['git remote add origin https://x-access-token:$PERSONAL_GITHUB_TOKEN@github.com/TheDecipherist/synth.git', clean],
    [`git push https://x-access-token:ghp_${'a'.repeat(30)}@github.com/TheDecipherist/synth.git main`, clean],
    ['git branch -D step/C1-x', clean], ['git push origin --delete step/C1-x', clean], ['git rebase main', clean], ['git commit --amend -m x', clean],
    ["git commit -q -m 'bench' --no-verify", clean], ['GUARD_OK=1 git commit --no-verify -m x -- a.h', clean],
    ['git push --no-verify https://x@github.com/TheDecipherist/synth.git main', clean],
  ];
  const mustPass = [
    ['git add build.md src/Row.h', isDirty], ["git commit -m 'C1: row clock' -- build.md src/Row.h", isDirty],
    ['cd ~/projects/other && git add tools/bank/kept.json', isDirty], ['git status', isDirty], ['git checkout -- x.h', clean],
    ['git restore --staged x.h', isDirty], ['python3 tools/safe_restore.py x.h', isDirty], ['git stash list', isDirty],
    ['git checkout -b c2-filter', isDirty], [push, isDirty],
    ['source ~/.env && GH_TOKEN=$PERSONAL_GITHUB_TOKEN gh repo create TheDecipherist/synth --private', clean],
    ['cmake --build build --target Synth_Standalone -j8', isDirty], ['git log --oneline -6 | sed -n 1,3p', isDirty],
    ["git branch --list 'step/U5*' | tr -d ' *'", isDirty], ["grep -n 'def push' tools/step.py", isDirty], ["echo 'git push origin main'", isDirty],
    ["python3 - <<'EOF'\nprint('git add -A')\nEOF", isDirty],
  ];
  for (const [cmd, env] of mustBlock) if (house(cmd, '.', env) === null) bad.push(`NOT BLOCKED: ${cmd}`);
  for (const [cmd, env] of mustPass) { const r = house(cmd, '.', env); if (r !== null) bad.push(`WRONGLY BLOCKED: ${cmd} -> ${r}`); }
  const TRUNK = { refuseTrunk: true };
  for (const cmd of ["git commit -m 'x' -- a.h", "GUARD_OK=1 git commit -m 'x' -- a.h"]) if (house(cmd, '.', on('main'), TRUNK) === null) bad.push(`NOT BLOCKED on trunk: ${cmd}`);
  if (house("git commit -m 'x' -- a.h", '.', on('main')) !== null) bad.push('a commit on main with the trunk refusal off (the default)');
  if (house("git commit -m 'first' -- a.h", '.', { ...on('main'), hasHead: () => false }, TRUNK) !== null) bad.push('the first commit');
  const byDir = on((c) => (c.endsWith('wt') ? 'work/x' : 'main'));
  if (house('cd /r/wt && git commit --no-edit', '/r', byDir, TRUNK) !== null) bad.push('a commit after cd into a worktree on a branch');
  if (house('git -C /r/wt commit --no-edit', '/r', byDir, TRUNK) !== null) bad.push('git -C a worktree on a branch');
  if (house('cd /r && git commit --no-edit', '/r/wt', byDir, TRUNK) === null) bad.push('cd onto the trunk then commit');
  const other = { owner: 'Acme', tokenVar: 'ACME_TOKEN', trunks: ['trunk'], safeRestore: 'python3 tools/safe_restore.py <paths>', branchStart: 'python3 tools/step.py start <STEP> "task"', refuseTrunk: true };
  for (const [cmd, env, want] of [
    ['git push https://x-access-token:$ACME_TOKEN@github.com/Acme/app.git b', clean, null], [push, clean, 'Acme'],
    ['git commit -m x -- a', on('trunk'), 'tools/step.py'], ['git commit -m x -- a', on('main'), null], ['git stash', isDirty, 'safe_restore.py'],
  ]) {
    const r = house(cmd, '.', env, other);
    if ((r === null) !== (want === null) || (want && !r.includes(want))) bad.push(`with a project's own values: ${cmd} -> ${r}`);
  }
  for (const b of bad) console.error(`git-guard selftest FAILED: ${b}`);
  if (!bad.length) console.log(`git-guard selftest: OK (${tokenCases.length + 1} token cases, ${mustBlock.length + 7} house refusals, ${mustPass.length + 4} passes)`);
  return bad.length ? 1 : 0;
}

process.exit(process.argv.includes('--selftest') ? selftest() : main());
