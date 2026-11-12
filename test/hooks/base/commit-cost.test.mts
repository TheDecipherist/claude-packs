// commit-cost: a git commit, push or merge costs git-guard and kit-fresh no git process on the event (doctor's per-hook budget is
// 10 ms p50, a process 30 to 80 ms). The count is the proof, not the clock: a `git` first on PATH writes its arguments to a log,
// the hooks run as Claude Code runs them, and the log's lines are the processes. Red before the change: git-guard asked git nine
// times on a commit and twice on a push, kit-fresh three to five times on a commit in the kit's repo.
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gitConfigRead } from '../../../packs/base/hooks/lib/git-config.mts';
import { pushSeen } from '../../../packs/base/hooks/lib/remote-heads.mts';
import { scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { KIT as KIT_NAME } from '../../../packs/base/hooks/lib/kit-version.mts';
import { assert, git, put, spawnSync, test } from '../../kit-cli.mts';

const HOOKS = join(import.meta.dirname, '../../../packs/base/hooks');

/** A folder whose `git` logs its arguments and runs the real one; `calls()` reads the log, `reset()` empties it. */
function shim(): { env: Record<string, string>; calls: () => string[]; reset: () => void } {
  const dir = scratchDir('cc-shim-');
  const real = spawnSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).stdout.trim();
  const log = join(dir, 'calls.log');
  mkdirSync(join(dir, 'bin'));
  writeFileSync(join(dir, 'bin/git'), `#!/bin/sh\necho "$*" >> "${log}"\nexec "${real}" "$@"\n`);
  chmodSync(join(dir, 'bin/git'), 0o755);
  writeFileSync(log, '');
  const home = scratchDir('cc-home-');
  const env: Record<string, string> = { ...(process.env as Record<string, string>), PATH: `${join(dir, 'bin')}:${process.env['PATH'] ?? ''}`, HOME: home, GIT_TERMINAL_PROMPT: '0' };
  for (const k of Object.keys(env)) if (k.startsWith('GIT_') && k !== 'GIT_TERMINAL_PROMPT') delete env[k];
  return { env, calls: () => readFileSync(log, 'utf8').split('\n').filter(Boolean), reset: () => writeFileSync(log, '') };
}

/** A work branch pushed to a bare origin, with files staged; `kit` makes it the kit's own repo with origin/work branches. */
function repo(env: Record<string, string>, kit: boolean): string {
  const root = scratchDir('cc-repo-');
  const hub = join(root, 'hub.git');
  const dir = join(root, 'w');
  mkdirSync(dir);
  git(root, 'init', '-q', '--bare', 'hub.git');
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 'a@b.c');
  git(dir, 'config', 'user.name', 't');
  put(join(dir, '.claude/layout.json'), JSON.stringify({ enable: ['guards/git-house'], guards: { git: { house: true, stopCacheMs: 0 } } }));
  put(join(dir, 'package.json'), JSON.stringify(kit ? { name: KIT_NAME, version: '2.0.0' } : { name: 'x' }));
  git(dir, 'add', 'package.json', '.claude/layout.json');
  git(dir, 'commit', '-qm', 'init');
  git(dir, 'remote', 'add', 'origin', hub);
  git(dir, 'push', '-q', '-u', 'origin', 'main');
  git(dir, 'switch', '-q', '-c', 'work/2.0.0-x');
  git(dir, 'push', '-q', '-u', 'origin', 'work/2.0.0-x');
  if (kit) for (const b of ['work/1.9.0-a', 'work/1.8.0-b']) { git(dir, 'branch', '-q', b, 'origin/main'); git(dir, 'push', '-q', 'origin', b); }
  git(dir, 'fetch', '-q', 'origin');
  for (let i = 1; i <= 10; i++) put(join(dir, `f${i}.txt`), `${i}\n`);
  git(dir, 'add', ...Array.from({ length: 10 }, (_, i) => `f${i + 1}.txt`));
  void env;
  return dir;
}

function fire(hook: string, dir: string, command: string, env: Record<string, string>): number | null {
  const event = { hook_event_name: 'PreToolUse', tool_name: 'Bash', cwd: dir, tool_input: { command } };
  return spawnSync(process.execPath, [join(HOOKS, hook)], { input: JSON.stringify(event), cwd: dir, env: { ...env, CLAUDE_PROJECT_DIR: dir }, encoding: 'utf8' }).status;
}

