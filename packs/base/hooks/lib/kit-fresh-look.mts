// What kit-fresh looks at (KWB-156): a project's installed kit against npm's newest, and the kit's own checkout against
// origin/main and the newest origin/work/<version>-* branch. Every outside call (npm, git) comes in as a function, so a selftest
// plants it and no test reaches the network. The environment and the time are parameters (d-10), never the process's own.
//   parseVersion(v) -> its three numbers | null        compareVersions(a, b) -> <0 | 0 | >0 (a missing version is lowest)
//   cacheDir(env) -> the user's cache folder on this system  newestOnNpm({ now, dir, ask }) -> { version } | { error }
//   projectVerdict(root, { unattended, npm }) -> null | { say, block }
//   kitVerdict(root, { git, fetch }) -> null | { say, refuseCommit }
//   atStart(root, { env, now, ... }) -> null | { say, block }   atCommit(root, command, { env, git }) -> refusal | null
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { put } from './files.mts';
import { gitRun } from './git-run.mts';
import { readJson, toJson } from './json.mts';
import { KIT, runningKit } from './kit-version.mts';
import type { Env } from './shell-writes.mts';

export { KIT };

const DAY_MS = 24 * 60 * 60 * 1000;
const RETRY_MS = 60 * 60 * 1000;   // an unanswered ask is tried again after an hour, never on every session
const NPM_TIMEOUT_MS = 8000;
const FETCH_TIMEOUT_MS = 15000;
const GIT_TIMEOUT_MS = 5000;
const WORK_BRANCH = /^origin\/work\/(\d+\.\d+\.\d+)-/;

/** npm's answer: the newest version, or why it could not be had. */
export type NpmAnswer = { version: string; error?: undefined } | { error: string; version?: undefined };
/** What kit-fresh says at a session's start, and whether the session must not start. */
export interface FreshVerdict { say: string; block: boolean }
/** What kit-fresh says of the kit's own checkout, and whether a commit here must wait. */
export interface KitVerdict { say: string; refuseCommit: boolean }
/** git's answer in a folder: never a throw; a missing git or a failed command is ok: false. */
export interface KitGitAnswer { ok: boolean; out: string; err: string }
export type KitGit = (...args: string[]) => KitGitAnswer;

export const parseVersion = (v: unknown): [number, number, number] | null => {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(v ?? '').trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
};

export function compareVersions(a: unknown, b: unknown): number {
  const x = parseVersion(a), y = parseVersion(b);
  if (!x || !y) return (x ? 1 : 0) - (y ? 1 : 0);
  const at = ([0, 1, 2] as const).find((i) => x[i] !== y[i]);
  return at === undefined ? 0 : x[at] - y[at];
}

/** the folder the day's npm answer is kept in: the user's own cache folder on Linux, macOS and Windows */
export function cacheDir(env: Env): string {
  if (env['CLAUDE_PACKS_CACHE_DIR']) return env['CLAUDE_PACKS_CACHE_DIR'];
  if (process.platform === 'win32') return join(env['LOCALAPPDATA'] ?? join(homedir(), 'AppData', 'Local'), 'claude-packs');
  return join(env['XDG_CACHE_HOME'] ?? join(homedir(), '.cache'), 'claude-packs');
}

/** npm's newest version of the kit: `npm view` (npm.cmd on Windows needs a shell) */
export function askNpm(): NpmAnswer {
  const r = spawnSync('npm', ['view', KIT, 'version'], { encoding: 'utf8', timeout: NPM_TIMEOUT_MS, shell: process.platform === 'win32' });
  const v = (r.stdout ?? '').trim();
  if (parseVersion(v)) return { version: v };
  return { error: `npm view gave no version (${(r.stderr || r.error?.message || `exit ${r.status}`).trim().split('\n')[0]})` };
}

/** What is kept of an ask: the answer and when it was had. */
type Kept = { version?: unknown; error?: unknown; at?: unknown };

/** npm's newest version, asked at most once a day (an unanswered ask at most once an hour), the answer kept in the cache folder */
export function newestOnNpm({ now, dir, ask = askNpm }: { now: number; dir: string; ask?: () => NpmAnswer }): NpmAnswer {
  const file = join(dir, 'kit-fresh.json');
  const kept = readJson<Kept>(file);   // nothing kept yet: asked below
  const age = typeof kept?.at === 'number' ? now - kept.at : Infinity;
  if (typeof kept?.version === 'string' && kept.version && age < DAY_MS) return { version: kept.version };
  if (typeof kept?.error === 'string' && kept.error && age < RETRY_MS) return { error: kept.error };
  const r = ask();
  try { put(file, toJson({ ...r, at: now })); } catch { /* not kept: asked again next session, no harm */ }
  return r;
}

