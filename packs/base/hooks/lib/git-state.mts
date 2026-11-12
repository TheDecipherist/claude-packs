// git-state: the git facts the hooks of one event ask for again and again, kept in one file per checkout (W8.3; runtime-cost survey,
// section 4: chart-first listed the whole HEAD tree on every Write, 93 ms; suite-once and git-guard asked for the branch and
// the uncommitted files). The runner keeps the file, never a hook: a judge writes nothing. After each event the runner asks
// `noteGitState`: when what is kept no longer matches the repo, a detached `run-hooks --git-state <checkout>` takes the facts
// again (two git calls, off the event's clock) and writes the file by rename; the hooks read it (`headFiles`, `dirtyFiles`) and
// ask git themselves for what is missing or stale, so a hook run alone (its selftest, a hand-made entry) judges as before.
// What is kept and how it is checked:
//   head + tree   the files of HEAD that are not empty, with their sizes; valid while HEAD's commit is the one it was taken at
//                 (the commit is read from the git dir's own files, so it is exact, never a guess)
//   dirty         tracked files with uncommitted changes; valid while the mtimes the status line already uses (index, HEAD,
//                 FETCH_HEAD, logs/HEAD) are as they were and for 30 s at most: an edit to a tracked file moves none of them,
//                 so this one is a hint for a message, never a law's input
// The branch of a checkout and whether a ref exists are read from the git dir's files (git-files.mts), with no process.
//   headFiles(checkout, env) -> [path, size][]    non-empty files of HEAD: the kept list, else `git ls-tree`
//   dirtyFiles(checkout, env, now) -> string[]    `git status --porcelain` lines of tracked files: the kept ones, else git's
//   checkoutBranch(checkout, env) -> string       the branch ('' when detached or unborn), from the files, else git
//   refExistsIn(checkout, env, ref) -> boolean
//   noteGitState(checkout, env, runner, now)      after an event: starts the refresh when the kept facts are stale
//   keepGitState(checkout, env, now)              the refresh itself
import { spawn } from 'node:child_process';
import { statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { put, readText } from './files.mts';
import { checkoutRoot } from './project.mts';
import { currentHead, gitDirsOf, refSha } from './git-files.mts';
import type { GitDirs } from './git-files.mts';
import { gitLines, gitOut } from './git-run.mts';
import { shortHash } from './hash.mts';
import { readJson, writeJson } from './json.mts';
import type { Env } from './types.d.mts';

/** A file of HEAD that is not empty: its path and its size in bytes. */
export type TreeEntry = readonly [path: string, size: number];

/** What is kept for a checkout. `tree` is null when HEAD holds more files than are worth keeping (the hooks then ask git). */
export interface GitFacts { head: string | null; stamp: string; at: number; dirty: string[]; tree: TreeEntry[] | null }

export const DIRTY_FRESH_MS = 30_000;
export const TREE_CAP = 20_000;
const SPAWN_SKIP_MS = 10_000;

const where = (env: Env): string => env['TMPDIR'] ?? tmpdir();
const fileFor = (checkout: string, env: Env): string => join(where(env), `claude-packs-gitstate-${shortHash(checkout, 12)}.json`);
/** The file the facts of a checkout are kept in (for a test that plants one). */
export const stateFileOf = fileFor;

/** The mtimes the status line keys its own look on (statusline-work.mts): any of them moving is a change. */
function stampOf(dirs: GitDirs): string {
  return ['index', 'HEAD', 'FETCH_HEAD', 'logs/HEAD'].map((f) => { try { return statSync(join(dirs.gitDir, f)).mtimeMs; } catch { return 0; } }).join(':');
}

const readFacts = (checkout: string, env: Env): GitFacts | null => readJson<GitFacts>(fileFor(checkout, env));

/** The non-empty files of HEAD, parsed from `git ls-tree -r -l HEAD`. */
function treeFromGit(checkout: string, env: Env): TreeEntry[] {
  return gitLines(['ls-tree', '-r', '-l', 'HEAD'], { cwd: checkout, env }).flatMap((line): TreeEntry[] => {
    const [meta = '', path = ''] = line.split('\t');
    const size = Number(meta.trim().split(/\s+/)[3]) || 0;
    return size > 0 && path ? [[path, size]] : [];
  });
}

const dirtyFromGit = (checkout: string, env: Env): string[] =>
  gitLines(['-C', checkout, '--no-optional-locks', 'status', '--porcelain', '--untracked-files=no'], { cwd: checkout, env }).filter((l) => l.trim());

export function headFiles(checkout: string, env: Env): TreeEntry[] {
  const dirs = gitDirsOf(checkout);
  const kept = dirs ? readFacts(checkout, env) : null;
  const head = dirs ? currentHead(dirs).sha : null;
  return kept?.tree && head !== null && kept.head === head ? [...kept.tree] : treeFromGit(checkout, env);
}

export function dirtyFiles(checkout: string, env: Env, now: number = Date.now()): string[] {
  const dirs = gitDirsOf(checkout);
  const kept = dirs ? readFacts(checkout, env) : null;
  return dirs && kept && kept.stamp === stampOf(dirs) && now >= kept.at && now - kept.at < DIRTY_FRESH_MS ? [...kept.dirty] : dirtyFromGit(checkout, env);
}

/** What a checkout's HEAD says, read from the git dir's files; `fallback` asks git when `dir` is not a checkout's own folder. */
export function headRead<T>(dir: string, fallback: () => T, fromFiles: (head: { branch: string | null; sha: string | null }) => T): T {
  const dirs = gitDirsOf(dir);
  return dirs ? fromFiles(currentHead(dirs)) : fallback();
}

export function checkoutBranch(checkout: string, env: Env): string {
  const dirs = gitDirsOf(checkout);
  if (dirs) return currentHead(dirs).branch ?? '';
  return gitOut(['branch', '--show-current'], { cwd: checkout, env }) ?? '';
}

export function refExistsIn(checkout: string, env: Env, ref: string): boolean {
  const dirs = gitDirsOf(checkout);
  if (dirs) return refSha(dirs, ref) !== null;
  return gitOut(['rev-parse', '--verify', '-q', ref], { cwd: checkout, env }) !== null;
}

/** Takes the facts of a checkout and keeps them (by rename). */
export function keepGitState(checkout: string, env: Env, now: number = Date.now()): void {
  const dirs = gitDirsOf(checkout);
  if (!dirs) return;
  const tree = treeFromGit(checkout, env);
  const facts: GitFacts = { head: currentHead(dirs).sha, stamp: stampOf(dirs), at: now, dirty: dirtyFromGit(checkout, env), tree: tree.length <= TREE_CAP ? tree : null };
  writeJson(fileFor(checkout, env), facts);
}

/** Whether what is kept still answers for this checkout: HEAD's commit and the stamp are as they were, and it is not old. */
function fresh(dirs: GitDirs, kept: GitFacts | null, now: number): boolean {
  return kept !== null && kept.head === currentHead(dirs).sha && kept.stamp === stampOf(dirs) && now >= kept.at && now - kept.at < DIRTY_FRESH_MS;
}

/** The hooks that read the kept facts: a project with none of them installed keeps nothing. */
const READERS: readonly string[] = ['chart-first', 'suite-once'];

/** After an event: the project's checkout, and the one the event worked in, are kept fresh for the hooks that read them. */
export function noteEventGitState(table: readonly { hook: string }[], projectDir: string, eventCwd: string, env: Env, runner: string): void {
  if (!table.some((r) => READERS.includes(r.hook))) return;
  for (const checkout of new Set([resolve(projectDir), checkoutRoot(projectDir, join(eventCwd, 'x'), eventCwd)])) noteGitState(checkout, env, runner);
}

/** After an event, for the checkout it worked in: starts `runner --git-state <checkout>` detached when the kept facts are stale
 *  (one refresh at a time per checkout: another started less than 10 s ago will do). */
export function noteGitState(checkout: string, env: Env, runner: string, now: number = Date.now()): void {
  try {
    const dirs = gitDirsOf(checkout);
    if (!dirs || fresh(dirs, readFacts(checkout, env), now)) return;
    const lock = `${fileFor(checkout, env)}.start`;
    if (now - (Number(readText(lock)) || 0) < SPAWN_SKIP_MS) return;
    put(lock, String(now));
    spawn(process.execPath, [runner, '--git-state', checkout], { cwd: checkout, detached: true, stdio: 'ignore', env: { ...env } }).unref();
  } catch { /* the hooks ask git for themselves */ }
}