test('git-guard on a commit, a push and a merge starts no git process', () => {
  const s = shim();
  const dir = repo(s.env, false);
  fire('git-guard.mjs', dir, 'git merge main', s.env);   // not a commit: but the first look at GitHub is kept by the first commit's check, one ls-remote ever
  fire('git-guard.mjs', dir, 'git commit -m x -- f1.txt', s.env);
  for (const command of ['git commit -m x -- f1.txt', 'git push origin work/2.0.0-x', 'git merge main']) {
    s.reset();
    assert.equal(fire('git-guard.mjs', dir, command, s.env), 0, command);
    assert.deepEqual(s.calls(), [], `${command}: processes on the event`);
  }
});

test('git-guard still refuses a commit while the branch holds a commit GitHub lacks', () => {
  const s = shim();
  const dir = repo(s.env, false);
  git(dir, 'commit', '-qm', 'local only', '--', 'f1.txt');
  put(join(dir, 'f2.txt'), 'again\n');
  assert.equal(fire('git-guard.mjs', dir, 'git commit -m y -- f2.txt', s.env), 2);
});

test('kit-fresh on a commit in the kit repo: git is asked once for the refs, and not again until a ref moves', () => {
  const s = shim();
  const dir = repo(s.env, true);
  s.reset();
  assert.equal(fire('kit-fresh.mjs', dir, 'git commit -m x -- f1.txt', s.env), 0);
  assert.ok(s.calls().length <= 1, `first call: ${s.calls().join(' | ')}`);
  s.reset();
  assert.equal(fire('kit-fresh.mjs', dir, 'git commit -m x -- f1.txt', s.env), 0);
  assert.deepEqual(s.calls(), [], 'second call');
  git(dir, 'commit', '-qm', 'moved', '--', 'f1.txt');   // HEAD moves: the kept list is another key
  s.reset();
  assert.equal(fire('kit-fresh.mjs', dir, 'git commit -m x -- f2.txt', s.env), 0);
  assert.equal(s.calls().length, 1, 'after a commit: asked again once');
});

test('kit-fresh refuses a commit that lacks newer work, from the kept list too', () => {
  const s = shim();
  const dir = repo(s.env, true);
  git(dir, 'switch', '-q', 'main');
  git(dir, 'switch', '-q', '-c', 'work/3.0.0-next');
  put(join(dir, 'next.txt'), 'newer work\n');
  git(dir, 'add', 'next.txt');
  git(dir, 'commit', '-qm', 'newer', '--', 'next.txt');
  git(dir, 'push', '-q', 'origin', 'work/3.0.0-next');
  git(dir, 'switch', '-q', 'work/2.0.0-x');
  git(dir, 'fetch', '-q', 'origin');
  for (let i = 0; i < 2; i++) assert.equal(fire('kit-fresh.mjs', dir, 'git commit -m x -- a', s.env), 2, `call ${i}`);
});

test('a push seen is noted from the git dir, with no process', () => {
  const s = shim();
  const dir = repo(s.env, false);
  s.reset();
  pushSeen(dir, s.env);
  assert.deepEqual(s.calls(), []);
});

test('gitConfigRead reads remotes and upstreams, and gives way to git where git reads differently', () => {
  const s = shim();
  const dir = repo(s.env, false);
  git(dir, 'config', 'branch.work/2.0.0-x.merge', 'refs/heads/other');
  const config = gitConfigRead(dir, s.env);
  assert.match(config?.get('remote', 'origin', 'url') ?? '', /hub\.git$/);
  assert.equal(config?.get('branch', 'work/2.0.0-x', 'remote'), 'origin');
  assert.equal(config?.get('branch', 'work/2.0.0-x', 'merge'), 'refs/heads/other');
  assert.equal(config?.get('remote', 'nope', 'url'), null);
  git(dir, 'config', 'url.https://example.com/.insteadOf', 'ex:');
  assert.equal(gitConfigRead(dir, s.env), null, 'insteadOf: ask git');
  git(dir, 'config', '--unset', 'url.https://example.com/.insteadOf');
  git(dir, 'config', 'include.path', '../x');
  assert.equal(gitConfigRead(dir, s.env), null, 'include: ask git');
});
