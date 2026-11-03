// KWB-25: a kit lock left by a session that is gone could only be released by an rm by hand. `claude-packs lock status`
// shows each checkout's lock (holder, branch, since, live or not); `lock release` takes away the caller's own lock or one
// whose session is gone, and refuses another live session's lock unless --force.
import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../bin/claude-packs.mjs', import.meta.url));
const HOOK = fileURLToPath(new URL('../.claude/hooks/kit-lock.mjs', import.meta.url));
const LOCK = '.claude-packs-lock';

function repo() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'klr-')));
  execFileSync('git', ['init', '-q', '-b', 'work/x', root]);
  return root;
}
// home: a ~/.claude with no transcripts, so liveness is the holder's pid alone
const home = () => { const h = realpathSync(mkdtempSync(join(tmpdir(), 'klr-home-'))); mkdirSync(join(h, '.claude/projects/p'), { recursive: true }); return h; };
const cli = (root, h, session, ...args) => spawnSync('node', [CLI, 'lock', ...args, '--dir', root], { encoding: 'utf8', env: { ...process.env, HOME: h, CLAUDE_CODE_SESSION_ID: session } });
const lockOf = (session, pid, branch = 'work/0.9.0-k1') => JSON.stringify({ version: 1, holder: { session, pid }, branch, started_at: '2026-11-03T10:00:00Z' });
const deadPid = () => { const c = spawnSync('node', ['-e', 'process.stdout.write(String(process.pid))'], { encoding: 'utf8' }); return Number(c.stdout); };

test('lock status names the holder, the branch, the start and whether the session is live', () => {
  const root = repo();
  const h = home();
  assert.match(cli(root, h, 'me', 'status').stdout, /no kit lock/);
  writeFileSync(join(root, LOCK), lockOf('other', process.pid));
  const r = cli(root, h, 'me', 'status');
  assert.equal(r.status, 0);
  assert.match(r.stdout, /held by session other .*branch work\/0\.9\.0-k1.*since 2026-11-03T10:00:00Z.*live \(pid \d+ runs\)/);
});

test('lock release: its own lock and a gone session\'s lock go; another live session\'s stays unless --force', () => {
  const root = repo();
  const h = home();
  writeFileSync(join(root, LOCK), lockOf('me', deadPid()));
  assert.equal(cli(root, h, 'me', 'release').status, 0);
  assert.ok(!existsSync(join(root, LOCK)), 'its own lock released');

  writeFileSync(join(root, LOCK), lockOf('gone', deadPid()));
  const stale = cli(root, h, 'me', 'release');
  assert.equal(stale.status, 0);
  assert.match(stale.stdout, /released .*session gone.*not live/);
  assert.ok(!existsSync(join(root, LOCK)), 'a gone session\'s lock released');

  const live = spawn('node', ['-e', 'setTimeout(() => {}, 60000)']);
  try {
    writeFileSync(join(root, LOCK), lockOf('other', live.pid));
    const refused = cli(root, h, 'me', 'release');
    assert.equal(refused.status, 1);
    assert.match(refused.stdout + refused.stderr, /session other is live .*--force/);
    assert.ok(existsSync(join(root, LOCK)), 'another live session keeps its lock');
    assert.equal(cli(root, h, 'me', 'release', '--force').status, 0);
    assert.ok(!existsSync(join(root, LOCK)), '--force releases it');
  } finally {
    live.kill();
  }
});

test('a lock in the old form (session, branch, time) is read: a session with a fresh transcript is live', () => {
  const root = repo();
  const h = home();
  writeFileSync(join(root, LOCK), JSON.stringify({ session: 'old-form', branch: 'work/0.8.0-build-sweep', time: '2026-11-01T09:00:00Z' }));
  assert.match(cli(root, h, 'me', 'status').stdout, /held by session old-form .*branch work\/0\.8\.0-build-sweep.*since 2026-11-01T09:00:00Z.*not live/);
  writeFileSync(join(h, '.claude/projects/p/old-form.jsonl'), '{}\n');
  assert.equal(cli(root, h, 'me', 'release').status, 1, 'its transcript was written just now: live');
  assert.ok(existsSync(join(root, LOCK)));
});

test('the kit-lock hook writes the extensible form and still reads both', () => {
  const root = repo();
  const fire = (session) => spawnSync('node', [HOOK], { cwd: root, input: JSON.stringify({ session_id: session, cwd: root, tool_name: 'Write', tool_input: { file_path: join(root, 'a.mjs'), content: 'x' } }), env: { ...process.env, CLAUDE_PROJECT_DIR: root, CLAUDE_PID: String(process.pid) }, encoding: 'utf8' });
  assert.equal(fire('me').status, 0);
  const lock = JSON.parse(readFileSync(join(root, LOCK), 'utf8'));
  assert.equal(lock.holder.session, 'me');
  assert.equal(lock.holder.pid, process.pid);
  assert.equal(lock.branch, 'work/x');
  assert.ok(lock.started_at);
  assert.equal(fire('other').status, 2, 'another session is refused by the new form');
  writeFileSync(join(root, LOCK), JSON.stringify({ session: 'old', branch: 'b', time: 't' }));
  assert.equal(fire('other').status, 2, 'and by the old form');
  assert.equal(fire('old').status, 0);
});
