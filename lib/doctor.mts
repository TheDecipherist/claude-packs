// Checks a project's install: lock present, rule paths current, lesson checks pass their own
// examples, every layout folder exists, hooks registered, and which managed files were edited.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { coreBudget } from '../packs/base/hooks/lib/core-budget.mts';
import { childError, readText } from '../packs/base/hooks/lib/files.mts';
import { readLayout } from '../packs/base/hooks/lib/layout.mts';
import type { Layout, LayoutFolder, Logger } from '../packs/base/hooks/lib/types.d.mts';
import { buildQueueProblems } from './build-queue.mts';
import { configProblems, sourceFilesOf } from './configs.mts';
import { coverage } from './coverage.mts';
import { daemonNotes } from './doctor-daemon.mts';
import { tokenProblems } from './git-tokens.mts';
import { budgetProblems } from './hook-budget.mts';
import { proxyProblems } from './doctor-proxy.mts';
import { hookProofProblems, isRegistered, statusProblems } from './hook-proof.mts';
import { timingProblems } from './hook-timing.mts';
import { hoverGateProblems, pageGateProblems } from './hover-gate.mts';
import { isModified, readLock } from './manifest.mts';
import { onceOnlyDoctor, useJscpd } from './once-only-report.mts';
import type { DetectorEnv } from './once-only-report.mts';
import { manifestProblems } from './pack-manifest.mts';
import { HOOK_FILE, availablePacks, readPack } from './packs.mts';
import { ruleTestProblems } from './rule-tests.mts';
import { applyPaths } from './rules.mts';
import { proved, remember, selftestKey, sharedHash } from './selftest-cache.mts';
import { shapeProblems } from './shape-cli.mts';
import { symmetryProblems } from './symmetry-doctor.mts';
import { typescriptProblems } from './ts-project.mts';
import { wallProblem } from './wall-budget.mts';

export interface DoctorOptions {
  strict?: boolean;
  fresh?: boolean;
  installing?: boolean;
  /** The environment the selftests and the detector run under; the process's own by default. */
  env?: DetectorEnv;
}

/** One hook's selftest: not run (no selftest, or proved already), or run with its exit code and the last of its output. */
interface SelftestResult {
  hook: string;
  missing?: boolean;
  unchanged?: boolean;
  code?: number | null;
  timedOut?: boolean;
  err?: string;
}

