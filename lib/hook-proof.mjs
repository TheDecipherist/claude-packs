// A hook that should refuse and does not (0.18.0: whenever a hook is supposed to exit 2 and it exits 0, it is caught). Only exit 2
// blocks, so a guard fails open and silently. doctor sees two of the ways: a hook no settings entry runs (dispatch-once was that way for
// a moment in 0.11.0), and a hook that crashed since it last changed, from its exit code in .claude/hooks.log. A hook killed at its
// timeout leaves no line and is not seen.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const RUNNER = 'run-hooks.mjs';
const ANSWERS = new Set(['0', '2', '-', 'undefined', 'null']);

export async function hookProofProblems(projectDir, settingsText) {
  const dir = join(projectDir, '.claude', 'hooks');
  if (!existsSync(dir)) return [];
  const hooks = readdirSync(dir).filter((f) => /\.(mjs|py)$/.test(f) && f !== RUNNER);
  const problems = hooks.filter((f) => !settingsText.includes(`.claude/hooks/${f}`)).map((f) => `${f} is in .claude/hooks but no settings entry runs it, so it refuses nothing`);
  const log = join(dir, 'lib', 'hook-log.mjs');
  if (!existsSync(log)) return problems;
  const { readHookLog } = await import(pathToFileURL(log).href);
  const crashed = new Map();
  for (const row of readHookLog(projectDir)) {
    const file = hooks.find((f) => f.replace(/\.(mjs|py)$/, '') === row.hook);
    if (!file || ANSWERS.has(String(row.code))) continue;
    if (Date.parse(row.time) > statSync(join(dir, file)).mtimeMs) crashed.set(file, (crashed.get(file) ?? 0) + 1);
  }
  for (const [f, n] of crashed) problems.push(`${f} crashed on ${n} call(s) since it last changed: those calls were not judged, and went through (.claude/hooks.log)`);
  return problems;
}
