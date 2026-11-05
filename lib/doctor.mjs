// Checks a project's install: lock present, rule paths current, lesson checks pass their own
// examples, every layout folder exists, hooks registered, and which managed files were edited.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isModified, readLock } from './manifest.mjs';
import { applyPaths } from './rules.mjs';
import { coverage } from './coverage.mjs';
import { tokenProblems } from './git-tokens.mjs';
import { shapeProblems } from './shape-cli.mjs';
import { symmetryProblems } from './symmetry-doctor.mjs';
import { onceOnlyDoctor, useJscpd } from './once-only-report.mjs';
import { proved, remember, selftestKey, sharedHash } from './selftest-cache.mjs';
import { timingProblems } from './hook-timing.mjs';
import { configProblems, sourceFilesOf } from './configs.mjs';
import { hookProofProblems, paramLockProblems } from './hook-proof.mjs';
import { ruleTestProblems } from './rule-tests.mjs';
import { manifestProblems } from './pack-manifest.mjs';
import { readPack } from './packs.mjs';
import { hoverGateProblems, pageGateProblems } from './hover-gate.mjs';

const SELFTEST_JOBS = Number(process.env.CLAUDE_PACKS_SELFTEST_JOBS ?? 4);
const SELFTEST_S = Number(process.env.CLAUDE_PACKS_SELFTEST_S ?? 180);

// installing: doctor run at the end of an install. What the project has yet to do (a rule's test, a parameter lock) is a note there: an install on
// a project with code has not failed. The `doctor` command is red for it.
export async function doctor(projectDir, log = console.log, { strict = false, fresh = false, installing = false } = {}) {
  const claudeDir = join(projectDir, '.claude');
  const lock = readLock(claudeDir);
  const problems = [];
  if (lock.packs.length === 0) problems.push('no packs installed (run `npx --no-install @thedecipherist/claude-packs init <packs>`)');
  else problems.push(...configProblems(projectDir, lock.packs, log)); // the configuration installed, and a pack it does not take (0.10.0)

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

  useJscpd(projectDir); // once-only's and making-check's selftests need the detector (0.9.0)
  // Every hook proves its own law (Sub37 WB-4), all at once; a hook without a selftest is noted.
  const hooks = readdirSync(join(claudeDir, 'hooks')).filter((f) => /\.(mjs|py)$/.test(f) && f !== 'lesson-checks.mjs').sort();
  // Run SELFTEST_JOBS at a time with SELFTEST_S each: all at once with 60 s each, the heavy ones (git repos and worktrees) were killed
  // under load and read as failing, with no output (the kit's own suite failed a different few each run while agents built).
  // A selftest that passed is not run again while what it ran on is the same (lib/selftest-cache.mjs, KWB-41).
  const shared = sharedHash(claudeDir, JSON.parse(readFileSync(join(claudeDir, 'layout.json'), 'utf8')).guards);
  const one = (hook) => {
    const file = join(claudeDir, 'hooks', hook);
    if (!readFileSync(file, 'utf8').includes('--selftest')) return Promise.resolve({ hook, missing: true });
    const key = selftestKey(file, shared);
    if (!fresh && proved(key)) return Promise.resolve({ hook, code: 0, unchanged: true });
    return new Promise((done) => {
      const child = spawn(hook.endsWith('.py') ? 'python3' : 'node', [file, '--selftest'], { env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir, PYTHONDONTWRITEBYTECODE: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '', timedOut = false;
      const timer = setTimeout(() => { timedOut = true; child.kill(); }, SELFTEST_S * 1000);
      child.stdout.on('data', (d) => { out += d; });
      child.stderr.on('data', (d) => { out += d; });
      child.on('error', (e) => { clearTimeout(timer); done({ hook, code: 1, err: e.message }); });
      child.on('close', (code) => { clearTimeout(timer); if (code === 0 && !timedOut) remember(key); done({ hook, code, timedOut, err: out.trim().split('\n').slice(-4).join('\n') }); });
    });
  };
  const results = [];
  for (let i = 0; i < hooks.length; i += SELFTEST_JOBS) results.push(...await Promise.all(hooks.slice(i, i + SELFTEST_JOBS).map(one)));
  const same = results.filter((r) => r.unchanged).length;
  if (same) log(`  selftests: ${same} of ${results.length} unchanged, not run again (doctor --fresh runs them all)`);
  for (const r of results) {
    if (r.missing) log(`  note: ${r.hook} has no --selftest`);
    else if (r.timedOut) problems.push(`${r.hook}'s selftest timed out after ${SELFTEST_S} s (the machine is loaded, or the selftest hangs)`);
    else if (r.code !== 0) problems.push(`${r.hook} fails its selftest${r.err ? `:\n${r.err}` : ''}`);
  }
  problems.push(...symmetryProblems(projectDir, log));
  for (const rel of Object.keys(lock.files).filter((f) => f.endsWith('SKILL.md'))) {
    const abs = join(projectDir, rel);
    if (!existsSync(abs)) continue;
    const text = readFileSync(abs, 'utf8');
    if (text.length > 8000) problems.push(`${rel} is ${text.length} characters (keep skills under 8,000; compaction cuts at 20,000)`);
    if (!/^description:\s*Use /m.test(text)) problems.push(`${rel}: description must start with "Use when…" and list triggers only`);
  }

  for (const name of lock.packs) problems.push(...manifestProblems(readPack(name), name));
  problems.push(...await hookProofProblems(projectDir, settings)); // a guard that fails open fails silently (0.18.0)
  const toDo = (found) => (installing ? found.forEach((f) => log(`  note: ${f}`)) : problems.push(...found));
  toDo(paramLockProblems(projectDir)); // a lock holding no ids protects nothing, and says nothing (KF-15)
  problems.push(...await pageGateProblems(projectDir, layout)); // UI code is proved rendered (0.17.0)
  problems.push(...await hoverGateProblems(projectDir, layout)); // UI code needs a declared hover gate (0.10.1, Stellix B-261)
  problems.push(...tokenProblems(projectDir, layout.siblings ?? []));
  problems.push(...shapeProblems(projectDir, lock.packs)); // the shape law: a synth has design/shape.json, and its rows keep the contract
  problems.push(...onceOnlyDoctor(projectDir, log)); // making's cost per turn, the duplicate count (0.9.0)
  problems.push(...timingProblems(projectDir, log)); // each hook's median and worst from .claude/hooks.log; a median over 500 ms is red (KWB-24)

  const cov = await coverage(projectDir, sourceFilesOf(projectDir, lock.packs)); // the configuration says what is source (KWB-32)
  toDo(ruleTestProblems(projectDir, layout, cov)); // a rule's own test can be missing for a whole build (KF-31)
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
