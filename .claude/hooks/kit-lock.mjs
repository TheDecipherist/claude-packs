#!/usr/bin/env node
// kit-lock: one session changes claude-packs at a time (2026-10-31: two sessions released 0.6.0 at once, each on its
// own line, and main took one while the other waited to merge).
//   .claude-packs-lock at a checkout's root: { "session", "branch", "time" }. A session that starts changing the kit
//   writes it (this hook does, on the session's first write) and commits it on its branch; the release merge removes it.
//   PreToolUse on every write route (Write, Edit, MultiEdit, NotebookEdit, Bash; the kit's own write reader): a write
//   inside any checkout of this repo is refused while ANOTHER session's lock is in any checkout of it (the main checkout
//   or a worktree). Its own lock, or none, lets the write through.
// This hook is the claude-packs repo's own (its committed .claude/settings.json), not part of any pack.
//   node .claude/hooks/kit-lock.mjs take <session> [branch]   take the lock by hand (a session with no hook yet)
//   node .claude/hooks/kit-lock.mjs --selftest
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writesOf } from '../../packs/base/hooks/lib/writes.mjs';

export const LOCK = '.claude-packs-lock';
const git = (cwd, ...a) => { try { return execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };

// Every checkout of the repo the project is in: the main one and each worktree.
export function checkouts(root) {
  const out = git(root, 'worktree', 'list', '--porcelain').split('\n').filter((l) => l.startsWith('worktree ')).map((l) => l.slice(9));
  return out.length ? out : [root];
}

const inside = (dir, path) => { const r = relative(dir, path); return r === '' || (!r.startsWith('..') && !isAbsolute(r)); };
const readLock = (dir) => { try { return JSON.parse(readFileSync(join(dir, LOCK), 'utf8')); } catch { return null; } };

export function take(root, session, branch = git(root, 'rev-parse', '--abbrev-ref', 'HEAD')) {
  const lock = { session, branch, time: new Date().toISOString() };
  writeFileSync(join(root, LOCK), `${JSON.stringify(lock, null, 2)}\n`);
  return lock;
}

// null when the call may go ahead; else the other session's lock and where it is.
export function verdict(payload, root) {
  const all = checkouts(root);
  const writes = writesOf(payload, payload.cwd ?? root).filter((w) => all.some((c) => inside(c, w.path)));
  if (!writes.length) return null;
  const session = payload.session_id ?? 'unknown';
  for (const c of all) {
    const lock = readLock(c);
    if (lock && lock.session !== session) return { lock, where: c };
  }
  if (!readLock(root)) take(root, session);
  return null;
}

function main() {
  let payload;
  try { payload = JSON.parse(readFileSync(0, 'utf8')); } catch { return 0; }
  const root = resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
  const v = verdict(payload, root);
  if (!v) return 0;
  process.stderr.write(
    `BLOCKED by kit-lock: another session is changing claude-packs (session ${v.lock.session}, branch ${v.lock.branch}, since ${v.lock.time}; ` +
      `lock in ${join(v.where, LOCK)}).\nOne session changes the kit at a time. Wait for its release merge (which removes the lock), ` +
      'or ask the user; never delete another session\'s lock.\n',
  );
  return 2;
}

function selftest() {
  const tmp = execFileSync('mktemp', ['-d'], { encoding: 'utf8' }).trim();
  const root = execFileSync('realpath', [tmp], { encoding: 'utf8' }).trim();
  execFileSync('git', ['init', '-q', '-b', 'work/x', root]);
  const W = (session) => ({ session_id: session, tool_name: 'Write', tool_input: { file_path: join(root, 'lib/a.mjs'), content: 'x' } });
  const cases = [];
  cases.push(['no lock: allowed', verdict(W('me'), root) === null]);
  cases.push(['starting work writes the lock', readLock(root)?.session === 'me']);
  cases.push(['its own lock: allowed', verdict(W('me'), root) === null]);
  writeFileSync(join(root, LOCK), JSON.stringify({ session: 'other', branch: 'work/y', time: 't' }));
  cases.push(['another session\'s lock: refused', verdict(W('me'), root) !== null]);
  cases.push(['a read is no write', verdict({ session_id: 'me', tool_name: 'Bash', tool_input: { command: 'ls; git status' } }, root) === null]);
  cases.push(['outside the repo: not judged', verdict({ session_id: 'me', tool_name: 'Write', tool_input: { file_path: '/elsewhere/a.txt' } }, root) === null]);
  const bad = cases.filter(([, ok]) => !ok);
  for (const [name] of bad) console.error(`kit-lock selftest FAILED: ${name}`);
  execFileSync('rm', ['-rf', root]);
  console.log(`kit-lock selftest: ${bad.length ? 'FAIL' : 'OK'} (${cases.length} cases)`);
  return bad.length ? 1 : 0;
}

const real = (p) => { try { return realpathSync(p); } catch { return resolve(p); } };
if (process.argv[1] && real(process.argv[1]) === real(fileURLToPath(import.meta.url))) {
  const [cmd, session, branch] = process.argv.slice(2);
  if (cmd === '--selftest') process.exit(selftest());
  else if (cmd === 'take') { console.log(JSON.stringify(take(resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd()), session, branch))); process.exit(0); }
  else process.exit(main());
}
