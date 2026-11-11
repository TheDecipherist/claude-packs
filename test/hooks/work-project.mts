// What the old tests' `installed()` made, from a copy of a fixture: the install a git repo on the branch `work/x`, which the
// house git laws and the logs read, and the events a hook is fired with there.
import { join } from 'node:path';
import { fixture, git } from '../fixtures/installs.mts';
import type { FixtureName } from '../fixtures/installs.mts';
import { hookRun } from '../kit-cli.mts';
import type { Spawned } from '../kit-cli.mts';

/** A copy of the run's install of a configuration, made a git repo on the branch `work/x`. */
export function workProject(name: FixtureName = 'base'): string {
  const dir = fixture(name);
  git(dir, 'init', '-q', '--initial-branch', 'work/x');
  return dir;
}

/** A Write fired at one hook of the project, as a PreToolUse event in the project. */
export const writeAt = (dir: string, hook: string, rel: string, content: string): Spawned =>
  hookRun(dir, hook, { hook_event_name: 'PreToolUse', cwd: dir, tool_name: 'Write', tool_input: { file_path: join(dir, rel), content } });

/** A Bash command fired at one hook of the project, as a PreToolUse event in the project. */
export const bashAt = (dir: string, hook: string, command: string): Spawned =>
  hookRun(dir, hook, { hook_event_name: 'PreToolUse', cwd: dir, tool_name: 'Bash', tool_input: { command } });