// A hook has a selftest when its tail names --selftest, or when it runs through hook-log's runAsHook, which answers it (KWB-181).
export const hasSelftest = (text: string): boolean => text.includes('--selftest') || /\brunAsHook\(/.test(text);

// at once: the machine's core budget (a third of its cores, as the build queue takes), never fewer than 4 (KWB-166)
const selftestJobs = (env: DetectorEnv): number => Math.max(4, Number(env.CLAUDE_PACKS_SELFTEST_JOBS ?? coreBudget(env)));
const selftestSeconds = (env: DetectorEnv): number => Number(env.CLAUDE_PACKS_SELFTEST_S ?? 180);

const isPlanned = (folder: LayoutFolder): boolean => 'planned' in folder && Boolean(folder.planned);
const more = (names: readonly string[]): string => `${names.slice(0, 8).join(', ')}${names.length > 8 ? ', …' : ''}`;

/** One hook's selftest as a child, killed after `seconds`; a pass is remembered by its key. */
function runSelftest(hook: string, file: string, key: string, projectDir: string, env: DetectorEnv, seconds: number): Promise<SelftestResult> {
  return new Promise((done) => {
    const child = spawn(hook.endsWith('.py') ? 'python3' : 'node', [file, '--selftest'], { env: { ...env, CLAUDE_PROJECT_DIR: projectDir, PYTHONDONTWRITEBYTECODE: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, seconds * 1000);
    child.stdout.on('data', (d: Buffer | string) => { out += String(d); });
    child.stderr.on('data', (d: Buffer | string) => { out += String(d); });
    child.on('error', (e) => { clearTimeout(timer); done({ hook, code: 1, err: e.message }); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0 && !timedOut) remember(key, env);
      done({ hook, code, timedOut, err: out.trim().split('\n').slice(-4).join('\n') });
    });
  });
}

/** Every hook proves its own law (Sub37 WB-4), all at once, `selftestJobs` at a time with `selftestSeconds` each: all at once with 60 s each, the heavy
 *  ones (git repos and worktrees) were killed under load and read as failing, with no output. A selftest that passed is not run again while what it ran
 *  on is the same (lib/selftest-cache.mts, KWB-41). */
async function runSelftests(projectDir: string, layout: Layout, { fresh, env }: { fresh: boolean; env: DetectorEnv }): Promise<{ results: SelftestResult[]; byGate: boolean; seconds: number }> {
  const claudeDir = join(projectDir, '.claude');
  const hooks = readdirSync(join(claudeDir, 'hooks')).filter((f) => HOOK_FILE.test(f) && f !== 'lesson-checks.mjs').sort();
  const shared = sharedHash(claudeDir, layout.guards, env);
  // In the kit's own test run (test/fresh-tmp.mts sets CLAUDE_PACKS_SELFTESTS=gate) every install would prove the same 46 hooks again:
  // 166 s a fresh install on the Mac. The gate proves the hooks a change touched, once (scripts/test-changed.mjs proveHooks), so
  // a test's install takes them as proved; a test about selftests sets CLAUDE_PACKS_SELFTESTS=run, and --fresh runs them all (KWB-166).
  const byGate = env.CLAUDE_PACKS_SELFTESTS === 'gate';
  const seconds = selftestSeconds(env);
  const one = (hook: string): Promise<SelftestResult> => {
    const file = join(claudeDir, 'hooks', hook);
    if (!hasSelftest(readText(file) ?? '')) return Promise.resolve({ hook, missing: true });
    const key = selftestKey(file, shared);
    if (!fresh && (byGate || proved(key, env))) return Promise.resolve({ hook, code: 0, unchanged: true });
    return runSelftest(hook, file, key, projectDir, env, seconds);
  };
  // a pool, not batches: a batch waited for its slowest selftest before the next began (KWB-166)
  const results: SelftestResult[] = [];
  const queue = [...hooks];
  const worker = async (): Promise<void> => {
    for (let hook = queue.shift(); hook !== undefined; hook = queue.shift()) results.push(await one(hook));
  };
  await Promise.all(Array.from({ length: Math.min(selftestJobs(env), queue.length) }, worker));
  results.sort((a, b) => a.hook.localeCompare(b.hook));
  return { results, byGate, seconds };
}

/** What the selftests said, as notes in the log and problems for the ones that failed. */
function selftestProblems(results: readonly SelftestResult[], byGate: boolean, fresh: boolean, seconds: number, log: Logger): string[] {
  const same = results.filter((r) => r.unchanged).length;
  if (byGate && !fresh) log(`  selftests: ${same} of ${results.length} taken as proved by the gate (the kit's test run; doctor --fresh runs them all)`);
  else if (same) log(`  selftests: ${same} of ${results.length} unchanged, not run again (doctor --fresh runs them all)`);
  const problems: string[] = [];
  for (const r of results) {
    if (r.missing) log(`  note: ${r.hook} has no --selftest`);
    else if (r.timedOut) problems.push(`${r.hook}'s selftest timed out after ${seconds} s (the machine is loaded, or the selftest hangs)`);
    else if (r.code !== 0) problems.push(`${r.hook} fails its selftest${r.err ? `:\n${r.err}` : ''}`);
  }
  return problems;
}

/** Every installed skill is under 8,000 characters and its description starts with "Use". */
function skillProblems(projectDir: string, managed: readonly string[]): string[] {
  const problems: string[] = [];
  for (const rel of managed.filter((f) => f.endsWith('SKILL.md'))) {
    const abs = join(projectDir, rel);
    if (!existsSync(abs)) continue;
    const text = readText(abs) ?? '';
    if (text.length > 8000) problems.push(`${rel} is ${text.length} characters (keep skills under 8,000; compaction cuts at 20,000)`);
    if (!/^description:\s*Use /m.test(text)) problems.push(`${rel}: description must start with "Use when…" and list triggers only`);
  }
  return problems;
}

// installing: doctor run at the end of an install. What the project has yet to do (a rule's test, a parameter lock) is a note there: an install on
// a project with code has not failed. The `doctor` command is red for it.
export async function doctor(projectDir: string, log: Logger = console.log, { strict = false, fresh = false, installing = false, env = process.env }: DoctorOptions = {}): Promise<number> {
  const began = Date.now();
  const claudeDir = join(projectDir, '.claude');
  const lock = readLock(claudeDir);
  const problems: string[] = [];
  // custom packs are fetched only by init, add and update (W8.4): doctor reads the stock packs and names the others
  const stock = new Set(availablePacks());
  const packs = lock.packs.filter((p) => stock.has(p));
  if (packs.length < lock.packs.length) log(`  note: custom pack(s) ${lock.packs.filter((p) => !stock.has(p)).join(', ')} are not fetched by doctor (update does)`);
  if (lock.packs.length === 0) problems.push('no packs installed (run `npx --no-install @thedecipherist/claude-packs init <packs>`)');
  else problems.push(...configProblems(projectDir, packs, log)); // the configuration installed, and a pack it does not take (0.10.0)

  const theirs = new Set(
    readdirSync(join(claudeDir, 'rules'))
      .map((f) => join('.claude', 'rules', f))
      .filter((rel) => lock.files[rel] === undefined || isModified(projectDir, rel, lock)),
  );
  const { stale } = await applyPaths(projectDir, { checkOnly: true, skip: theirs });
  if (stale) problems.push(`${stale} rule(s) have paths out of date with layout.json (run update)`);

  const layout = readLayout(projectDir);
  for (const f of Object.values(layout.folders)) if (!isPlanned(f) && !existsSync(join(projectDir, f.path))) problems.push(`layout folder missing: ${f.path}/`);

  const settings = readText(join(claudeDir, 'settings.json')) ?? '';
  if (!isRegistered(projectDir, settings, 'lesson-checks.mjs')) problems.push('hooks not registered in .claude/settings.json');

  try {
    execFileSync('node', [join(claudeDir, 'hooks', 'lesson-checks.mjs'), '--selftest'], { env: { ...env, CLAUDE_PROJECT_DIR: projectDir }, stdio: 'pipe' });
  } catch (e) {
    problems.push(`lesson checks fail their own examples:\n${childError(e)}`);
  }

  useJscpd(projectDir, env); // once-only's and making-check's selftests need the detector (0.9.0)
  const ran = await runSelftests(projectDir, layout, { fresh, env });
  problems.push(...selftestProblems(ran.results, ran.byGate, fresh, ran.seconds, log));
  problems.push(...symmetryProblems(projectDir, log, env, fresh));
  problems.push(...skillProblems(projectDir, Object.keys(lock.files)));

  for (const name of packs) problems.push(...manifestProblems(readPack(name), name));
  problems.push(...await hookProofProblems(projectDir, settings)); // a guard that fails open fails silently (0.18.0)
  problems.push(...proxyProblems(projectDir, env, log, fresh)); // the proxy's own selftest, and which path an event takes (W8.2)
  const toDo = (found: readonly string[]): void => { if (installing) found.forEach((f) => log(`  note: ${f}`)); else problems.push(...found); };
  toDo(statusProblems(projectDir, env)); // what a hook says a project still lacks: an empty id lock (KF-15), a missing settings layer (1.7.0)
  toDo(buildQueueProblems(projectDir, layout)); // a queue that is not there queues nothing (KF-1)
  problems.push(...await pageGateProblems(projectDir, layout, env)); // UI code is proved rendered (0.17.0)
  problems.push(...await hoverGateProblems(projectDir, layout, env)); // UI code needs a declared hover gate (0.10.1, Stellix B-261)
  problems.push(...typescriptProblems(projectDir)); // a project holding typescript-only holds typescript and the declaration (W8.5)
  problems.push(...tokenProblems(projectDir, layout.siblings ?? []));
  problems.push(...shapeProblems(projectDir, packs)); // the shape law: a synth has design/shape.json, and its rows keep the contract
  problems.push(...onceOnlyDoctor(projectDir, log, env)); // making's cost per turn, the duplicate count (0.9.0)
  problems.push(...budgetProblems(projectDir, log)); // each event and each hook at it held to the budget table; a full pool named, not a hook (W8.4)
  daemonNotes(projectDir, env, log); // a daemon serving the hooks of an older lock is said, with both hashes (review-2-go 6.4)
  problems.push(...timingProblems(projectDir, log)); // each hook's median and worst from .claude/hooks.log; a median over 500 ms is red (KWB-24)

  const cov = await coverage(projectDir, sourceFilesOf(projectDir, packs), env); // the configuration says what is source (KWB-32)
  const ruleTests = ruleTestProblems(projectDir, layout, cov); // a rule's own test can be missing for a whole build (KF-31)
  if (layout.ruleTests) toDo(ruleTests); // a new law never turns an installed project red: the key in layout.json is the choice
  else ruleTests.forEach((f) => log(`  note: ${f}\n    To be held to this, add "ruleTests": {} to .claude/layout.json.`));
  if (cov.sourceCount > 0) {
    const say = (msg: string): void => { if (strict) problems.push(msg); else log(`  note: ${msg}`); };
    if (cov.deadRules.length) say(`${cov.deadRules.length} rule(s) match no file yet, so they never fire: ${more(cov.deadRules)}`);
    if (cov.waitingRules.length) log(`  note: ${cov.waitingRules.length} rule(s) wait for their first file: their folders hold nothing yet`);
    if (cov.uncovered.length) say(`${cov.uncovered.length} source file(s) no rule covers (outside the structure?): ${more(cov.uncovered)}`);
  }

  const slow = fresh && !installing ? wallProblem('doctor --fresh', began, Date.now(), env) : null; // its own budget (W8.4)
  if (slow !== null) problems.push(slow);
  const edited = Object.keys(lock.files).filter((rel) => isModified(projectDir, rel, lock));
  for (const rel of edited) log(`  note: you edited ${rel} (updates keep your version)`);
  for (const p of problems) log(`  PROBLEM: ${p}`);
  log(problems.length ? `${problems.length} problem(s)` : `OK: ${lock.packs.join(', ')}`);
  return problems.length ? 1 : 0;
}
