// A hook that should refuse and does not (0.18.0: whenever a hook is supposed to exit 2 and it exits 0, it is caught). Only exit 2
// blocks, so a guard fails open and silently. doctor sees three of the ways: a hook no settings entry runs (dispatch-once was that way for
// a moment in 0.11.0); a hook that crashed since it last changed, from its exit code in .claude/hooks.log, where "changed" counts every
// file in hooks/lib/, since most crashes are there (KF-40), and a crash no change answers is cleared by `logs clear` with its reason (KF-18);
// and param-id-lock holding no ids in a unit with parameters (KF-15). A hook killed at its timeout leaves no line and is not seen.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ANSWERS, clearedAt, clearsOf } from './logs.mjs';

const RUNNER = 'run-hooks.mjs';
const hookName = (file) => file.replace(/\.(mjs|py)$/, '');

// The time a hook last changed: its own file, or anything it shares in hooks/lib.
const changedAt = (dir, file, libTimes) => Math.max(statSync(join(dir, file)).mtimeMs, ...libTimes);

export function paramLockProblems(projectDir) {
  const hook = join(projectDir, '.claude', 'hooks', 'param-id-lock.mjs');
  if (!existsSync(hook)) return [];
  const r = spawnSync('node', [hook, '--status'], { encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir } });
  return r.status === 0 ? [] : [r.stdout.trim() || r.stderr.trim()];
}

export async function hookProofProblems(projectDir, settingsText) {
  const dir = join(projectDir, '.claude', 'hooks');
  if (!existsSync(dir)) return [];
  const hooks = readdirSync(dir).filter((f) => /\.(mjs|py)$/.test(f) && f !== RUNNER);
  const problems = hooks.filter((f) => !settingsText.includes(`.claude/hooks/${f}`)).map((f) => `${f} is in .claude/hooks but no settings entry runs it, so it refuses nothing`);
  const log = join(dir, 'lib', 'hook-log.mjs');
  if (!existsSync(log)) return problems;
  const { readHookLog } = await import(pathToFileURL(log).href);
  const libTimes = readdirSync(join(dir, 'lib')).map((f) => statSync(join(dir, 'lib', f)).mtimeMs);
  const clears = clearsOf(projectDir);
  const crashed = new Map();
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
