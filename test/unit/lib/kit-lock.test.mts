// lib/kit-lock.mts: the lease in its forms, its renewal, who is live, the take-over, and `lock status|take|release`. No git:
// a folder that is not a repo is its own one checkout.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { LEASE_MIN, LOCK, LOG, RENEW_MS, acquire, liveness, lockCommand, readLease, renew, takeLock, transcriptSeen } from '../../../lib/kit-lock.mts';
import { put, readText, scratchDir } from '../../../packs/base/hooks/lib/files.mts';

const NOW = Date.parse('2026-11-11T12:00:00Z');
const MIN = 60000;
const iso = (agoMin: number): string => new Date(NOW - agoMin * MIN).toISOString();
/** A repo-less checkout with a lease written in the current form, last seen `agoMin` ago. */
function held(session: string, agoMin: number): string {
  const dir = scratchDir('kitlock-');
  takeLock(dir, session, 'work/x', null, NOW - agoMin * MIN);
  return dir;
}
const noHome = (): string => scratchDir('kitlock-home-');

test('a lease is read from the current form and from both older ones, and a missing or broken file is none', () => {
  const dir = held('s1', 5);
  assert.deepEqual(readLease(dir), { session: 's1', pid: null, branch: 'work/x', startedAt: iso(5), lastSeen: iso(5) });
  const old = scratchDir('kitlock-old-');
  put(join(old, LOCK), JSON.stringify({ session: 's2', branch: 'b', time: iso(9) }));
  assert.deepEqual(readLease(old), { session: 's2', pid: null, branch: 'b', startedAt: iso(9), lastSeen: iso(9) });
  const oldest = scratchDir('kitlock-oldest-');
  put(join(oldest, LOCK), JSON.stringify({ session: 's3' }));
  assert.deepEqual(readLease(oldest), { session: 's3', pid: null, branch: '?', startedAt: null, lastSeen: null });
  const broken = scratchDir('kitlock-broken-');
  put(join(broken, LOCK), '{ half');
  assert.equal(readLease(broken), null);
  assert.equal(readLease(scratchDir('kitlock-none-')), null);
});

test('the holder renews at most once a minute, and only its own lease', () => {
  const dir = held('s1', 5);
  assert.equal(renew([dir], 'other', NOW), false, 'another session renews nothing');
  assert.equal(renew([dir], 's1', NOW), true);
  assert.equal(readLease(dir)?.lastSeen, iso(0));
  assert.equal(renew([dir], 's1', NOW + RENEW_MS - 1), false, 'again inside the minute: left alone');
  assert.equal(renew([dir], 's1', NOW + RENEW_MS), true);
});

test('liveness: a lease seen within the window is live, an older one stale, and one never seen is not live; a transcript counts as seen', () => {
  const home = noHome();
  assert.equal(liveness(readLease(held('s', LEASE_MIN - 1)) ?? fail(), home, NOW).live, true);
  const stale = liveness(readLease(held('s', LEASE_MIN + 1)) ?? fail(), home, NOW);
  assert.equal(stale.live, false);
  assert.match(stale.why, /by its lease/);
  assert.deepEqual(liveness({ session: 'z', pid: null, branch: '?', startedAt: null, lastSeen: null }, home, NOW), { live: false, seenAt: null, why: 'never seen (no last_seen, no transcript)' });
  put(join(home, '.claude/projects/p/s9.jsonl'), '{}\n');
  assert.ok(transcriptSeen('s9', home) !== null);
  assert.equal(transcriptSeen('nobody', home), null);
  const byTranscript = liveness({ session: 's9', pid: null, branch: 'b', startedAt: null, lastSeen: iso(90) }, home, Date.now());
  assert.equal(byTranscript.live, true);
  assert.match(byTranscript.why, /by its transcript/);
});

test('acquire: no lock is taken, one\'s own is kept, a live one is never taken, a stale one is taken over and logged', () => {
  const home = noHome();
  const free = scratchDir('kitlock-free-');
  const took = acquire(free, 'me', { home, now: NOW, branch: 'work/me' });
  assert.ok('took' in took && took.took.branch === 'work/me');
  assert.equal('mine' in acquire(free, 'me', { home, now: NOW }), true);
  const live = held('other', 1);
  const refused = acquire(live, 'me', { home, now: NOW });
  assert.ok('held' in refused && refused.held.lock.session === 'other');
  assert.equal(readLease(live)?.session, 'other', 'a live lease is not changed');
  const old = held('gone', LEASE_MIN + 10);
  const over = acquire(old, 'me', { home, now: NOW, branch: 'work/me' });
  assert.ok('took' in over);
  assert.equal(readLease(old)?.session, 'me');
  assert.match(readText(join(old, LOG)) ?? '', /took over .*held by session gone .*stale/);
});

test('lock status, take and release: a live lease of another survives release without --force, and a wrong subcommand throws', () => {
  const home = noHome();
  const dir = scratchDir('kitlock-cmd-');
  takeLock(dir, 'other', 'work/x', null);   // now: the command reads the real clock
  const said: string[] = [];
  const log = (l: string): void => { said.push(l); };
  assert.equal(lockCommand('status', dir, { session: 'me', home, log }), 0);
  assert.match(said.at(-1) ?? '', /held by session other .*live$/);
  assert.equal(lockCommand('take', dir, { session: 'me', home, log }), 1, 'a live lease is not taken');
  assert.equal(lockCommand('take', dir, { session: null, home, log }), 1);
  assert.match(said.at(-1) ?? '', /no CLAUDE_CODE_SESSION_ID/);
  assert.equal(lockCommand('release', dir, { session: 'me', home, log }), 1);
  assert.equal(existsSync(join(dir, LOCK)), true);
  assert.equal(lockCommand('release', dir, { session: 'me', home, log, force: true }), 0);
  assert.equal(existsSync(join(dir, LOCK)), false);
  assert.equal(lockCommand('release', dir, { session: 'me', home, log }), 0);
  assert.equal(said.at(-1), 'no kit lock in any checkout');
  assert.throws(() => lockCommand('steal', dir, { log }), /use `lock status`/);
});

function fail(): never { throw new Error('no lease'); }