/** a project's installed kit (.claude/claude-packs.lock.json "kit") against npm's newest */
export function projectVerdict(root: string, { unattended, npm }: { unattended: boolean; npm: () => NpmAnswer }): FreshVerdict | null {
  const have = runningKit(root);   // the installed package's version, the lock only without one (KWB-162)
  if (!have) return null;   // no kit installed here: nothing to compare
  const newest = npm();
  if (newest.error !== undefined) return { say: `kit-fresh: could not check the installed kit (${have}) against npm: ${newest.error}. Not checked, not blocked.`, block: false };
  if (compareVersions(have, newest.version) >= 0) return null;
  const say = `kit-fresh: this project runs the kit ${have}, and npm has ${newest.version}. Update it first: ` +
    `npm install -D ${KIT}@${newest.version} && npx --no-install ${KIT} update`;
  return unattended ? { say: `${say}. Nobody is there, so this run does not start until it is updated.`, block: true } : { say, block: false };
}

export const isKitRepo = (root: string): boolean => readJson<{ name?: unknown }>(join(root, 'package.json'))?.name === KIT;

/** git in a folder through the one runner: { ok, out, err } (never throws; a missing git or a failed command is ok: false) */
export const kitGit = (root: string, env: Env): KitGit => (...args) => {
  const r = gitRun(['-C', root, ...args], { cwd: root, env, timeoutMs: args[0] === 'fetch' ? FETCH_TIMEOUT_MS : GIT_TIMEOUT_MS });
  return { ok: r.ok, out: r.stdout.trim(), err: r.stderr.trim().split('\n')[0] ?? '' };
};

const workVersion = (ref: string): string | null => WORK_BRANCH.exec(ref)?.[1] ?? null;

/** the kit's own checkout against origin/main and every origin/work/<version>-* newer than the checkout's own version */
export function kitVerdict(root: string, { git, fetch }: { git: KitGit; fetch: boolean }): KitVerdict | null {
  const notes: string[] = [];
  if (fetch) {
    const f = git('fetch', '-q', 'origin');
    if (!f.ok) notes.push(`could not fetch origin (${f.err || 'no answer'}): compared with what was fetched before`);
  }
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD').out;
  const own = [readJson<{ version?: unknown }>(join(root, 'package.json'))?.version, /^work\/(\d+\.\d+\.\d+)-/.exec(branch)?.[1]]
    .filter((v): v is string => parseVersion(v) !== null).sort(compareVersions).at(-1);
  const contained = (ref: string): boolean => git('merge-base', '--is-ancestor', ref, 'HEAD').ok;
  const refs = git('for-each-ref', '--format=%(refname:short)', 'refs/remotes/origin/work').out.split('\n').filter((r) => WORK_BRANCH.test(r));
  const newer = refs.filter((r) => compareVersions(workVersion(r), own) > 0 && !contained(r))
    .sort((a, b) => compareVersions(workVersion(b), workVersion(a)));
  const behindMain = git('rev-parse', '-q', '--verify', 'origin/main').ok && !contained('origin/main');
  const lacks = [...(behindMain ? ['origin/main'] : []), ...newer];
  if (!lacks.length) return notes.length ? { say: `kit-fresh: ${notes.join('; ')}. Not checked, not blocked.`, refuseCommit: false } : null;
  const say = `kit-fresh: this checkout (${branch}, ${own ?? 'no version'}) lacks newer work: ${lacks.slice(0, 4).join(', ')}. ` +
    `Switch to it (git switch ${(newer[0] ?? 'main').replace(/^origin\//, '')}) or merge it first (git merge ${lacks[0]}); a commit here waits until then` +
    (notes.length ? ` (${notes.join('; ')})` : '');
  return { say, refuseCommit: true };
}

const COMMIT = /(?:^|[;&|(\s])git\b(?:\s+-C\s+\S+|\s+-c\s+\S+)*\s+commit\b/;

/** What a session's start reads: the process's environment and the time are the caller's; `unattended`, `npm` and `git` are
 *  planted by a selftest (unattended is the environment's CLAUDE_PACKS_UNATTENDED when not given). */
export interface StartOptions { env: Env; now: number; unattended?: boolean; npm?: () => NpmAnswer; git?: KitGit }

/** what to say at a session's start, and whether it must not start: { say, block } | null */
export function atStart(root: string, { env, now, unattended = Boolean(env['CLAUDE_PACKS_UNATTENDED']), npm = () => newestOnNpm({ now, dir: cacheDir(env) }), git = kitGit(root, env) }: StartOptions): FreshVerdict | null {
  if (isKitRepo(root)) {
    const v = kitVerdict(root, { git, fetch: true });
    return v && { say: v.say, block: false };
  }
  return projectVerdict(root, { unattended, npm });
}

/** a commit in the kit's own repo while it lacks newer work: the refusal, or null (no fetch: what the session start fetched) */
export function atCommit(root: string, command: string | null | undefined, { env, git = kitGit(root, env) }: { env: Env; git?: KitGit }): string | null {
  if (!COMMIT.test(command ?? '') || !isKitRepo(root)) return null;
  const v = kitVerdict(root, { git, fetch: false });
  return v?.refuseCommit ? v.say : null;
}
