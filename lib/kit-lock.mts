// The kit lock (.claude-packs-lock at a checkout's root of the claude-packs repo; the repo's own .claude/hooks/kit-lock.mts
// takes it, renews it, and refuses another session's commits, merges and releases). Here: its one format, the lease, and
// `claude-packs lock status|take|release` (KWB-25: a lock left by a gone session could only be released by an rm by hand).
//   The form: { version: 2, holder: { session, pid }, branch, started_at, last_seen }, with the old keys session and time beside
//   them so an older kit-lock reads it. The old forms { session, branch, time } and { session, branch } are read too.
//   The lock is a LEASE (KWB-29): its holder's hook renews last_seen at most once a minute (RENEW_MS) on every
//   tool call; a holder whose session runs outside the kit (a Stellix lead and its agents, whose hooks are Stellix's) renews it
//   by working: its transcript, or a subagent's, written later than last_seen counts as seen. No renewal for LEASE_MIN minutes
//   and the lease is stale: the next session that starts work takes it over, logged in the main checkout's .claude/kit-lock.log
//   (who held it, branch, since, last seen). A live lease is never taken or deleted; `lock release --force` is the only way.
//   lock status                     each checkout's lock: holder, branch, held since, last seen, live or stale
//   lock take [--branch <b>]        take it for CLAUDE_CODE_SESSION_ID (a session whose own hooks are not the kit's)
//   lock release [--force]          the caller's own lock and stale ones go; another live lease stays (exit 1) unless --force
import { appendFileSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { gitOut } from '../packs/base/hooks/lib/git-run.mts';
import { readJson, toJson } from '../packs/base/hooks/lib/json.mts';
import type { Logger } from '../packs/base/hooks/lib/types.d.mts';

export const LOCK = '.claude-packs-lock';
export const LOG = join('.claude', 'kit-lock.log');
export const LEASE_MIN = 30;
export const RENEW_MS = 60000;

/** The lease as read from any of its forms; a time the lock lacks is null, never undefined. */
export interface Lease { session: string; pid: number | null; branch: string; startedAt: string | null; lastSeen: string | null }
/** Whether a lease's holder is still working, when it was last seen and why that is known. */
export interface Liveness { live: boolean; seenAt: number | null; why: string }
/** A lease another session holds, where, and how live. */
export interface Held { lock: Lease; where: string; l: Liveness }
export type Acquired = { mine: string } | { held: Held } | { took: Lease };

// The file as written over the years: every key optional, read for what it holds.
interface LeaseFile { holder?: { session?: string; pid?: number | null }; session?: string; branch?: string; started_at?: string; time?: string; last_seen?: string }

const git = (cwd: string, ...args: string[]): string => gitOut(args, { cwd, env: process.env }) ?? '';
const branchOf = (dir: string): string => git(dir, 'symbolic-ref', '--short', 'HEAD') || git(dir, 'rev-parse', '--abbrev-ref', 'HEAD') || '?';
const ms = (t: string | null | undefined): number | null => { const v = Date.parse(t ?? ''); return Number.isFinite(v) ? v : null; };
const sessionPid = (): number | null => Number(process.env.CLAUDE_PID) || null;

/** Every checkout of the repo `root` is in: the main one first, then each worktree. */
export function checkouts(root: string): string[] {
  const out = git(root, 'worktree', 'list', '--porcelain').split('\n').filter((l) => l.startsWith('worktree ')).map((l) => l.slice(9));
  return out.length ? out : [root];
}

/** The lease in a checkout, from any form, or null when there is none (lib/manifest.mjs's readLock reads the install lock). */
export function readLease(dir: string): Lease | null {
  const raw = readJson<LeaseFile>(join(dir, LOCK));
  if (!raw || typeof raw !== 'object') return null;
  const startedAt = ms(raw.started_at) !== null ? raw.started_at ?? null : ms(raw.time) !== null ? raw.time ?? null : null;
  return {
    session: raw.holder?.session ?? raw.session ?? 'unknown', pid: raw.holder?.pid ?? null, branch: raw.branch ?? '?',
    startedAt, lastSeen: ms(raw.last_seen) !== null ? raw.last_seen ?? null : startedAt,
  };
}

const write = (dir: string, l: Lease): void => writeFileSync(join(dir, LOCK), `${toJson({ version: 2, holder: { session: l.session, pid: l.pid },
  branch: l.branch, started_at: l.startedAt, last_seen: l.lastSeen, session: l.session, time: l.startedAt }, { pretty: true })}\n`);

export function takeLock(root: string, session: string, branch: string = branchOf(root), pid: number | null = sessionPid(), now: number = Date.now()): Lease {
  const at = new Date(now).toISOString();
  const lock: Lease = { session, pid, branch, startedAt: at, lastSeen: at };
  write(root, lock);
  return lock;
}

/** The holder's heartbeat: each checkout's lock held by `session` gets last_seen = now, when it is RENEW_MS old or more. */
export function renew(dirs: readonly string[], session: string, now: number = Date.now()): boolean {
  let renewed = false;
  for (const d of dirs) {
    const l = readLease(d);
    const seen = ms(l?.lastSeen);
    if (!l || l.session !== session || (seen !== null && now - seen < RENEW_MS)) continue;
    write(d, { ...l, startedAt: l.startedAt ?? new Date(now).toISOString(), lastSeen: new Date(now).toISOString() });
    renewed = true;
  }
  return renewed;
}

/** The latest write of the session's transcript or one of its subagents' (~/.claude/projects/<p>/<session>[.jsonl|/subagents/]). */
export function transcriptSeen(session: string, home: string = homedir()): number | null {
  const projects = join(home, '.claude', 'projects');
  let latest: number | null = null;
  const see = (f: string): void => { try { latest = Math.max(latest ?? 0, statSync(f).mtimeMs); } catch { /* none */ } };
  const list = (dir: string): string[] => { try { return readdirSync(dir); } catch { return []; } };
  for (const d of list(projects)) {
    see(join(projects, d, `${session}.jsonl`));
    const sub = join(projects, d, session, 'subagents');
    for (const f of list(sub)) if (f.endsWith('.jsonl')) see(join(sub, f));
  }
  return latest;
}

export function liveness(lock: Lease, home: string = homedir(), now: number = Date.now()): Liveness {
  const lease = ms(lock.lastSeen);
  const t = transcriptSeen(lock.session, home);
  const seenAt = Math.max(lease ?? -Infinity, t ?? -Infinity);
  if (!Number.isFinite(seenAt)) return { live: false, seenAt: null, why: 'never seen (no last_seen, no transcript)' };
  const age = (now - seenAt) / 60000;
  const by = t !== null && (lease === null || t > lease) ? 'its transcript' : 'its lease';
  return { live: age < LEASE_MIN, seenAt, why: `last seen ${new Date(seenAt).toISOString()}, ${age.toFixed(0)} min ago, by ${by}` };
}

export const describe = (lock: Lease, l: Liveness): string => `held by session ${lock.session} (branch ${lock.branch}, held since ${lock.startedAt ?? 'start unknown'}; ${l.why}): ` +
  (l.live ? 'live' : `stale (no renewal for ${LEASE_MIN} min)`);

/** A stale lease out, the taker's in, the take-over logged in the main checkout's .claude/kit-lock.log. */
export function takeOver(root: string, where: string, lock: Lease, l: Liveness, session: string, now: number = Date.now()): void {
  const main = checkouts(root)[0] ?? root;
  mkdirSync(join(main, '.claude'), { recursive: true });
  appendFileSync(join(main, LOG), `${new Date(now).toISOString()} took over ${join(where, LOCK)}: ${describe(lock, l)}; by session ${session}\n`);
  rmSync(join(where, LOCK), { force: true });
}

/** The lock for `session` in checkout `dir`: its own already, none (taken), or a stale one (taken over). Another live lease:
 *  { held } and nothing is changed. */
export function acquire(dir: string, session: string, { home = homedir(), now = Date.now(), branch }: { home?: string; now?: number; branch?: string } = {}): Acquired {
  const locks = checkouts(dir).flatMap((where) => { const lock = readLease(where); return lock ? [{ where, lock }] : []; });
  const mine = locks.find((x) => x.lock.session === session);
  if (mine) return { mine: mine.where };
  // The same claude process under a new session id (a reload) is its own holder, never another session (KWB-40).
  const pid = sessionPid();
  const own = pid ? locks.find((x) => x.lock.pid === pid) : undefined;
  if (own) { takeLock(own.where, session, own.lock.branch, pid, now); return { mine: own.where }; }
  const others = locks.map((x) => ({ ...x, l: liveness(x.lock, home, now) }));
  const live = others.find((x) => x.l.live);
  if (live) return { held: live };
  for (const x of others) takeOver(dir, x.where, x.lock, x.l, session, now);
  return { took: takeLock(dir, session, branch ?? branchOf(dir), undefined, now) };
}

export interface LockCommandOptions { force?: boolean; branch?: string; session?: string | null; home?: string; log?: Logger }

export function lockCommand(sub: string, dir: string,
  { force = false, branch, session = process.env.CLAUDE_CODE_SESSION_ID ?? null, home = homedir(), log = console.log }: LockCommandOptions = {}): number {
  if (!['status', 'take', 'release'].includes(sub)) throw new Error('use `lock status`, `lock take [--branch <b>]` or `lock release [--force]`');
  if (sub === 'take') {
    if (!session) { log('no CLAUDE_CODE_SESSION_ID: run it from the session that takes the lock'); return 1; }
    const r = acquire(dir, session, { home, ...(branch ? { branch } : {}) });
    if ('held' in r) { log(`kept ${join(r.held.where, LOCK)}: ${describe(r.held.lock, r.held.l)}. Ask the user; --force on release is the only way to remove a live lease`); return 1; }
    log('mine' in r ? `already yours: ${join(r.mine, LOCK)}` : `took ${join(dir, LOCK)} for session ${session} (branch ${r.took.branch})`);
    return 0;
  }
  let code = 0;
  let any = false;
  for (const c of checkouts(dir)) {
    const lock = readLease(c);
    if (!lock) continue;
    any = true;
    const l = liveness(lock, home);
    const where = join(c, LOCK);
    if (sub === 'status') { log(`${where}: ${describe(lock, l)}`); continue; }
    const mine = session !== null && lock.session === session;
    if (mine || !l.live || force) {
      if (!mine && !l.live) takeOver(dir, c, lock, l, `${session ?? 'unknown'} (lock release)`);
      rmSync(where, { force: true });
      log(`released ${where}: ${describe(lock, l)}${mine ? ' (your own)' : !l.live ? '' : ' (--force)'}`);
    } else {
      log(`kept ${where}: session ${lock.session} is live (${l.why}). It is another session's lease: wait for its release or for it to go stale (${LEASE_MIN} min without renewal), or ask the user; --force is the only way to release a live lease`);
      code = 1;
    }
  }
  if (!any) log('no kit lock in any checkout');
  return code;
}
