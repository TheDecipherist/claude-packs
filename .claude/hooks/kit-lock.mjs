#!/usr/bin/env node
// kit-lock: one session lands work on claude-packs at a time (2026-10-31: two sessions released 0.6.0 at once, each on its
// own line, and main took one while the other waited to merge).
//   .claude-packs-lock at a checkout's root is a LEASE (lib/kit-lock.mjs; KWB-29): started_at and last_seen. This hook runs on
//   every tool call (PreToolUse "*"):
//   - the holder's call renews its last_seen, at most once a minute (lib/kit-lock.mjs renew);
//   - a session's first write or guarded action inside any checkout of this repo takes the lock when nobody holds it, or
//     takes over a stale one (30 min without renewal), logged in .claude/kit-lock.log;
//   - while ANOTHER session's live lease is in any checkout, it refuses that session's commits, merges and releases
//     (git commit, merge, pull, cherry-pick, revert, am, rebase, tag <name>; npm version, publish, pack) and any write
//     that removes the lease. Editing files passes, and so does a push: it only sends commits that exist (KWB-30).
// This hook is the claude-packs repo's own (its committed .claude/settings.json), not part of any pack.
//   node .claude/hooks/kit-lock.mjs take <session> [branch]   take the lock by hand (a session with no hook yet)
//   node .claude/hooks/kit-lock.mjs --selftest
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, normalize, relative, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writesOf } from '../../packs/base/hooks/lib/writes.mjs';
// the lock's one format and lease, read in every form (lib/kit-lock.mjs; `claude-packs lock status|take|release`, KWB-25)
import { acquire, checkouts, describe, LOCK, LEASE_MIN, readLock, renew, takeLock as take } from '../../lib/kit-lock.mjs';

export { checkouts, LOCK, take };

const inside = (dir, path) => { const r = relative(dir, path); return r === '' || (!r.startsWith('..') && !isAbsolute(r)); };
const expand = (p) => p.replace(/^\$HOME(?=\/|$)/, '~').replace(/^~(?=\/|$)/, homedir());
const GIT_LANDS = new Set(['commit', 'merge', 'pull', 'cherry-pick', 'revert', 'am', 'rebase']);
const NPM_RELEASE = new Set(['version', 'publish', 'pack']);
// git's subcommand: the first word after git that is not an option (-C <dir> and -c <key=value> take one more)
const subAt = (w) => { let i = 1; while (i < w.length && w[i].startsWith('-')) i += ['-C', '-c', '--git-dir', '--work-tree'].includes(w[i]) ? 2 : 1; return i; };

