// One session changes claude-packs at a time: the repo's own kit-lock hook refuses every write route while
// ANOTHER session's .claude-packs-lock is in any checkout of the repo; its own lock, or none, lets it through,
// and the first write takes the lock.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const HOOK = fileURLToPath(new URL('../.claude/hooks/kit-lock.mjs', import.meta.url));
const git = (cwd, ...a) => execFileSync('git', a, { cwd, stdio: 'ignore' });

function repo() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'kl-')));
  git(root, 'init', '-q', '-b', 'main');
  mkdirSync(join(root, 'lib'));
  writeFileSync(join(root, 'lib/a.mjs'), 'PLACEHOLDER\n');
  writeFileSync(join(root, 'src.txt'), 'x\n');
  git(root, 'add', 'lib/a.mjs', 'src.txt');
  git(root, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'init');
  return root;
}

const fire = (root, session, payload) => spawnSync('node', [HOOK], { cwd: root, input: JSON.stringify({ session_id: session, cwd: root, ...payload }), env: { ...process.env, CLAUDE_PROJECT_DIR: root }, encoding: 'utf8' });

const routes = (root) => {
  const f = join(root, 'lib/a.mjs');
  const bash = (command) => ({ tool_name: 'Bash', tool_input: { command } });
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

test('another session\'s lock refuses every write route; its own lock and no lock let them through', () => {
  const root = repo();
  writeFileSync(join(root, '.claude-packs-lock'), JSON.stringify({ session: 'other', branch: 'work/other', time: '2026-10-31T22:00:00Z' }));
  const notRefused = Object.entries(routes(root)).filter(([, p]) => fire(root, 'me', p).status !== 2).map(([n]) => n);
  assert.deepEqual(notRefused, []);
  assert.match(fire(root, 'me', routes(root).Write).stderr, /BLOCKED by kit-lock: another session .*session other, branch work\/other/);
  assert.equal(fire(root, 'me', { tool_name: 'Bash', tool_input: { command: 'git status && ls lib' } }).status, 0, 'reading is not writing');

  const refusedOwn = Object.entries(routes(root)).filter(([, p]) => fire(root, 'other', p).status !== 0).map(([n]) => n);
  assert.deepEqual(refusedOwn, [], 'the lock\'s own session writes freely');
});

test('no lock: the first write is allowed and takes the lock for its session', () => {
  const root = repo();
  assert.equal(fire(root, 'me', routes(root).Write).status, 0);
  const lock = JSON.parse(readFileSync(join(root, '.claude-packs-lock'), 'utf8'));
  assert.equal(lock.session, 'me');
  assert.equal(lock.branch, 'main');
  assert.ok(lock.time);
  assert.equal(fire(root, 'someone-else', routes(root)['Bash heredoc']).status, 2, 'and now holds off the next session');
});

test('a lock in another checkout of the repo (a worktree) counts too', () => {
  const root = repo();
  git(root, 'worktree', 'add', '-q', join(root, '.wt'), '-b', 'work/other');
  writeFileSync(join(root, '.wt', '.claude-packs-lock'), JSON.stringify({ session: 'other', branch: 'work/other', time: 't' }));
  assert.equal(fire(root, 'me', routes(root)['Bash cp']).status, 2);
  assert.ok(!existsSync(join(root, '.claude-packs-lock')), 'a refused session takes no lock');
});

test('the repo carries its own hook config, the lock, and the hook passes its selftest', () => {
  const settings = JSON.parse(readFileSync(fileURLToPath(new URL('../.claude/settings.json', import.meta.url)), 'utf8'));
  assert.match(JSON.stringify(settings), /kit-lock\.mjs/);
  assert.equal(settings.hooks.PreToolUse[0].matcher, 'Write|Edit|MultiEdit|NotebookEdit|Bash');
  assert.equal(spawnSync('node', [HOOK, '--selftest']).status, 0);
});
