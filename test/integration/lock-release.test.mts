// KWB-25: a kit lock left by a session that is gone could only be released by an rm by hand. `claude-packs lock status`
// shows each checkout's lock (holder, branch, since, live or not); `lock release` takes away the caller's own lock or one
// whose lease is stale (KWB-29: 30 min without renewal), and refuses another live lease unless --force.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { CLI, assert, existsSync, join, readFileSync, spawnSync, test, writeFileSync } from '../kit-cli.mts';
import type { Payload, Spawned } from '../kit-cli.mts';

const HOOK = fileURLToPath(new URL('../../.claude/hooks/kit-lock.mjs', import.meta.url));
const LOCK = '.claude-packs-lock';

interface Lease { holder: { session: string; pid: number | null }; branch: string; started_at: string; last_seen: string }

function repo(): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'klr-')));
  execFileSync('git', ['init', '-q', '-b', 'work/x', root]);
  return root;
}
// home: a ~/.claude with no transcripts, so liveness is the lease alone
const home = (): string => { const h = realpathSync(mkdtempSync(join(tmpdir(), 'klr-home-'))); mkdirSync(join(h, '.claude/projects/p'), { recursive: true }); return h; };
const cli = (root: string, h: string, session: string, ...args: string[]): Spawned =>
  spawnSync('node', [CLI, 'lock', ...args, '--dir', root], { encoding: 'utf8', env: { ...process.env, HOME: h, CLAUDE_CODE_SESSION_ID: session } });
const ago = (min: number): string => new Date(Date.now() - min * 60000).toISOString();
const lockOf = (session: string, seenAgoMin: number, branch = 'work/0.9.0-k1'): string =>
  JSON.stringify({ version: 2, holder: { session, pid: null }, branch, started_at: '2026-11-03T10:00:00Z', last_seen: ago(seenAgoMin) });

test('lock status names the holder, the branch, the start, the last renewal and whether the lease is live', () => {
  const root = repo();
  const h = home();
  assert.match(cli(root, h, 'me', 'status').stdout, /no kit lock/);
  writeFileSync(join(root, LOCK), lockOf('other', 2));
  const r = cli(root, h, 'me', 'status');
  assert.equal(r.status, 0);
  assert.match(r.stdout, /held by session other .*branch work\/0\.9\.0-k1.*held since 2026-11-03T10:00:00Z.*last seen \S+, 2 min ago, by its lease\): live/);
  writeFileSync(join(root, LOCK), lockOf('other', 45));
  assert.match(cli(root, h, 'me', 'status').stdout, /45 min ago, by its lease\): stale/);
});

test('lock release: its own lock and a stale lease go; another live lease stays unless --force', () => {
  const root = repo();
  const h = home();
  writeFileSync(join(root, LOCK), lockOf('me', 1));
  assert.equal(cli(root, h, 'me', 'release').status, 0);
  assert.ok(!existsSync(join(root, LOCK)), 'its own lock released');

  writeFileSync(join(root, LOCK), lockOf('gone', 31));
  const stale = cli(root, h, 'me', 'release');
  assert.equal(stale.status, 0);
  assert.match(stale.stdout, /released .*session gone.*stale/);
  assert.ok(!existsSync(join(root, LOCK)), 'a gone session\'s lock released');

  writeFileSync(join(root, LOCK), lockOf('other', 29));
  const refused = cli(root, h, 'me', 'release');
  assert.equal(refused.status, 1);
  assert.match(refused.stdout + refused.stderr, /session other is live .*--force/);
  assert.ok(existsSync(join(root, LOCK)), 'another live lease is kept');
  assert.equal(cli(root, h, 'me', 'release', '--force').status, 0);
  assert.ok(!existsSync(join(root, LOCK)), '--force releases it');
});

test('a lock in the old form (session, branch, time) is read: a session with a fresh transcript, or a subagent\'s, is live', () => {
  const root = repo();
  const h = home();
  writeFileSync(join(root, LOCK), JSON.stringify({ session: 'old-form', branch: 'work/0.8.0-build-sweep', time: '2026-11-01T09:00:00Z' }));
  assert.match(cli(root, h, 'me', 'status').stdout, /held by session old-form .*branch work\/0\.8\.0-build-sweep.*held since 2026-11-01T09:00:00Z.*stale/);
  writeFileSync(join(h, '.claude/projects/p/old-form.jsonl'), '{}\n');
  assert.match(cli(root, h, 'me', 'status').stdout, /by its transcript\): live/);
  assert.equal(cli(root, h, 'me', 'release').status, 1, 'its transcript was written just now: live');
  assert.ok(existsSync(join(root, LOCK)));
  // a lead whose hooks are not the kit's renews by its agents' work: their transcripts are under <session>/subagents/
  writeFileSync(join(root, LOCK), lockOf('lead', 40));
  mkdirSync(join(h, '.claude/projects/p/lead/subagents'), { recursive: true });
  writeFileSync(join(h, '.claude/projects/p/lead/subagents/agent-k3.jsonl'), '{}\n');
  assert.match(cli(root, h, 'me', 'status').stdout, /session lead .*by its transcript\): live/);
});

