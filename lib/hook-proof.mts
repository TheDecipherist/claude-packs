// A hook that should refuse and does not (0.18.0: whenever a hook is supposed to exit 2 and it exits 0, it is caught). Only exit 2
// blocks, so a guard fails open and silently. doctor sees three of the ways: a hook no settings entry runs (dispatch-once was that way for
// a moment in 0.11.0); a hook that crashed since it last changed, from its exit code in .claude/hooks.log, where "changed" counts every
// file in hooks/lib/, since most crashes are there (KF-40), and a crash no change answers is cleared by `logs clear` with its reason (KF-18);
// and param-id-lock holding no ids in a unit with parameters (KF-15). A hook killed at its timeout leaves no line and is not seen.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readHookTable } from '../packs/base/hooks/lib/hook-table.mts';
import type { Env, InstalledHookLogModule } from '../packs/base/hooks/lib/types.d.mts';
import { ANSWERS, clearedAt, clearsOf } from './logs.mts';
import { HOOK_FILE } from './packs.mts';

const RUNNER = 'run-hooks.mjs';
const hookName = (file: string): string => file.replace(HOOK_FILE, '');

// The time a hook last changed: its own file, or anything it shares in hooks/lib.
const changedAt = (dir: string, file: string, libTimes: readonly number[]): number => Math.max(statSync(join(dir, file)).mtimeMs, ...libTimes);

// The hooks whose --status says what a project still lacks: a param-id-lock holding no ids (KF-15); a JUCE plugin with no settings
// layer, one missing a standard setting, or a standalone in JUCE's own window (settings-layer, 1.7.0).
const STATUS_HOOKS: readonly string[] = ['param-id-lock.mjs', 'settings-layer.mjs'];

export function statusProblems(projectDir: string, env: Env = process.env): string[] {
  return STATUS_HOOKS.map((name) => join(projectDir, '.claude', 'hooks', name)).filter(existsSync).flatMap((hook) => {
    const r = spawnSync('node', [hook, '--status'], { encoding: 'utf8', env: { ...env, CLAUDE_PROJECT_DIR: projectDir } });
    return r.status === 0 ? [] : [r.stdout.trim() || r.stderr.trim()];
  });
}

/** Whether a hook file is run: a settings entry names it, or the hook table the runner reads has a row for it (W8.1). */
export function isRegistered(projectDir: string, settingsText: string, file: string): boolean {
  const table = readHookTable(join(projectDir, '.claude', 'hooks')) ?? [];
  return settingsText.includes(`.claude/hooks/${file}`) || table.some((r) => r.hook === hookName(file));
}

export async function hookProofProblems(projectDir: string, settingsText: string): Promise<string[]> {
  const dir = join(projectDir, '.claude', 'hooks');
  if (!existsSync(dir)) return [];
  const hooks = readdirSync(dir).filter((f) => HOOK_FILE.test(f) && f !== RUNNER);
  const problems = hooks.filter((f) => !isRegistered(projectDir, settingsText, f)).map((f) => `${f} is in .claude/hooks but no settings entry runs it, so it refuses nothing`);
  for (const row of readHookTable(dir) ?? []) {
    if (!hooks.some((f) => hookName(f) === row.hook)) problems.push(`hooks.json has a row for ${row.hook} but .claude/hooks has no such hook, so the runner crashes on it`);
  }
  const log = join(dir, 'lib', 'hook-log.mjs');
  if (!existsSync(log)) return problems;
  const { readHookLog }: InstalledHookLogModule = await import(pathToFileURL(log).href);
  const libTimes = readdirSync(join(dir, 'lib')).map((f) => statSync(join(dir, 'lib', f)).mtimeMs);
  const clears = clearsOf(projectDir);
  const crashed = new Map<string, number>();
  for (const row of readHookLog(projectDir, { rotated: true })) {
    const file = hooks.find((f) => hookName(f) === row.hook);
    if (!file || ANSWERS.has(String(row.code))) continue;
    if (Date.parse(row.time) > changedAt(dir, file, libTimes) && row.time > clearedAt(clears, row.hook)) crashed.set(file, (crashed.get(file) ?? 0) + 1);
  }
  for (const [f, n] of crashed) {
    problems.push(`${f} crashed on ${n} call(s) since it last changed: those calls were not judged (\`logs crashes\`). Once fixed or superseded: \`logs clear ${hookName(f)} fixed|superseded "<why>"\``);
  }
  return problems;
}