// The first command in a shell line that lands work (a commit, a merge, a release step) in a folder `ours` accepts, or null.
export function guardedAction(command, cwd, ours) {
  let body = command.replace(/<<-?\s*['"]?(\w+)['"]?[\s\S]*?\n\1\b/g, '');
  body = body.replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, "''");
  let here = cwd;
  for (const part of body.split(/&&|\|\||;|\||\n|\(|\)|`|\$\(/)) {
    let w = part.trim().split(/\s+/).filter(Boolean);
    if (w.length >= 2 && ['cd', 'pushd'].includes(w[0]) && w[1] !== "''") { here = normalize(resolve(here, expand(w[1]))); continue; }
    while (w.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0]) || ['env', 'command', 'time', 'nohup', 'exec'].includes(w[0]))) w = w.slice(1);
    if (!w.length) continue;
    const tool = w[0].split('/').pop();
    let dir = here;
    let act = null;
    if (tool === 'git') {
      const c = w.indexOf('-C');
      if (c > 0 && c < subAt(w)) dir = normalize(resolve(here, expand(w[c + 1] ?? '.')));
      const i = subAt(w);
      const rest = w.slice(i + 1);
      if (GIT_LANDS.has(w[i])) act = `git ${w[i]}`;
      else if (w[i] === 'tag' && rest.some((a) => !a.startsWith('-')) && !rest.some((a) => ['-l', '--list', '-d', '--delete', '-v', '--verify'].includes(a))) act = 'git tag';
    } else if (tool === 'npm' && NPM_RELEASE.has(w[1])) act = `npm ${w[1]}`;
    if (act && ours(dir)) return act;
  }
  return null;
}

// null when the call may go ahead; else { lock, where, l, action }: the other session's live lease and what it holds off.
export function verdict(payload, root, { home = homedir(), now = Date.now() } = {}) {
  const all = checkouts(root);
  const session = payload.session_id ?? 'unknown';
  renew(all, session, now);
  const cwd = payload.cwd ?? root;
  const ours = (p) => all.some((c) => inside(c, p));
  const writes = writesOf(payload, cwd).filter((w) => ours(w.path));
  const action = payload.tool_name === 'Bash' ? guardedAction(payload.tool_input?.command ?? '', cwd, ours) : null;
  if (!writes.length && !action) return null;
  const here = all.filter((c) => inside(c, cwd)).sort((a, b) => b.length - a.length)[0] ?? root;
  const r = acquire(here, session, { home, now });
  if (!r.held) return null;
  const lease = join(r.held.where, LOCK);
  if (action) return { ...r.held, action: `\`${action}\`` };
  if (writes.some((w) => w.path === lease)) return { ...r.held, action: 'removing or changing its lease' };
  return null; // an edit passes; the lease stays the other session's
}

function main(text) {
  let payload;
  try { payload = JSON.parse(text); } catch { return 0; }
  const root = resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
  const v = verdict(payload, root);
  if (!v) return 0;
  process.stderr.write(
    `BLOCKED by kit-lock: another session holds the kit lock (session ${v.lock.session}, branch ${v.lock.branch}, held since ${v.lock.startedAt ?? 'start unknown'}; ` +
      `${v.l.why}: live; lease in ${join(v.where, LOCK)}). It guards commits, merges and releases, so ${v.action} waits; editing files and ` +
      `pushing commits that exist pass. The lease goes stale ${LEASE_MIN} min after its holder's last renewal, and then your next commit takes ` +
      'it over (logged). Wait, or ask the user; never delete a live lease (`node bin/claude-packs.mjs lock release --force` is the only way).\n',
  );
  return 2;
}

function selftest() {
  const tmp = execFileSync('mktemp', ['-d'], { encoding: 'utf8' }).trim();
  const root = execFileSync('realpath', [tmp], { encoding: 'utf8' }).trim();
  const home = join(root, '.home');
  execFileSync('git', ['init', '-q', '-b', 'work/x', root]);
  const W = (session) => ({ session_id: session, tool_name: 'Write', tool_input: { file_path: join(root, 'lib/a.mjs'), content: 'x' } });
  const B = (session, command) => ({ session_id: session, cwd: root, tool_name: 'Bash', tool_input: { command } });
  const at = (min) => new Date(Date.now() - min * 60000).toISOString();
  const other = (seen) => writeFileSync(join(root, LOCK), JSON.stringify({ version: 2, holder: { session: 'other' }, branch: 'work/y', started_at: at(90), last_seen: at(seen) }));
  const v = (p) => verdict(p, root, { home });
  const cases = [];
  cases.push(['no lock: allowed', v(W('me')) === null]);
  cases.push(['starting work writes the lease', readLock(root)?.session === 'me' && !!readLock(root)?.lastSeen]);
  cases.push(['its own lock: allowed', v(B('me', "git commit -m 'x'")) === null]);
  other(1);
  cases.push(['another live lease: a commit refused', v(B('me', "git commit -m 'x'")) !== null]);
  cases.push(['another live lease: a merge refused', v(B('me', 'git merge work/z')) !== null]);
  cases.push(['another live lease: an edit passes', v(W('me')) === null && readLock(root).session === 'other']);
  cases.push(['another live lease: a push passes (KWB-30)', v(B('me', 'git push origin work/a 2>&1 | tee push.log')) === null]);
  cases.push(['another live lease: never removed', v(B('me', `rm ${LOCK}`)) !== null]);
  cases.push(['a read is no write', v({ session_id: 'me', tool_name: 'Bash', tool_input: { command: 'ls; git status' } }) === null]);
  cases.push(['outside the repo: not judged', v({ session_id: 'me', tool_name: 'Write', tool_input: { file_path: '/elsewhere/a.txt' } }) === null]);
  other(31);
  cases.push(['a stale lease (31 min) is taken over (KWB-29)', v(B('me', "git commit -m 'x'")) === null && readLock(root).session === 'me']);
  cases.push(['and the take-over logged', /took over .*session other/.test(readFileSync(join(root, '.claude/kit-lock.log'), 'utf8'))]);
  other(1);
  // settings.json runs kit-lock inside run-hooks.mjs (KWB-26): it must refuse there too, not fail as exit 1
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('../../packs/base/hooks/run-hooks.mjs', import.meta.url)), fileURLToPath(import.meta.url)], {
    input: JSON.stringify(B('me', "git commit -m 'x'")), encoding: 'utf8', env: { ...process.env, HOME: home, CLAUDE_PROJECT_DIR: root },
  });
  cases.push(['through run-hooks: another session\'s commit refused', r.status === 2 && r.stderr.includes('BLOCKED by kit-lock')]);
  const bad = cases.filter(([, ok]) => !ok);
  for (const [name] of bad) console.error(`kit-lock selftest FAILED: ${name}`);
  execFileSync('rm', ['-rf', root]);
  console.log(`kit-lock selftest: ${bad.length ? 'FAIL' : 'OK'} (${cases.length} cases)`);
  return bad.length ? 1 : 0;
}

export const hook = main; // settings.json runs it inside run-hooks.mjs (KWB-26)

const real = (p) => { try { return realpathSync(p); } catch { return resolve(p); } };
if (process.argv[1] && real(process.argv[1]) === real(fileURLToPath(import.meta.url))) {
  const [cmd, session, branch] = process.argv.slice(2);
  if (cmd === '--selftest') process.exit(selftest());
  else if (cmd === 'take') {
    const r = acquire(resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd()), session, { branch });
    if (r.held) { console.error(`kept ${join(r.held.where, LOCK)}: ${describe(r.held.lock, r.held.l)}`); process.exit(1); }
    console.log(JSON.stringify(readLock(r.mine ?? resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd()))));
    process.exit(0);
  } else { let text = ''; try { text = readFileSync(0, 'utf8'); } catch { /* no stdin */ } process.exit(main(text)); }
}
