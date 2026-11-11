// pushed: what a repo holds that GitHub does not (KWB-26: eight kit branches lived on one machine only, and nothing said so).
// git-guard reads it twice: before a `git commit` (the branch's earlier commits must be on GitHub; the first commit of a new
// branch passes, the next waits for its push) and at Stop (no local branch may be ahead of GitHub or missing there).
// With guards.git.pushNeedsYes neither waits: Stop tells the owner what GitHub lacks (KWB-157).
// GitHub's branch heads come from `git ls-remote --heads <remote>`: no objects are fetched and nothing local changes. The last
// look is kept in the repo's git dir (claude-packs-heads.json) and only ever lets work through: a commit seen on GitHub stays
// there (the house laws never force a push or delete a branch), so a commit or a Stop the last look already clears makes no
// network call, however old the look. Anything it would refuse is looked up again live first, so a push made seconds
// ago is seen at once. (Measured 2026-11-03 at load 27: a Stop the cache clears 0.3 s; a live look 4 to 7 s.)
// A private GitHub repo needs the token: it is read from the environment or ~/.env (guards.git.tokenVar) and handed to git
// as an Authorization header through the child's environment (GIT_CONFIG_COUNT/KEY/VALUE: never on its command line, so
// never in ps); it is never written to a remote, a config or a file. Protocol v0 answers with every head in one request
// with the header sent at once (measured 2026-11-03: 4 s against 12 s for v2 with a credential helper, GitHub slow).
// GitHub out of reach (offline, no token): the caller lets the work through and says so.
// A repo that pushes by URL only and has no remote (Stellix) names its GitHub repo in guards.git.repo ("owner/name", or a URL
// or path); with neither, there is nothing to compare with and nothing is judged.
//   remoteHeads(cwd, remote, { tokenVar, repo, live }) -> { url, heads: Map<branch, sha>, cached } | { url, error }
//   forRepo(cwd, projectDir, cfg) -> cfg, without guards.git.repo when cwd is another repo
//   unpushed(cwd, branch, cfg) -> null | { error } | { branch, remote, url, commits: [{ sha, subject }] }
//   localBranches(cwd, cfg) -> null | { error } | [{ branch, url, missing, ahead }]   (only the ones not on GitHub)
//   othersBranches(cwd) -> Set of branches checked out in another checkout of this repo (not judged here)
//   pushCommand(url, branches, cfg) -> the push form: an SSH remote as itself, else with the token named
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const CACHE = 'claude-packs-heads.json';

export const git = (cwd, args, env = {}, input = undefined) => {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', input, stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'], timeout: 15000, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', ...env } });
  } catch (e) {
    return { error: (e.signal ? 'no answer in 15 s' : String(e.stderr ?? e.message).trim().split('\n').pop()) || 'git failed' };
  }
};
export const out = (r) => (typeof r === 'string' ? r.trim() : null);

export function tokenFor(tokenVar) {
  if (process.env[tokenVar]) return process.env[tokenVar];
  try {
    const m = readFileSync(join(homedir(), '.env'), 'utf8').match(new RegExp(`^\\s*(?:export\\s+)?${tokenVar}=(['"]?)(.*?)\\1\\s*$`, 'm'));
    return m?.[2] || null;
  } catch { return null; }
}

export const isGitHub = (url) => /^https:\/\/([^@/]+@)?github\.com\//.test(url ?? '');
const cacheFile = (cwd) => { const d = out(git(cwd, ['rev-parse', '--git-common-dir'])); return d ? join(resolve(cwd, d), CACHE) : null; };
const readCache = (file) => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return {}; } };

// the URL a remote name stands for, else the layout's repo
export function urlOf(cwd, remote, { repo = null } = {}) {
  const url = out(git(cwd, ['remote', 'get-url', remote]));
  if (url || !repo) return url || null;
  return /^(https?:|file:|\/)/.test(repo) ? repo : `https://github.com/${repo.replace(/\.git$/, '')}.git`;
}

