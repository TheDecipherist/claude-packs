// remote-heads: what GitHub holds, for git-guard's pushed laws (KWB-26; the laws are in pushed.mts).
// GitHub's branch heads come from `git ls-remote --heads <remote>`: no objects are fetched and nothing local changes. The last
// look is kept in the repo's git dir (claude-packs-heads.json) and only ever lets work through: a commit seen on GitHub stays
// there (the house laws never force a push or delete a branch), so a check the last look already clears makes no network call,
// however old the look. Anything a caller would refuse is looked up again live first (`withHeads`), so a push made seconds
// ago is seen at once. (Measured 2026-11-03 at load 27: a check the cache clears 0.3 s; a live look 4 to 7 s.)
// A private GitHub repo needs the token: it is read from the environment or ~/.env (guards.git.tokenVar) and handed to git
// as an Authorization header through the child's environment (GIT_CONFIG_COUNT/KEY/VALUE: never on its command line, so
// never in ps); it is never written to a remote, a config or a file. Protocol v0 answers with every head in one request
// with the header sent at once (measured 2026-11-03: 4 s against 12 s for v2 with a credential helper, GitHub slow).
// A repo that pushes by URL only and has no remote (Stellix) names its GitHub repo in guards.git.repo ("owner/name", or a URL
// or path); with neither, there is nothing to compare with and nothing is judged.
// The folder and the environment are the caller's (the event's), never this process's.
//   gitAt(cwd, env, extra, input) -> the options every git call here runs with (15 s, no prompt)
//   remoteHeads(cwd, env, remote, options) -> { url, heads: Map<branch, sha>, cached } | { url, error }
//   withHeads(cwd, env, remote, cfg, judge) -> what judge found, looked up live again before a refusal | { error }
//   urlOf(cwd, env, remote, { repo }) / target(cwd, env, branch) / ownCommits(cwd, env, ref, heads, have) / knownShas(cwd, env, heads)
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { readText } from './files.mts';
import { escapeRegExp } from './glob.mts';
import { gitOut, gitRun } from './git-run.mts';
import type { GitOptions } from './git-run.mts';
import { readJson, writeJson } from './json.mts';

const CACHE = 'claude-packs-heads.json';
const GIT_TIMEOUT_MS = 15_000;

/** The environment a git call runs with: the event's. */
export type GitEnv = GitOptions['env'];

/** How a look at GitHub is made. */
export interface HeadsOptions {
  /** The variable that holds the GitHub token. */
  tokenVar?: string;
  /** guards.git.repo: "owner/name", a URL or a path, for a repo with no remote. */
  repo?: string | null;
  /** Look at GitHub now, whatever the last look says. */
  live?: boolean;
  /** The time the look is kept under, in ms. */
  now?: number;
  /** The moment (ms since the epoch) a live look must be answered by: the end of a session gives up on GitHub after one second (W8.3). */
  until?: number;
}

/** guards.git in a project's layout: the laws of git-guard and what they name. Proposed for types.d.mts. */
export interface GitGuards extends HeadsOptions {
  house?: boolean;
  /** "token" names a token variable; "cli" uses this machine's own git and gh login. */
  ghAuth?: 'token' | 'cli';
  trunkNeedsYes?: boolean;
  pushNeedsYes?: boolean;
  /** The branches that are the trunk. */
  trunks?: readonly string[];
  owner?: string;
  accountNote?: string;
  safeRestore?: string;
  branchStart?: string;
  refuseTrunk?: boolean;
  /** Judge from the last look alone: the end of a session tells once, with no network call for what it told before. */
  cachedOnly?: boolean;
  /** How long the end of a session may serve its last verdict while no ref changed, in ms (60,000 by default; 0 looks every time). */
  stopCacheMs?: number;
}

export interface HeadsFound { url: string; heads: Map<string, string>; cached: boolean }
export interface HeadsFailed { url: string | null; error: string }
export type HeadsLook = HeadsFound | HeadsFailed;
export interface Failure { error: string }

interface CacheEntry { time: number; heads: Record<string, string> }

/** A failure, as opposed to what a judge found. */
export const failed = (x: unknown): x is Failure => typeof x === 'object' && x !== null && 'error' in x && typeof x.error === 'string';

/** The options one git call runs with: the caller's folder and environment, no prompt, 15 s. */
export function gitAt(cwd: string, env: GitEnv, extra: Readonly<Record<string, string>> = {}, input?: string): GitOptions {
  const options: GitOptions = { cwd, env: { ...env, GIT_TERMINAL_PROMPT: '0', ...extra }, timeoutMs: GIT_TIMEOUT_MS };
  if (input !== undefined) options.input = input;
  return options;
}

/** The token: the environment's, else the one in ~/.env; null when neither names it. */
export function tokenFor(tokenVar: string, env: GitEnv): string | null {
  const set = env[tokenVar];
  if (set) return set;
  const text = readText(join(env['HOME'] ?? homedir(), '.env'));
  const m = text?.match(new RegExp(`^\\s*(?:export\\s+)?${escapeRegExp(tokenVar)}=(['"]?)(.*?)\\1\\s*$`, 'm'));
  return m?.[2] || null;
}

export const isGitHub = (url: string | null): boolean => /^https:\/\/([^@/]+@)?github\.com\//.test(url ?? '');

