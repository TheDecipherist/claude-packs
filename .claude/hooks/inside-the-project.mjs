// PreToolUse (Write, Edit, MultiEdit, NotebookEdit, Bash): work for a project happens inside that project, always. Every
// other hook judges only paths inside the project and lets a command that leaves it pass, so a checkout of this repo kept
// beside the project (a worktree made with `git worktree add ../x`, or a clone of the same origin) is outside the kit: no
// law reaches anything written there (KWB-103: a run made ../vsynthgt-W3 and ../vsynthgt-W2 and worked unjudged for hours).
// This hook refuses:
//   - `git worktree add` or `git worktree move` to a path outside the project;
//   - a write into a checkout of this repo that lies outside the project;
//   - a `cd`, `pushd`, `git -C`, `make -C`, `ninja -C` or `cmake --build` into one.
// A sibling project (another repo) is never judged here: editing other projects from one session stays allowed.
// A judge on the hook contract (W4): the project, the folder and HOME come from `ctx`; it writes nothing.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bareWords } from './lib/command-prefix.mjs';
import { isMain, runAsHook } from './lib/hook-log.mjs';
import { commonGitDir, insideProject } from './lib/project.mjs';
import { bashOf, git, put, runHook, scratchProject, snapshot, verdicts, writeOf, writtenSince } from './lib/selftest.mjs';
import { refuse as refusing, pass } from './lib/verdict.mjs';
import { writesOf } from './lib/writes.mjs';
const WORKTREE_VALUE_OPTIONS = new Set(['-b', '-B', '--reason']);
const homePath = (p, home) => p.replace(/^~(?=\/|$)/, home ?? '~');
const unquote = (w) => w.replace(/^(['"])(.*)\1$/, '$2');
// The repo a checkout belongs to, by its origin URL: host/owner/name, so the SSH and HTTPS forms of one remote agree.
function originOf(dir) {
    const common = commonGitDir(dir);
    if (!common)
        return null;
    try {
        const url = readFileSync(join(common, 'config'), 'utf8').match(/\[remote "origin"\][^[]*?url\s*=\s*(\S+)/)?.[1];
        if (!url)
            return null;
        return url.replace(/^[a-z+]+:\/\//i, '').replace(/^[^@/]+@/, '').replace(':', '/').replace(/\.git$/, '').toLowerCase();
    }
    catch {
        return null;
    }
}
// The checkout a path lies in: the nearest folder above it holding a .git, or null.
function checkoutOf(path) {
    for (let dir = resolve(path);; dir = dirname(dir)) {
        if (existsSync(join(dir, '.git')))
            return dir;
        if (dirname(dir) === dir)
            return null;
    }
}
// True when a path is outside the project but inside a checkout of this same repo.
function besideTheProject(path, at) {
    if (insideProject(at.root, path, at.cwd))
        return false;
    const checkout = checkoutOf(path);
    if (!checkout)
        return false;
    const ours = commonGitDir(at.root);
    if (ours && commonGitDir(checkout) === ours)
        return true;
    const origin = originOf(at.root);
    return origin !== null && originOf(checkout) === origin;
}
const why = (path) => [
    `${path} is a checkout of this project kept outside it.`,
    'Work for a project happens inside that project, always: outside it no hook of the kit judges anything (KWB-103).',
    'A worktree goes in .claude/worktrees/<name>: git worktree add .claude/worktrees/<name> -b <branch> origin/<trunk>.',
].join(' ');
// The folder a git command works in, from its -C options.
function gitFolder(words, here, home) {
    let dir = here;
    let i = 1;
    for (; i < words.length && /^-[Cc]$/.test(words[i] ?? ''); i += 2)
        if (words[i] === '-C')
            dir = resolve(dir, homePath(words[i + 1] ?? '.', home));
    return { dir, next: i };
}
// Where `git worktree add|move` puts a worktree, or null for any other git command.
function worktreeTarget(words, i) {
    const verb = words[i + 1] ?? '';
    if (words[i] !== 'worktree' || !['add', 'move'].includes(verb))
        return null;
    const positional = [];
    for (let j = i + 2; j < words.length; j += 1) {
        const word = words[j] ?? '';
        if (WORKTREE_VALUE_OPTIONS.has(word))
            j += 1;
        else if (!word.startsWith('-'))
            positional.push(word);
    }
    return (verb === 'add' ? positional[0] : positional[1]) ?? null;
}
// The folders a command works in, and the targets of its worktree commands, each resolved from where it runs.
export function judgeCommand(command, at) {
    let here = at.cwd;
    for (const raw of command.split(/&&|\|\||;|\n|\|/)) {
        const words = bareWords(raw.trim().split(/\s+/).filter(Boolean).map(unquote));
        const first = words[0];
        if (first === undefined)
            continue;
        const from = (p) => resolve(here, homePath(p, at.home));
        const into = (p) => (p && besideTheProject(from(p), at) ? why(from(p)) : null);
        if (first === 'cd' || first === 'pushd') {
            if (words[1])
                here = from(words[1]);
            const found = into(words[1]);
            if (found)
                return found;
        }
        else if (first === 'make' || first === 'ninja') {
            const c = words.indexOf('-C');
            const found = into(c > 0 ? words[c + 1] : undefined);
            if (found)
                return found;
        }
        else if (first === 'cmake' && words[1] === '--build') {
            const found = into(words[2]);
            if (found)
                return found;
        }
        else if (first === 'git') {
            const { dir, next } = gitFolder(words, here, at.home);
            if (besideTheProject(dir, at))
                return why(dir);
            // A worktree command on another project's repo is that project's business (KWB-104): judge the target only here.
            const target = insideProject(at.root, dir, at.cwd) ? worktreeTarget(words, next) : null;
            if (target && !insideProject(at.root, resolve(dir, homePath(target, at.home)), at.cwd))
                return why(resolve(dir, homePath(target, at.home)));
        }
    }
    return null;
}
export const hook = (event, ctx) => {
    const cwd = event.cwd ?? ctx.cwd;
    const at = { root: ctx.projectDir, cwd, home: ctx.env.HOME };
    const said = (msg) => refusing(`BLOCKED by inside-the-project: ${msg}`);
    if (event.tool_name === 'Bash') {
        const msg = judgeCommand(event.tool_input?.command ?? '', at);
        if (msg)
            return said(msg);
    }
    for (const w of writesOf(event, cwd, ctx.env))
        if (besideTheProject(w.path, at))
            return said(why(w.path));
    return pass;
};
/** A worktree inside the project is the project's: work there passes (the worktree kept beside it is outside the kit, a case
 *  that needs a real `git worktree add` and stays in worktrees.test.mjs). */
export const worktreeCase = {
    steps: [
        { label: 'a write into the worktree inside the project', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/src/n.ts', content: 'x' }, cwd: '{here}' }, want: 0 },
        { label: 'a worktree added beside the project', event: { tool_name: 'Bash', tool_input: { command: 'git worktree add ../beside-x -b beside-x' }, cwd: '{here}' }, want: 2 },
    ],
};
export function selftest() {
    const hookFile = fileURLToPath(import.meta.url);
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
    const before = snapshot(parent); // the folders as the judge finds them: the rows below must leave them as they are
    const run = (payload) => runHook(hookFile, proj, payload).status;
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
        ['a worktree added inside another project (KWB-104)', sh('cd ../other && git worktree add -q .claude/worktrees/w -b w main'), 0],
        ['a worktree added in another project with git -C (KWB-104)', sh('git -C ../other worktree add .claude/worktrees/w -b w'), 0],
        ['a plain command', sh('git status'), 0],
        ['a judge writes no file (the write trap)', writtenSince(parent, before).join(','), ''],
    ]);
}
if (isMain(import.meta.url))
    await runAsHook(import.meta.url, 'inside-the-project', hook, selftest);
