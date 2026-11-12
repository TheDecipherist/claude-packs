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
import { dirname, join, resolve } from 'node:path';
import { put, readText } from './files.mjs';
import { escapeRegExp } from './glob.mjs';
import { gitConfigRead } from './git-config.mjs';
import { findGitDirs } from './git-files.mjs';
import { gitOut, gitRun } from './git-run.mjs';
import { readJson, writeJson } from './json.mjs';
const CACHE = 'claude-packs-heads.json';
const GIT_TIMEOUT_MS = 15_000;
const PUSH_SEEN = 'claude-packs-pushed';
/** A failure, as opposed to what a judge found. */
export const failed = (x) => typeof x === 'object' && x !== null && 'error' in x && typeof x.error === 'string';
/** The options one git call runs with: the caller's folder and environment, no prompt, 15 s. */
export function gitAt(cwd, env, extra = {}, input) {
    const options = { cwd, env: { ...env, GIT_TERMINAL_PROMPT: '0', ...extra }, timeoutMs: GIT_TIMEOUT_MS };
    if (input !== undefined)
        options.input = input;
    return options;
}
/** The token: the environment's, else the one in ~/.env; null when neither names it. */
export function tokenFor(tokenVar, env) {
    const set = env[tokenVar];
    if (set)
        return set;
    const text = readText(join(env['HOME'] ?? homedir(), '.env'));
    const m = text?.match(new RegExp(`^\\s*(?:export\\s+)?${escapeRegExp(tokenVar)}=(['"]?)(.*?)\\1\\s*$`, 'm'));
    return m?.[2] || null;
}
export const isGitHub = (url) => /^https:\/\/([^@/]+@)?github\.com\//.test(url ?? '');
function cacheFile(cwd, env) {
    const dirs = findGitDirs(cwd, env); // the git dir's files, no process
    if (dirs)
        return join(dirs.common, CACHE);
    const d = gitOut(['rev-parse', '--git-common-dir'], gitAt(cwd, env));
    return d ? join(resolve(cwd, d), CACHE) : null;
}
/** The URL a remote name stands for, else the layout's repo. */
export function urlOf(cwd, env, remote, { repo = null } = {}) {
    const config = gitConfigRead(cwd, env);
    const url = config ? config.get('remote', remote, 'url') : gitOut(['remote', 'get-url', remote], gitAt(cwd, env));
    if (url || !repo)
        return url || null;
    return /^(https?:|file:|\/)/.test(repo) ? repo : `https://github.com/${repo.replace(/\.git$/, '')}.git`;
}
/** Records that a push was seen (a push by URL moves no local ref): the next offline look is taken live once. */
export function pushSeen(cwd, env, now = Date.now()) {
    const file = cacheFile(cwd, env);
    if (file)
        put(join(dirname(file), PUSH_SEEN), String(now));
}
/** The heads this repo's remote-tracking refs hold for a remote (every push by name and fetch updates them), keyed `<remote>/<branch>`. */
export function trackedHeads(cwd, env, remote) {
    const out = gitOut(['for-each-ref', '--format=%(refname)%09%(objectname)', `refs/remotes/${remote}/`], gitAt(cwd, env));
    const heads = new Map();
    for (const line of (out ?? '').split('\n').filter(Boolean)) {
        const [ref, sha] = line.split('\t');
        if (ref && sha)
            heads.set(ref.replace(/^refs\/remotes\//, ''), sha);
    }
    return heads;
}
export function remoteHeads(cwd, env, remote, { tokenVar = 'PERSONAL_GITHUB_TOKEN', repo = null, live = false, offline = false, now = Date.now(), until } = {}) {
    const url = urlOf(cwd, env, remote, { repo });
    if (!url)
        return { url: null, error: `no remote named ${remote}` };
    const file = cacheFile(cwd, env);
    const cache = (file ? readJson(file, {}) : null) ?? {};
    const hit = cache[url];
    const pushed = offline && hit && file ? Number(readText(join(dirname(file), PUSH_SEEN))) || 0 : 0;
    if (!live && hit?.heads && !(pushed > hit.time))
        return { url, heads: new Map(Object.entries(hit.heads)), cached: true };
    const token = isGitHub(url) ? tokenFor(tokenVar, env) : null;
    const basic = token ? Buffer.from(`x-access-token:${token}`).toString('base64') : '';
    const extra = token ? { GIT_CONFIG_COUNT: '2', GIT_CONFIG_KEY_0: 'http.extraHeader', GIT_CONFIG_VALUE_0: `Authorization: Basic ${basic}`, GIT_CONFIG_KEY_1: 'credential.helper', GIT_CONFIG_VALUE_1: '' } : {};
    const allowed = until === undefined ? GIT_TIMEOUT_MS : Math.max(50, Math.min(GIT_TIMEOUT_MS, until - Date.now()));
    const r = gitRun(['-c', 'protocol.version=0', 'ls-remote', '--heads', url], { ...gitAt(cwd, env, extra), timeoutMs: allowed });
    if (!r.ok)
        return { url, error: (r.status === null ? `no answer in ${allowed < 2000 ? `${(allowed / 1000).toFixed(1)}` : Math.round(allowed / 1000)} s` : r.stderr.trim().split('\n').pop()) || 'git failed' };
    const heads = new Map();
    for (const line of r.stdout.split('\n').filter(Boolean)) {
        const [sha, ref] = line.split('\t');
        if (sha && ref)
            heads.set(ref.replace(/^refs\/heads\//, ''), sha);
    }
    if (file)
        writeJson(file, { ...cache, [url]: { time: now, heads: Object.fromEntries(heads) } }); // the check still holds when it cannot be kept
    return { url, heads, cached: false };
}
/** The remote a branch pushes to and its name there: its upstream, else origin and the same name. */
export function target(cwd, env, branch) {
    const config = gitConfigRead(cwd, env);
    const remote = config ? config.get('branch', branch, 'remote') : gitOut(['config', `branch.${branch}.remote`], gitAt(cwd, env));
    const merge = config ? config.get('branch', branch, 'merge') : gitOut(['config', `branch.${branch}.merge`], gitAt(cwd, env));
    if (remote && remote !== '.')
        return { remote, name: merge ? merge.replace(/^refs\/heads\//, '') : branch };
    return { remote: 'origin', name: branch };
}
/** The heads whose commits this repo has (one git call for all of them: a call each took 20 s at load 27 on 28 branches). */
export function knownShas(cwd, env, heads) {
    const shas = [...new Set(heads.values())];
    const r = gitOut(['cat-file', '--batch-check'], gitAt(cwd, env, {}, `${shas.join('\n')}\n`));
    return r === null ? [] : r.split('\n').filter((l) => / commit /.test(l)).map((l) => l.slice(0, l.indexOf(' ')));
}
/** Commits on `ref` that no GitHub branch holds (only heads whose commits this repo has can be subtracted); null when git failed. */
export function ownCommits(cwd, env, ref, heads, have = knownShas(cwd, env, heads)) {
    const r = gitOut(['log', '--format=%h %s', ref, '--not', ...have, '--'], gitAt(cwd, env));
    return r === null ? null : r.split('\n').filter(Boolean).map((l) => ({ sha: l.slice(0, l.indexOf(' ')), subject: l.slice(l.indexOf(' ') + 1) }));
}
/** Looks with the cache first; anything `judge` would refuse (it returns something) is looked up again live. */
export function withHeads(cwd, env, remote, cfg, judge) {
    const unreached = (h) => ({ error: `${h.url ?? remote} could not be reached (${h.error})` });
    let h = remoteHeads(cwd, env, remote, cfg);
    if ('error' in h)
        return unreached(h);
    let found = judge(h);
    if (found && cfg.offline && h.cached) { // the kept look and the local tracking refs together, never the network
        found = judge({ ...h, heads: new Map([...h.heads, ...trackedHeads(cwd, env, remote)]) });
    }
    else if (found && h.cached && !cfg.cachedOnly) {
        h = remoteHeads(cwd, env, remote, { ...cfg, live: true });
        if ('error' in h)
            return unreached(h);
        found = judge(h);
    }
    return found;
}
