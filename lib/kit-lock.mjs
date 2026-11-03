// The kit lock (.claude-packs-lock at a checkout's root of the claude-packs repo; the repo's own .claude/hooks/kit-lock.mjs
// takes it and refuses another session's writes). Here: its one format and `claude-packs lock status|release` (KWB-25: a lock
// left by a session that was gone could only be released by an rm by hand).
//   The form (extensible; STEP 2 makes it a lease): { version, holder: { session, pid }, branch, started_at }, with the old
//   keys session and time beside them so an older kit-lock reads it. The old form { session, branch, time } is read too.
//   A holder is live when its pid runs, or when its session's transcript (~/.claude/projects/*/<session>.jsonl) was written in
//   the last LIVE_MIN minutes; neither: the lock is stale.
//   lock status                     each checkout's lock
//   lock release [--force]          the caller's own lock (CLAUDE_CODE_SESSION_ID) and stale ones go; another live session's
//                                   stays (exit 1) unless --force
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const LOCK = '.claude-packs-lock';
export const LIVE_MIN = 15;
const git = (cwd, ...a) => { try { return execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };

// Every checkout of the repo dir is in: the main one and each worktree.
export function checkouts(root) {
  const out = git(root, 'worktree', 'list', '--porcelain').split('\n').filter((l) => l.startsWith('worktree ')).map((l) => l.slice(9));
  return out.length ? out : [root];
}

// -> { session, pid, branch, startedAt } | null, from either form
export function readLock(dir) {
  let raw;
  try { raw = JSON.parse(readFileSync(join(dir, LOCK), 'utf8')); } catch { return null; }
  if (!raw || typeof raw !== 'object') return null;
  return { session: raw.holder?.session ?? raw.session ?? 'unknown', pid: raw.holder?.pid ?? null, branch: raw.branch ?? '?', startedAt: raw.started_at ?? raw.time ?? '?' };
}

export function takeLock(root, session, branch = git(root, 'symbolic-ref', '--short', 'HEAD') || git(root, 'rev-parse', '--abbrev-ref', 'HEAD'), pid = Number(process.env.CLAUDE_PID) || null) {
  const startedAt = new Date().toISOString();
  const lock = { version: 1, holder: { session, pid }, branch, started_at: startedAt, session, time: startedAt };
  writeFileSync(join(root, LOCK), `${JSON.stringify(lock, null, 2)}\n`);
  return lock;
}

const runs = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };

// -> { live, why }
export function liveness(lock, home = homedir(), now = Date.now()) {
  if (lock.pid && runs(lock.pid)) return { live: true, why: `pid ${lock.pid} runs` };
  const projects = join(home, '.claude', 'projects');
  let dirs = [];
  try { dirs = readdirSync(projects); } catch { /* no transcripts */ }
  for (const d of dirs) {
    try {
      const age = (now - statSync(join(projects, d, `${lock.session}.jsonl`)).mtimeMs) / 60000;
      if (age < LIVE_MIN) return { live: true, why: `its transcript was written ${age.toFixed(0)} min ago` };
    } catch { /* not this project */ }
  }
  return { live: false, why: `${lock.pid ? `pid ${lock.pid} is gone, ` : ''}no transcript written in the last ${LIVE_MIN} min` };
}

const describe = (lock, l) => `held by session ${lock.session} (branch ${lock.branch}, since ${lock.startedAt}): ${l.live ? `live (${l.why})` : `not live (${l.why})`}`;

export function lockCommand(sub, dir, { force = false, session = process.env.CLAUDE_CODE_SESSION_ID ?? null, home = homedir(), log = console.log } = {}) {
  if (!['status', 'release'].includes(sub)) throw new Error('use `lock status` or `lock release [--force]`');
  let code = 0;
  let any = false;
  for (const c of checkouts(dir)) {
    const lock = readLock(c);
    if (!lock) continue;
    any = true;
    const l = liveness(lock, home);
    const where = join(c, LOCK);
    if (sub === 'status') { log(`${where}: ${describe(lock, l)}`); continue; }
    const mine = session && lock.session === session;
    if (mine || !l.live || force) {
      rmSync(where, { force: true });
      log(`released ${where}: ${describe(lock, l)}${mine ? ' (your own)' : !l.live ? '' : ' (--force)'}`);
    } else {
      log(`kept ${where}: session ${lock.session} is live (${l.why}). It is another session's: wait for its release, or ask the user; --force releases it`);
      code = 1;
    }
  }
  if (!any) log('no kit lock in any checkout');
  return code;
}
