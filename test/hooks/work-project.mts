// What the old tests' `installed()` made, from a copy of a fixture: the install a git repo on the branch `work/x`, which the
// house git laws and the logs read, and the events a hook is fired with there.
import { join } from 'node:path';
import { readText } from '../../packs/base/hooks/lib/files.mts';
import { parseJson } from '../../packs/base/hooks/lib/json.mts';
import { fixture, git } from '../fixtures/installs.mts';
import type { FixtureName } from '../fixtures/installs.mts';
import { hookRun, spawnSync } from '../kit-cli.mts';
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

/** An event fired at the runner settings.json runs, with these hooks (their paths from the project: `.claude/hooks/x.mjs`). */
export const runner = (dir: string, event: unknown, ...hooks: string[]): Spawned =>
  spawnSync('node', [join(dir, '.claude/hooks/run-hooks.mjs'), ...hooks], { input: JSON.stringify(event), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, cwd: dir });

/** The entries of one of the project's logs (`events.jsonl`, `refusals.jsonl`, `crashes.jsonl`, ...); none when it is not there. */
export function logLines(dir: string, file: string): Record<string, unknown>[] {
  const text = readText(join(dir, '.claude/logs', file));
  return (text ?? '').split('\n').filter(Boolean).map((line) => parseJson<Record<string, unknown>>(line) ?? {});
}

/** A C++ function long enough (26 lines) to be code once-only and the making line judge, named by `name`. */
export const cppFunction = (name: string): string =>
  `float ${name} (float x)\n{\n${Array.from({ length: 24 }, (_, i) => `    const float v${i} = x * ${i}.5f + std::tan (x / ${i + 2}.0f);\n`).join('')}    return x;\n}\n`;

/** A Bash command fired at one hook of the project, as a PreToolUse event in the project. */
export const bashAt = (dir: string, hook: string, command: string): Spawned =>
  hookRun(dir, hook, { hook_event_name: 'PreToolUse', cwd: dir, tool_name: 'Bash', tool_input: { command } });
