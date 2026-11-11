// One session lands work on claude-packs at a time: the repo's own kit-lock hook refuses a commit, merge or release while
// ANOTHER session's live .claude-packs-lock lease is in any checkout of the repo; every write route (an edit) passes and takes
// no lock then (KWB-30); its own lock, or none, lets everything through, and the first write takes the lock.
import { mkdirSync, mkdtempSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { assert, existsSync, git, join, readFileSync, spawnSync, test, writeFileSync } from '../kit-cli.mts';
import type { Payload, Spawned } from '../kit-cli.mts';

const HOOK = fileURLToPath(new URL('../../.claude/hooks/kit-lock.mjs', import.meta.url));

interface Lease { session?: string; branch?: string; time?: string; started_at?: string; last_seen?: string; holder: { session: string } }

function repo(): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'kl-')));
  git(root, 'init', '-q', '-b', 'main');
  mkdirSync(join(root, 'lib'));
  writeFileSync(join(root, 'lib/a.mjs'), 'PLACEHOLDER\n');
  writeFileSync(join(root, 'src.txt'), 'x\n');
  git(root, 'add', 'lib/a.mjs', 'src.txt');
  git(root, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'init');
  return root;
}

// HOME: a ~/.claude with no transcripts, so the lease alone says whether a holder is live
const HOME = realpathSync(mkdtempSync(join(tmpdir(), 'kl-home-')));
const fire = (root: string, session: string, payload: Payload): Spawned =>
  spawnSync('node', [HOOK], { cwd: root, input: JSON.stringify({ session_id: session, cwd: root, ...payload }), env: { ...process.env, HOME, CLAUDE_PROJECT_DIR: root }, encoding: 'utf8' });
const live = (session: string, branch: string): string =>
  JSON.stringify({ version: 2, holder: { session, pid: null }, branch, started_at: new Date().toISOString(), last_seen: new Date().toISOString() });
const commit: Payload = { tool_name: 'Bash', tool_input: { command: "git commit -m 'x' -- lib/a.mjs" } };
const leaseIn = (root: string): Lease => JSON.parse(readFileSync(join(root, '.claude-packs-lock'), 'utf8')) as Lease;

const routes = (root: string): Record<string, Payload> => {
  const f = join(root, 'lib/a.mjs');
  const bash = (command: string): Payload => ({ tool_name: 'Bash', tool_input: { command } });
  return {
    Write: { tool_name: 'Write', tool_input: { file_path: f, content: 'y' } },
    Edit: { tool_name: 'Edit', tool_input: { file_path: f, old_string: 'PLACEHOLDER', new_string: 'y' } },
    MultiEdit: { tool_name: 'MultiEdit', tool_input: { file_path: f, edits: [{ old_string: 'PLACEHOLDER', new_string: 'y' }] } },
    NotebookEdit: { tool_name: 'NotebookEdit', tool_input: { notebook_path: join(root, 'lib/n.ipynb'), new_source: 'y' } },
    'Bash >': bash(`cat src.txt > ${f}`), 'Bash >>': bash(`cat src.txt >> ${f}`), 'Bash tee': bash(`cat src.txt | tee ${f}`),
    'Bash sed -i': bash(`sed -i 's/PLACEHOLDER/y/' ${f}`), 'Bash cp': bash(`cp src.txt ${f}`), 'Bash mv': bash(`mv src.txt ${f}`),
    'Bash heredoc': bash(`cat > ${f} <<'EOF'\ny\nEOF`),
  };
};

test('another session\'s live lease refuses a commit, never an edit by any write route; its own lock and no lock let them through', () => {
  const root = repo();
  writeFileSync(join(root, '.claude-packs-lock'), live('other', 'work/other'));
  const refused = Object.entries(routes(root)).filter(([, p]) => fire(root, 'me', p).status !== 0).map(([n]) => n);
  assert.deepEqual(refused, [], 'editing passes (KWB-30)');
  assert.equal(leaseIn(root).holder.session, 'other', 'and takes no lock');
  assert.match(fire(root, 'me', commit).stderr, /BLOCKED by kit-lock: another session .*session other, branch work\/other/);
  assert.equal(fire(root, 'me', { tool_name: 'Bash', tool_input: { command: 'git status && ls lib' } }).status, 0, 'reading is not writing');

  const refusedOwn = Object.entries(routes(root)).filter(([, p]) => fire(root, 'other', p).status !== 0).map(([n]) => n);
  assert.deepEqual(refusedOwn, [], 'the lock\'s own session writes freely');
});

test('no lock: the first write is allowed and takes the lock for its session', () => {
  const root = repo();
  assert.equal(fire(root, 'me', routes(root).Write ?? {}).status, 0);
  const lock = leaseIn(root);
  assert.equal(lock.session, 'me');
  assert.equal(lock.branch, 'main');
  assert.ok(lock.time);
  assert.ok(lock.started_at && lock.last_seen, 'a lease: started_at and last_seen (KWB-29)');
  assert.equal(fire(root, 'someone-else', commit).status, 2, 'and now holds off the next session\'s commit');
});

test('a lock in another checkout of the repo (a worktree) counts too', () => {
  const root = repo();
  git(root, 'worktree', 'add', '-q', join(root, '.wt'), '-b', 'work/other');
  writeFileSync(join(root, '.wt', '.claude-packs-lock'), live('other', 'work/other'));
  assert.equal(fire(root, 'me', commit).status, 2);
  assert.equal(fire(root, 'me', routes(root)['Bash cp'] ?? {}).status, 0, 'an edit passes');
  assert.ok(!existsSync(join(root, '.claude-packs-lock')), 'a refused session takes no lock');
});

test('the repo carries its own hook config: kit-lock on every tool call (the lease renews there, KWB-29), and its selftest passes', () => {
  interface Group { matcher: string; hooks: { command: string }[] }
  const settings = JSON.parse(readFileSync(fileURLToPath(new URL('../../.claude/settings.json', import.meta.url)), 'utf8')) as { hooks: { PreToolUse: Group[] } };
  const on = settings.hooks.PreToolUse.filter((g) => g.hooks.some((h) => h.command.includes('kit-lock.mjs'))).map((g) => g.matcher);
  assert.deepEqual(on, ['*'], 'once, on every tool');
  assert.equal(spawnSync('node', [HOOK, '--selftest']).status, 0);
});
