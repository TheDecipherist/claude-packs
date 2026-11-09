#!/usr/bin/env node
// PreToolUse (Write, Edit, MultiEdit, NotebookEdit, Bash): work for a project happens inside that project, always. Every
// other hook judges only paths inside the project and lets a command that leaves it pass, so a checkout of this repo kept
// beside the project (a worktree made with `git worktree add ../x`, or a clone of the same origin) is outside the kit: no
// law reaches anything written there (KWB-103: a run made ../vsynthgt-W3 and ../vsynthgt-W2 and worked unjudged for hours).
// This hook refuses:
//   - `git worktree add` or `git worktree move` to a path outside the project;
//   - a write into a checkout of this repo that lies outside the project;
//   - a `cd`, `pushd`, `git -C`, `make -C`, `ninja -C` or `cmake --build` into one.
// A sibling project (another repo) is never judged here: editing other projects from one session stays allowed.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { bareWords } from './lib/command-prefix.mjs';
import { ROOT, commonGitDir, insideProject } from './lib/project.mjs';
import { bashOf, git, put, runHook, scratchProject, verdicts, writeOf } from './lib/selftest.mjs';
import { readPayload, writesOf } from './lib/writes.mjs';
import { asHook, isMain } from './lib/hook-log.mjs';

const WORKTREE_VALUE_OPTIONS = new Set(['-b', '-B', '--reason']);
const home = (p) => p.replace(/^~(?=\/|$)/, process.env.HOME ?? '~');
const unquote = (w) => w.replace(/^(['"])(.*)\1$/, '$2');

// The repo a checkout belongs to, by its origin URL: host/owner/name, so the SSH and HTTPS forms of one remote agree.
function originOf(dir) {
  const common = commonGitDir(dir);
  if (!common) return null;
  try {
    const url = readFileSync(join(common, 'config'), 'utf8').match(/\[remote "origin"\][^[]*?url\s*=\s*(\S+)/)?.[1];
    if (!url) return null;
    return url.replace(/^[a-z+]+:\/\//i, '').replace(/^[^@/]+@/, '').replace(':', '/').replace(/\.git$/, '').toLowerCase();
  } catch {
    return null;
  }
}

// The checkout a path lies in: the nearest folder above it holding a .git, or null.
function checkoutOf(path) {
  for (let dir = resolve(path); ; dir = dirname(dir)) {
    if (existsSync(join(dir, '.git'))) return dir;
    if (dirname(dir) === dir) return null;
  }
}

// True when a path is outside the project but inside a checkout of this same repo.
function besideTheProject(path) {
  if (insideProject(path)) return false;
  const checkout = checkoutOf(path);
  if (!checkout) return false;
  const ours = commonGitDir(ROOT);
  if (ours && commonGitDir(checkout) === ours) return true;
  const origin = originOf(ROOT);
  return origin !== null && originOf(checkout) === origin;
}

const why = (path) => [
  `${path} is a checkout of this project kept outside it.`,
  'Work for a project happens inside that project, always: outside it no hook of the kit judges anything (KWB-103).',
  'A worktree goes in .claude/worktrees/<name>: git worktree add .claude/worktrees/<name> -b <branch> origin/<trunk>.',
].join(' ');

// The folder a git command works in, from its -C options.
function gitFolder(words, here) {
  let dir = here;
  let i = 1;
  for (; i < words.length && /^-[Cc]$/.test(words[i]); i += 2) if (words[i] === '-C') dir = resolve(dir, home(words[i + 1] ?? '.'));
  return { dir, next: i };
}

// Where `git worktree add|move` puts a worktree, or null for any other git command.
function worktreeTarget(words, i) {
  if (words[i] !== 'worktree' || !['add', 'move'].includes(words[i + 1])) return null;
  const positional = [];
  for (let j = i + 2; j < words.length; j += 1) {
    if (WORKTREE_VALUE_OPTIONS.has(words[j])) j += 1;
    else if (!words[j].startsWith('-')) positional.push(words[j]);
  }
  return (words[i + 1] === 'add' ? positional[0] : positional[1]) ?? null;
}

// The folders a command works in, and the targets of its worktree commands, each resolved from where it runs.
function judgeCommand(command, cwd) {
  let here = cwd;
  for (const raw of command.split(/&&|\|\||;|\n|\|/)) {
    const words = bareWords(raw.trim().split(/\s+/).filter(Boolean).map(unquote));
    if (!words.length) continue;
    const at = (p) => resolve(here, home(p));
    const into = (p) => (p && besideTheProject(at(p)) ? why(at(p)) : null);
    if (words[0] === 'cd' || words[0] === 'pushd') {
      if (words[1]) here = at(words[1]);
      const found = into(words[1]);
      if (found) return found;
    } else if (words[0] === 'make' || words[0] === 'ninja') {
      const c = words.indexOf('-C');
      const found = into(c > 0 ? words[c + 1] : null);
      if (found) return found;
    } else if (words[0] === 'cmake' && words[1] === '--build') {
      const found = into(words[2]);
      if (found) return found;
    } else if (words[0] === 'git') {
      const { dir, next } = gitFolder(words, here);
      if (besideTheProject(dir)) return why(dir);
      const target = worktreeTarget(words, next);
      if (target && !insideProject(resolve(dir, home(target)))) return why(resolve(dir, home(target)));
    }
  }
  return null;
}

function main(text) {
  const payload = readPayload(text);
  if (!payload) return 0; // not a refusal: an event that cannot be parsed has nothing to judge
  const cwd = payload.cwd ?? process.cwd();
  const refuse = (msg) => { process.stderr.write(`BLOCKED by inside-the-project: ${msg}\n`); return 2; };
  if (payload.tool_name === 'Bash') {
    const msg = judgeCommand(payload.tool_input?.command ?? '', cwd);
    if (msg) return refuse(msg);
  }
  for (const w of writesOf(payload, cwd)) if (besideTheProject(w.path)) return refuse(why(w.path));
  return 0;
}

function selftest() {
  const hook = new URL(import.meta.url).pathname;
  const parent = scratchProject({ 'proj/src/a.ts': 'a\n', 'other/b.ts': 'b\n' });
  const proj = join(parent, 'proj');
  git(proj, 'init', '-q');
  git(proj, 'remote', 'add', 'origin', 'git@github.com:Owner/proj.git');
  git(proj, 'add', '.');
  git(proj, 'commit', '-q', '-m', 'one');
  git(proj, 'worktree', 'add', '-q', join(parent, 'proj-W3'), '-b', 'w3');
  git(join(parent, 'other'), 'init', '-q');
  put(join(parent, 'clone/.git/config'), '[remote "origin"]\n\turl = https://github.com/owner/proj.git\n');
  put(join(parent, 'clone/src/c.ts'), 'c\n');
  const run = (payload) => runHook(hook, proj, payload);
  const sh = (command) => run(bashOf(command, proj));
  return verdicts('inside-the-project', [
    ['a worktree added beside the project', sh('git worktree add -q ../proj-W2 -b w2 origin/main'), 2],
    ['a worktree added beside it, after a fetch and with git -C', sh('git fetch -q && git -C . worktree add --lock --reason x ../w -b w'), 2],
    ['a worktree moved out of the project', sh('git worktree move .claude/worktrees/w ../w'), 2],
    ['a write into a worktree kept beside the project', run(writeOf(join(parent, 'proj-W3/src/n.ts'))), 2],
    ['a shell write into it', sh(`echo x > ${join(parent, 'proj-W3/src/m.ts')}`), 2],
    ['a cd into it', sh('cd ../proj-W3 && git status'), 2],
    ['git -C into it', sh('git -C ../proj-W3 commit -m x'), 2],
    ['make -C into it', sh('make -C ../proj-W3 all'), 2],
    ['a write into a clone of the same origin beside it', run(writeOf(join(parent, 'clone/src/d.ts'))), 2],
    ['a worktree added inside the project', sh('git worktree add -q .claude/worktrees/w2 -b w2 origin/main'), 0],
    ['work inside the project', run(writeOf(join(proj, 'src/b.ts'))), 0],
    ['a write in another project', run(writeOf(join(parent, 'other/c.ts'))), 0],
    ['a cd into another project', sh('cd ../other && ls'), 0],
    ['a plain command', sh('git status'), 0],
  ]);
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? selftest() : await asHook('inside-the-project', main));
