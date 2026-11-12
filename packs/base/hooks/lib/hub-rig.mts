// hub-rig: a scratch repo whose "GitHub" is a bare repo beside it, for git-guard's selftests (the pushed laws, KWB-26; the
// trunk a landing leaves behind, KWB-96). Its layout switches the house laws on. `run` sends a hook an event the way Claude
// Code does: through run-hooks.mjs, the event on stdin, CLAUDE_PROJECT_DIR the project (selftest.mts's runHook owns that).
//   hubRepo(prefix) -> { top, dir, hub, session, commit(msg, cwd = dir), push(...refs), run(hookFile, payload, cwd = dir, project = dir) }
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { put, scratchDir } from './files.mts';
import { toJson } from './json.mts';
import { git, runHook } from './selftest.mts';
import type { HookRun } from './selftest.mts';

export interface HubRepo {
  top: string;
  dir: string;
  hub: string;
  session: string;
  commit: (msg: string, cwd?: string) => void;
  push: (...refs: string[]) => void;
  run: (hookFile: string, payload: Record<string, unknown>, cwd?: string, project?: string) => HookRun;
}

export function hubRepo(prefix: string): HubRepo {
  const top = scratchDir(prefix);
  const dir = join(top, 'repo');
  const hub = join(top, 'hub.git');
  const session = `selftest-${prefix}${process.pid}-${Date.now()}`;
  put(join(dir, '.claude/layout.json'), toJson({ folders: {}, guards: { git: { house: true, stopLiveMs: 20_000 } } })); // a selftest under load waits for GitHub as the old Stop did
  git(top, 'init', '-q', '--bare', '-b', 'main', hub);
  git(top, 'init', '-q', '-b', 'main', dir);
  git(dir, 'remote', 'add', 'origin', hub);
  const commit = (msg: string, cwd: string = dir): void => {
    writeFileSync(join(cwd, `${msg}.txt`), msg);
    git(cwd, 'add', `${msg}.txt`);
    git(cwd, 'commit', '-q', '-m', msg);
  };
  const push = (...refs: string[]): void => git(dir, 'push', '-q', 'origin', ...refs);
  const run = (hookFile: string, payload: Record<string, unknown>, cwd: string = dir, project: string = dir): HookRun =>
    runHook(hookFile, project, { session_id: session, cwd, ...payload });
  return { top, dir, hub, session, commit, push, run };
}