function cacheFile(cwd: string, env: GitEnv): string | null {
  const d = gitOut(['rev-parse', '--git-common-dir'], gitAt(cwd, env));
  return d ? join(resolve(cwd, d), CACHE) : null;
}

/** The URL a remote name stands for, else the layout's repo. */
export function urlOf(cwd: string, env: GitEnv, remote: string, { repo = null }: { repo?: string | null } = {}): string | null {
  const url = gitOut(['remote', 'get-url', remote], gitAt(cwd, env));
  if (url || !repo) return url || null;
  return /^(https?:|file:|\/)/.test(repo) ? repo : `https://github.com/${repo.replace(/\.git$/, '')}.git`;
}

export function remoteHeads(cwd: string, env: GitEnv, remote: string, { tokenVar = 'PERSONAL_GITHUB_TOKEN', repo = null, live = false, now = Date.now(), until }: HeadsOptions = {}): HeadsLook {
  const url = urlOf(cwd, env, remote, { repo });
  if (!url) return { url: null, error: `no remote named ${remote}` };
  const file = cacheFile(cwd, env);
  const cache = (file ? readJson<Record<string, CacheEntry>>(file, {}) : null) ?? {};
  const hit = cache[url];
  if (!live && hit?.heads) return { url, heads: new Map(Object.entries(hit.heads)), cached: true };
  const token = isGitHub(url) ? tokenFor(tokenVar, env) : null;
  const basic = token ? Buffer.from(`x-access-token:${token}`).toString('base64') : '';
  const extra: Record<string, string> = token ? { GIT_CONFIG_COUNT: '2', GIT_CONFIG_KEY_0: 'http.extraHeader', GIT_CONFIG_VALUE_0: `Authorization: Basic ${basic}`, GIT_CONFIG_KEY_1: 'credential.helper', GIT_CONFIG_VALUE_1: '' } : {};
  const allowed = until === undefined ? GIT_TIMEOUT_MS : Math.max(50, Math.min(GIT_TIMEOUT_MS, until - Date.now()));
  const r = gitRun(['-c', 'protocol.version=0', 'ls-remote', '--heads', url], { ...gitAt(cwd, env, extra), timeoutMs: allowed });
  if (!r.ok) return { url, error: (r.status === null ? `no answer in ${allowed < 2000 ? `${(allowed / 1000).toFixed(1)}` : Math.round(allowed / 1000)} s` : r.stderr.trim().split('\n').pop()) || 'git failed' };
  const heads = new Map<string, string>();
  for (const line of r.stdout.split('\n').filter(Boolean)) {
    const [sha, ref] = line.split('\t');
    if (sha && ref) heads.set(ref.replace(/^refs\/heads\//, ''), sha);
  }
  if (file) writeJson(file, { ...cache, [url]: { time: now, heads: Object.fromEntries(heads) } }); // the check still holds when it cannot be kept
  return { url, heads, cached: false };
}

/** The remote a branch pushes to and its name there: its upstream, else origin and the same name. */
export function target(cwd: string, env: GitEnv, branch: string): { remote: string; name: string } {
  const remote = gitOut(['config', `branch.${branch}.remote`], gitAt(cwd, env));
  const merge = gitOut(['config', `branch.${branch}.merge`], gitAt(cwd, env));
  if (remote && remote !== '.') return { remote, name: merge ? merge.replace(/^refs\/heads\//, '') : branch };
  return { remote: 'origin', name: branch };
}

/** The heads whose commits this repo has (one git call for all of them: a call each took 20 s at load 27 on 28 branches). */
export function knownShas(cwd: string, env: GitEnv, heads: ReadonlyMap<string, string>): string[] {
  const shas = [...new Set(heads.values())];
  const r = gitOut(['cat-file', '--batch-check'], gitAt(cwd, env, {}, `${shas.join('\n')}\n`));
  return r === null ? [] : r.split('\n').filter((l) => / commit /.test(l)).map((l) => l.slice(0, l.indexOf(' ')));
}

export interface OwnCommit { sha: string; subject: string }

/** Commits on `ref` that no GitHub branch holds (only heads whose commits this repo has can be subtracted); null when git failed. */
export function ownCommits(cwd: string, env: GitEnv, ref: string, heads: ReadonlyMap<string, string>, have: readonly string[] = knownShas(cwd, env, heads)): OwnCommit[] | null {
  const r = gitOut(['log', '--format=%h %s', ref, '--not', ...have, '--'], gitAt(cwd, env));
  return r === null ? null : r.split('\n').filter(Boolean).map((l) => ({ sha: l.slice(0, l.indexOf(' ')), subject: l.slice(l.indexOf(' ') + 1) }));
}

/** Looks with the cache first; anything `judge` would refuse (it returns something) is looked up again live. */
export function withHeads<T>(cwd: string, env: GitEnv, remote: string, cfg: GitGuards, judge: (h: HeadsFound) => T | null): T | Failure | null {
  const unreached = (h: HeadsFailed): Failure => ({ error: `${h.url ?? remote} could not be reached (${h.error})` });
  let h = remoteHeads(cwd, env, remote, cfg);
  if ('error' in h) return unreached(h);
  let found = judge(h);
  if (found && h.cached && !cfg.cachedOnly) {
    h = remoteHeads(cwd, env, remote, { ...cfg, live: true });
    if ('error' in h) return unreached(h);
    found = judge(h);
  }
  return found;
}
