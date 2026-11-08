// hub-rig: a scratch repo whose "GitHub" is a bare repo beside it, for git-guard's selftests (the pushed laws, KWB-26; the
// trunk a landing leaves behind, KWB-96). Its layout switches the house laws on. `run` sends a hook an event the way Claude
// Code does: through run-hooks.mjs, the event on stdin, CLAUDE_PROJECT_DIR the project.
//   hubRepo(prefix) -> { top, dir, hub, session, commit(msg, cwd = dir), push(...refs), run(hookFile, payload, cwd = dir, project = dir) }
import { spawnSync } from 'node:child_process';
import { mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { git, put } from './selftest.mjs';

const RUNNER = fileURLToPath(new URL('../run-hooks.mjs', import.meta.url));

export function hubRepo(prefix) {
  const top = realpathSync(mkdtempSync(join(process.env.TMPDIR ?? tmpdir(), prefix)));
  const dir = join(top, 'repo');
  const hub = join(top, 'hub.git');
  const session = `selftest-${prefix}${process.pid}-${Date.now()}`;
  put(join(dir, '.claude/layout.json'), JSON.stringify({ folders: {}, guards: { git: { house: true } } }));
  git(top, 'init', '-q', '--bare', '-b', 'main', hub);
  git(top, 'init', '-q', '-b', 'main', dir);
  git(dir, 'remote', 'add', 'origin', hub);
  const commit = (msg, cwd = dir) => { writeFileSync(join(cwd, `${msg}.txt`), msg); git(cwd, 'add', `${msg}.txt`); git(cwd, 'commit', '-q', '-m', msg); };
  const push = (...refs) => git(dir, 'push', '-q', 'origin', ...refs);
  const run = (hookFile, payload, cwd = dir, project = dir) => spawnSync(process.execPath, [RUNNER, hookFile], {
    cwd, encoding: 'utf8', input: JSON.stringify({ session_id: session, cwd, ...payload }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: project },
  });
  return { top, dir, hub, session, commit, push, run };
}