export function remoteHeads(cwd, remote, { tokenVar = 'PERSONAL_GITHUB_TOKEN', repo = null, live = false, now = Date.now() } = {}) {
  const url = urlOf(cwd, remote, { repo });
  if (!url) return { url: null, error: `no remote named ${remote}` };
  const file = cacheFile(cwd);
  const cache = file ? readCache(file) : {};
  const hit = cache[url];
  if (!live && hit) return { url, heads: new Map(Object.entries(hit.heads)), cached: true };
  const args = ['-c', 'protocol.version=0', 'ls-remote', '--heads', url];
  let env = {};
  const token = isGitHub(url) ? tokenFor(tokenVar) : null;
  if (token) {
    const basic = Buffer.from(`x-access-token:${token}`).toString('base64');
    env = { GIT_CONFIG_COUNT: '2', GIT_CONFIG_KEY_0: 'http.extraHeader', GIT_CONFIG_VALUE_0: `Authorization: Basic ${basic}`, GIT_CONFIG_KEY_1: 'credential.helper', GIT_CONFIG_VALUE_1: '' };
  }
  const r = git(cwd, args, env);
  if (typeof r !== 'string') return { url, error: r.error };
  const heads = new Map(r.split('\n').filter(Boolean).map((l) => l.split('\t')).map(([sha, ref]) => [ref.replace(/^refs\/heads\//, ''), sha]));
  if (file) { try { writeFileSync(file, JSON.stringify({ ...cache, [url]: { time: now, heads: Object.fromEntries(heads) } })); } catch { /* the check still holds */ } }
  return { url, heads, cached: false };
}

// The remote a branch pushes to and its name there: its upstream, else origin and the same name.
export function target(cwd, branch) {
  const remote = out(git(cwd, ['config', `branch.${branch}.remote`]));
  const merge = out(git(cwd, ['config', `branch.${branch}.merge`]));
  if (remote && remote !== '.') return { remote, name: merge ? merge.replace(/^refs\/heads\//, '') : branch };
  return { remote: 'origin', name: branch };
}

// the heads whose commits this repo has (one git call for all of them: a call each took 20 s at load 27 on 28 branches)
const known = (cwd, heads) => {
  const shas = [...new Set(heads.values())];
  const r = out(git(cwd, ['cat-file', '--batch-check'], {}, shas.join('\n') + '\n'));
  return r === null ? [] : r.split('\n').filter((l) => / commit /.test(l)).map((l) => l.split(' ')[0]);
};
// commits on `ref` that no GitHub branch holds (only heads whose commits this repo has can be subtracted)
const ownCommits = (cwd, ref, heads, have = known(cwd, heads)) => {
  const r = out(git(cwd, ['log', '--format=%h %s', ref, '--not', ...have, '--']));
  return r === null ? null : r.split('\n').filter(Boolean).map((l) => ({ sha: l.slice(0, l.indexOf(' ')), subject: l.slice(l.indexOf(' ') + 1) }));
};

// Looks with the cache first; anything it would refuse is looked up again live.
export function withHeads(cwd, remote, cfg, judge) {
  let h = remoteHeads(cwd, remote, cfg);
  if (h.error) return { error: `${h.url ?? remote} could not be reached (${h.error})` };
  let found = judge(h);
  if (found && h.cached && !cfg.cachedOnly) {
    h = remoteHeads(cwd, remote, { ...cfg, live: true });
    if (h.error) return { error: `${h.url} could not be reached (${h.error})` };
    found = judge(h);
  }
  return found;
}

// guards.git.repo names the project's own repo: a command in another repo is not judged against it (KWB-48; it told a repo with
// no remote to push its history into the project's repo). A worktree of the project shares its git dir, so it stays judged.
export function forRepo(cwd, projectDir, cfg = {}) {
  const common = (dir) => { const d = out(git(dir, ['rev-parse', '--git-common-dir'])); return d ? resolve(dir, d) : null; };
  return cfg.repo && common(cwd) !== common(projectDir) ? { ...cfg, repo: null } : cfg;
}

export function unpushed(cwd, branch, cfg = {}) {
  if (!branch || branch === 'HEAD' || out(git(cwd, ['rev-parse', '-q', '--verify', 'HEAD'])) === null) return null;
  const { remote } = target(cwd, branch);
  if (!urlOf(cwd, remote, cfg)) return null; // no remote and no guards.git.repo: nothing to compare with
  return withHeads(cwd, remote, cfg, (h) => {
    const commits = ownCommits(cwd, 'HEAD', h.heads);
    return commits?.length ? { branch, remote, url: h.url, commits } : null;
  });
}

// The branches checked out in another checkout of this repo: each is its own session's to push (KWB-88: unattended sessions
// were charged at Stop for each other's branches). An agent's worktree (.claude/worktrees/agent-*) cannot push, so its lead keeps it.
export function othersBranches(cwd) {
  const top = out(git(cwd, ['rev-parse', '--show-toplevel']));
  const list = out(git(cwd, ['worktree', 'list', '--porcelain']));
  const others = new Set();
  for (const entry of (list ?? '').split('\n\n')) {
    const path = entry.match(/^worktree (.+)$/m)?.[1];
    const branch = entry.match(/^branch refs\/heads\/(.+)$/m)?.[1];
    if (path && branch && path !== top && !/\/\.claude\/worktrees\/agent-[^/]+$/.test(path)) others.add(branch);
  }
  return others;
}

// Whether only the owner pushes this branch: every branch with guards.git.pushNeedsYes (KWB-157), the trunk with trunkNeedsYes.
export const ownerPushes = (cfg, branch) => !!cfg.pushNeedsYes || (!!cfg.trunkNeedsYes && (cfg.trunks ?? []).includes(branch));

// With guards.git.pushNeedsYes the list is what to tell, not what to push: every branch, the trunk with them, and only those
// holding commits no GitHub branch has (one missing there by name only risks nothing) (KWB-157).
export function localBranches(cwd, cfg = {}) {
  // every branch, its commit and its upstream in one call
  const r = out(git(cwd, ['for-each-ref', '--format=%(refname:short)%09%(objectname)%09%(upstream:remotename)%09%(upstream:remoteref)', 'refs/heads']));
  if (r === null) return null;
  const byRemote = new Map();
  const others = othersBranches(cwd);
  const told = !!cfg.pushNeedsYes;
  for (const [branch, sha, up, ref] of r.split('\n').filter(Boolean).map((l) => l.split('\t'))) {
    if (!told && ownerPushes(cfg, branch)) continue; // only the owner pushes it
    if (others.has(branch)) continue;
    const remote = up && up !== '.' ? up : 'origin';
    const name = up && up !== '.' && ref ? ref.replace(/^refs\/heads\//, '') : branch;
    if (!byRemote.has(remote)) byRemote.set(remote, []);
    byRemote.get(remote).push({ branch, sha, name });
  }
  const found = [];
  for (const [remote, branches] of byRemote) {
    if (!urlOf(cwd, remote, cfg)) continue;
    const f = withHeads(cwd, remote, cfg, (h) => {
      const off = [];
      let have = null;
      for (const { branch, sha: local, name } of branches) {
        const sha = h.heads.get(name);
        if (!sha && !told) { off.push({ branch, url: h.url, missing: true }); continue; }
        if (local === sha) continue;
        have ??= known(cwd, h.heads);
        const ahead = ownCommits(cwd, branch, h.heads, have)?.length ?? 0;
        if (ahead) off.push({ branch, url: h.url, ahead, missing: !sha });
      }
      return off.length ? off : null;
    });
    if (f?.error) return f;
    if (f) found.push(...f);
  }
  return found;
}

// GitHub's push form, the token named and never stored; the repo is the remote's own name.
// The owner an SSH GitHub URL names (git@github.com:Owner/repo.git, an ssh config alias git@github-<name>:Owner/..., or
// ssh://git@github.com/Owner/...), else null. Over SSH the key picks the account, so the URL alone names the repo (KWB-39).
export function sshOwner(url) {
  return (url ?? '').match(/^(?:ssh:\/\/)?git@github(?:\.com|-[\w.-]+)[:/]([\w.-]+)\/[\w.-]+?(?:\.git)?\/?$/)?.[1] ?? null;
}

export function pushCommand(url, branches, { owner, tokenVar = 'PERSONAL_GITHUB_TOKEN' } = {}) {
  const ssh = sshOwner(url);
  if (ssh && (!owner || ssh === owner)) return `git push ${url} ${branches.join(' ')}`; // the key picks the account (KWB-88: no owner named)
  const m = (url ?? '').match(/github\.com[:/]([^/]+)\/([^/\s]+?)(?:\.git)?\/?$/);
  const repo = m ? `${m[1]}/${m[2]}` : `${owner ?? '<owner>'}/${(url ?? 'repo').split('/').pop().replace(/\.git$/, '')}`;
  return `source ~/.env && git push https://x-access-token:$${tokenVar}@github.com/${repo}.git ${branches.join(' ')}`;
}

const NEVER_DELETE = 'A branch is never deleted, renamed or left behind to get past this: push it.';

export function unpushedMessage(u, cfg = {}) {
  const list = u.commits.slice(0, 8).map((c) => `    ${c.sha} ${c.subject}`).join('\n') + (u.commits.length > 8 ? `\n    ... ${u.commits.length - 8} more` : '');
  return `${u.branch} has ${u.commits.length} commit(s) that are not on GitHub (${u.url}):\n${list}\n` +
    `Every branch is pushed from its first commit (KWB-26): push, then commit:\n  ${pushCommand(u.url, [u.branch], cfg)}\n${NEVER_DELETE}`;
}

// What lives on this machine only, left for the owner to push (guards.git.pushNeedsYes, KWB-157).
const hereOnly = (found) => `git-guard: ${found.length} local branch(es) hold commits that no GitHub branch has, left for you to push (guards.git.pushNeedsYes):\n` +
  found.map((f) => `    ${f.branch}: ${f.ahead} commit(s)${f.missing ? ', the branch not on GitHub' : ''}`).join('\n');

// Stop: -> { code, stdout, stderr }. Refused: a local branch not on GitHub, and the main checkout's trunk a landing left behind
// (`lag`, lib/trunk-lag.mjs, KWB-96). What could not be judged, or cannot be fixed by the session, goes to the user as a message.
// Three refusals with the same list end the session, the list going to the user. With guards.git.pushNeedsYes no branch is
// refused: what GitHub lacks is told once a session, by the cached look unless it would tell something new (KWB-157).
export const MAX_SENDS = 3;
export function stopVerdict(root, cfg = {}, session = 'session', stateDir = process.env.TMPDIR ?? '/tmp', { lag = () => null } = {}) {
  const file = join(stateDir, `git-guard-stop-${String(session).replace(/[^\w-]/g, '')}.json`);
  let st = {};
  try { st = JSON.parse(readFileSync(file, 'utf8')); } catch { /* first */ }
  const owner = !!cfg.pushNeedsYes;
  let found = localBranches(root, owner ? { ...cfg, cachedOnly: true } : cfg);
  if (owner && found?.length && hereOnly(found) !== st.told) found = localBranches(root, cfg); // looked up live before telling
  const behind = lag(root, cfg);
  const notes = [];
  if (found?.error) notes.push(`git-guard: GitHub was not checked at the end of this session: ${found.error}. Check by hand that every branch is pushed (KWB-26).`);
  if (behind?.error) notes.push(`git-guard: the main checkout's trunk was not compared with the remote's: ${behind.error} (KWB-96).`);
  if (behind?.warn) notes.push(`git-guard: ${behind.warn}`);
  const tell = owner && !found?.error && found?.length ? hereOnly(found) : undefined;
  if (tell && tell !== st.told) notes.push(tell);
  const parts = [];
  if (!owner && !found?.error && found?.length) {
    const byUrl = new Map();
    for (const f of found) byUrl.set(f.url, [...(byUrl.get(f.url) ?? []), f.branch]);
    parts.push(`${found.length} local branch(es) are not on GitHub:\n` +
      found.map((f) => `    ${f.branch}: ${f.missing ? 'not on GitHub at all' : `${f.ahead} commit(s) ahead of GitHub`}`).join('\n') +
      `\nPush them before the session ends (KWB-26):\n${[...byUrl].map(([url, b]) => `  ${pushCommand(url, b, cfg)}`).join('\n')}\n${NEVER_DELETE}`);
  }
  if (behind?.refuse) parts.push(behind.refuse);
  const said = notes.length ? JSON.stringify({ systemMessage: notes.join('\n') }) : undefined;
  if (!parts.length) { try { writeFileSync(file, JSON.stringify({ told: tell })); } catch { /* nothing to count */ } return { code: 0, stdout: said }; }
  const text = parts.join('\n');
  const count = st.text === text ? (st.count ?? 0) + 1 : 1;
  try { writeFileSync(file, JSON.stringify({ text, count, told: tell })); } catch { /* still refused */ }
  if (count > MAX_SENDS) return { code: 0, stdout: JSON.stringify({ systemMessage: [`git-guard refused the end of this session ${MAX_SENDS} times; it ends here for you to decide.\n${text}`, ...notes].join('\n') }) };
  return { code: 2, stderr: `git-guard: ${[text, ...notes].join('\n')}\n` };
}