test('the kit-lock hook writes the extensible form and still reads both', () => {
  const root = repo();
  const fire = (session: string): Spawned => spawnSync('node', [HOOK], {
    cwd: root, encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: root, CLAUDE_PID: String(process.pid) },
    input: JSON.stringify({ session_id: session, cwd: root, tool_name: 'Write', tool_input: { file_path: join(root, 'a.mjs'), content: 'x' } }),
  });
  assert.equal(fire('me').status, 0);
  const lock = JSON.parse(readFileSync(join(root, LOCK), 'utf8')) as Lease;
  assert.equal(lock.holder.session, 'me');
  assert.equal(lock.holder.pid, process.pid);
  assert.equal(lock.branch, 'work/x');
  assert.ok(lock.started_at);
  assert.ok(lock.last_seen, 'and last_seen (KWB-29)');
  const commit = (session: string): Spawned => spawnSync('node', [HOOK], {
    cwd: root, encoding: 'utf8', env: { ...process.env, HOME: home(), CLAUDE_PROJECT_DIR: root },
    input: JSON.stringify({ session_id: session, cwd: root, tool_name: 'Bash', tool_input: { command: "git commit -m 'x'" } }),
  });
  assert.equal(commit('other').status, 2, 'another session\'s commit is refused by the new form');
  writeFileSync(join(root, LOCK), JSON.stringify({ session: 'old', branch: 'b', time: new Date().toISOString() }));
  assert.equal(commit('other').status, 2, 'and by the old form');
  assert.equal(commit('old').status, 0);
});

// The lease (KWB-29, KWB-30, STEP 2): started_at and last_seen, last_seen renewed at most once a minute by the
// holder's own hook calls; 30 minutes without renewal and the lock is stale, and the next session that starts work takes it
// over, the take-over logged (who held it, branch, since, last seen) in .claude/kit-lock.log; a lease renewed in the last 30
// minutes is never taken or deleted (`lock release --force` is the only way). kit-lock guards commits, merges and releases;
// a push of commits that exist passes whoever holds the lock. Each of (a) to (d) was seen red on 0.9.14.
const MIN = 60000;
const iso = (agoMin: number): string => new Date(Date.now() - agoMin * MIN).toISOString();
const lease = (session: string, seenAgoMin: number, startedAgoMin = seenAgoMin + 60, branch = 'work/0.9.0-other'): string =>
  JSON.stringify({ version: 2, holder: { session, pid: null }, branch, started_at: iso(startedAgoMin), last_seen: iso(seenAgoMin) });
const read = (root: string): Lease => JSON.parse(readFileSync(join(root, LOCK), 'utf8')) as Lease;
const fireIn = (root: string, h: string, session: string, payload: Payload): Spawned => spawnSync('node', [HOOK], {
  cwd: root, input: JSON.stringify({ session_id: session, cwd: root, ...payload }), env: { ...process.env, HOME: h, CLAUDE_PROJECT_DIR: root }, encoding: 'utf8',
});
const bash = (command: string): Payload => ({ tool_name: 'Bash', tool_input: { command } });

test('(a) a lease last seen 31 minutes ago is taken over by the next session\'s work, and the take-over is logged; 29 minutes is not', () => {
  const root = repo();
  const h = home();
  writeFileSync(join(root, LOCK), lease('gone', 31));
  const r = fireIn(root, h, 'me', bash("git commit -m 'x' -- a.txt"));
  assert.equal(r.status, 0, r.stderr);
  assert.equal(read(root).holder.session, 'me', 'the stale lease is now mine');
  const log = readFileSync(join(root, '.claude/kit-lock.log'), 'utf8');
  assert.match(log, /took over .*session gone.*branch work\/0\.9\.0-other.*held since \d{4}-.*last seen \d{4}-.*31 min ago.* by session me/);

  const root2 = repo();
  writeFileSync(join(root2, LOCK), lease('busy', 29));
  const before = readFileSync(join(root2, LOCK), 'utf8');
  assert.equal(fireIn(root2, h, 'me', bash("git commit -m 'x' -- a.txt")).status, 2, 'a lease 29 minutes old holds');
  assert.equal(fireIn(root2, h, 'me', { tool_name: 'Write', tool_input: { file_path: join(root2, 'a.txt'), content: 'y' } }).status, 0, 'an edit passes');
  assert.equal(readFileSync(join(root2, LOCK), 'utf8'), before, 'and the live lease is untouched');
  assert.ok(!existsSync(join(root2, '.claude/kit-lock.log')), 'nothing taken over');
  assert.equal(fireIn(root2, h, 'me', bash(`rm ${LOCK}`)).status, 2, 'a live lease is never deleted by another session');
  const rel = cli(root2, h, 'me', 'release');
  assert.equal(rel.status, 1);
  assert.match(rel.stdout, /--force is the only way/);
  assert.ok(existsSync(join(root2, LOCK)));
});

