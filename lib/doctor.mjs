// Checks a project's install: lock present, rule paths current, lesson checks pass their own
// examples, every layout folder exists, hooks registered, and which managed files were edited.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isModified, readLock } from './manifest.mjs';
import { applyPaths } from './rules.mjs';
import { coverage } from './coverage.mjs';

export async function doctor(projectDir, log = console.log, { strict = false } = {}) {
  const claudeDir = join(projectDir, '.claude');
  const lock = readLock(claudeDir);
  const problems = [];
  if (lock.packs.length === 0) problems.push('no packs installed (run `npx claude-packs init <packs>`)');

  const theirs = new Set(
    readdirSync(join(claudeDir, 'rules'))
      .map((f) => join('.claude', 'rules', f))
      .filter((rel) => lock.files[rel] === undefined || isModified(projectDir, rel, lock)),
  );
  const { stale } = await applyPaths(projectDir, { checkOnly: true, skip: theirs });
  if (stale) problems.push(`${stale} rule(s) have paths out of date with layout.json (run update)`);

  const layout = JSON.parse(readFileSync(join(claudeDir, 'layout.json'), 'utf8'));
  for (const f of Object.values(layout.folders)) if (!existsSync(join(projectDir, f.path))) problems.push(`layout folder missing: ${f.path}/`);

  const settings = existsSync(join(claudeDir, 'settings.json')) ? readFileSync(join(claudeDir, 'settings.json'), 'utf8') : '';
  if (!settings.includes('.claude/hooks/lesson-checks.mjs')) problems.push('hooks not registered in .claude/settings.json');

  try {
    execFileSync('node', [join(claudeDir, 'hooks', 'lesson-checks.mjs'), '--selftest'], {
      env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
      stdio: 'pipe',
    });
  } catch (e) {
    problems.push(`lesson checks fail their own examples:\n${String(e.stderr)}`);
  }

  for (const hook of ['file-size-guard.mjs', 'stage-guard.mjs', 'placement-law.mjs']) {
    const file = join(claudeDir, 'hooks', hook);
    if (existsSync(file) && spawnSync('node', [file, '--selftest']).status !== 0) problems.push(`${hook} fails its selftest`);
  }
  for (const rel of Object.keys(lock.files).filter((f) => f.endsWith('SKILL.md'))) {
    const abs = join(projectDir, rel);
    if (!existsSync(abs)) continue;
    const text = readFileSync(abs, 'utf8');
    if (text.length > 8000) problems.push(`${rel} is ${text.length} characters (keep skills under 8,000; compaction cuts at 20,000)`);
    if (!/^description:\s*Use /m.test(text)) problems.push(`${rel}: description must start with "Use when…" and list triggers only`);
  }

  const cov = await coverage(projectDir);
  if (cov.sourceCount > 0) {
    const say = (msg) => (strict ? problems.push(msg) : log(`  note: ${msg}`));
    if (cov.deadRules.length) say(`${cov.deadRules.length} rule(s) match no file yet, so they never fire: ${cov.deadRules.slice(0, 8).join(', ')}${cov.deadRules.length > 8 ? ', …' : ''}`);
    if (cov.uncovered.length) say(`${cov.uncovered.length} source file(s) no rule covers (outside the structure?): ${cov.uncovered.slice(0, 8).join(', ')}${cov.uncovered.length > 8 ? ', …' : ''}`);
  }

  const edited = Object.keys(lock.files).filter((rel) => isModified(projectDir, rel, lock));
  for (const rel of edited) log(`  note: you edited ${rel} (updates keep your version)`);
  for (const p of problems) log(`  PROBLEM: ${p}`);
  log(problems.length ? `${problems.length} problem(s)` : `OK: ${lock.packs.join(', ')}`);
  return problems.length ? 1 : 0;
}