test('(b) the holder\'s own activity renews last_seen, at most once a minute', () => {
  const root = repo();
  const h = home();
  const readA: Payload = { tool_name: 'Read', tool_input: { file_path: join(root, 'a.txt') } };
  writeFileSync(join(root, LOCK), lease('me', 2));
  assert.equal(fireIn(root, h, 'me', readA).status, 0);
  const seen = Date.parse(read(root).last_seen);
  assert.ok(Date.now() - seen < MIN, `a read renews a lease last seen 2 min ago (last_seen ${read(root).last_seen})`);
  assert.ok(read(root).started_at, 'started_at is kept');
  writeFileSync(join(root, LOCK), lease('me', 0.2));
  const before = read(root).last_seen;
  fireIn(root, h, 'me', readA);
  assert.equal(read(root).last_seen, before, 'renewed 12 s ago: not written again');
  writeFileSync(join(root, LOCK), lease('other', 2));
  const theirs = read(root).last_seen;
  fireIn(root, h, 'me', readA);
  assert.equal(read(root).last_seen, theirs, 'another session\'s activity never renews a lease it does not hold');
});

test('(c) nothing prints "since undefined": a lock with no start reads "start unknown"; every writer sets started_at and last_seen', () => {
  const root = repo();
  const h = home();
  writeFileSync(join(root, LOCK), JSON.stringify({ session: 'old', branch: 'work/0.8.0-build-sweep', last_seen: iso(1) }));
  const st = cli(root, h, 'me', 'status');
  assert.doesNotMatch(st.stdout, /undefined|since \?/);
  assert.match(st.stdout, /start unknown/);
  assert.match(st.stdout, /last seen \d{4}-.*live/);
  const r = fireIn(root, h, 'me', bash('git merge work/x'));
  assert.equal(r.status, 2);
  assert.doesNotMatch(r.stderr, /undefined/);
  assert.match(r.stderr, /start unknown/);

  writeFileSync(join(root, LOCK), JSON.stringify({ session: 'older' }));
  assert.doesNotMatch(cli(root, h, 'me', 'status').stdout, /undefined/);

  const fresh = repo();
  assert.equal(fireIn(fresh, h, 'me', { tool_name: 'Write', tool_input: { file_path: join(fresh, 'a.txt'), content: 'y' } }).status, 0);
  const lock = read(fresh);
  assert.ok(lock.started_at && lock.last_seen, 'the hook writes both');
  const fresh2 = repo();
  assert.equal(cli(fresh2, h, 'me', 'take').status, 0);
  assert.ok(read(fresh2).started_at && read(fresh2).last_seen, '`lock take` writes both');
});

test('(d) a push of committed branches passes while another live session holds the lock; a commit, a merge and a release are refused', () => {
  const root = repo();
  const h = home();
  writeFileSync(join(root, LOCK), lease('other', 1));
  const push = 'source ~/.env && git push -q https://x-access-token:$PERSONAL_GITHUB_TOKEN@github.com/TheDecipherist/claude-packs.git work/a work/b';
  for (const cmd of [push, `${push} 2>&1 | tee push.log`, `git -C ${root} push origin work/a`, 'git status && git log --oneline -3']) {
    const r = fireIn(root, h, 'me', bash(cmd));
    assert.equal(r.status, 0, `passes: ${cmd}\n${r.stderr}`);
  }
  for (const cmd of ["git commit -m 'x' -- a.txt", "git add a.txt && git commit -m 'a && b'", 'git switch main && git merge --ff-only work/a', 'git pull origin main',
    'git tag v0.9.15', 'npm version 0.9.15 --no-git-tag-version', 'npm publish', 'npm pack', `cd ${root} && git cherry-pick abc123`]) {
    const r = fireIn(root, h, 'me', bash(cmd));
    assert.equal(r.status, 2, `refused: ${cmd}`);
    assert.match(r.stderr, /BLOCKED by kit-lock/);
  }
  assert.equal(fireIn(root, h, 'other', bash("git commit -m 'x' -- a.txt")).status, 0, 'the holder commits');
  assert.equal(fireIn(root, h, 'me', bash('cd /tmp && git commit -m x')).status, 0, 'a commit in another repo is not judged');
});
