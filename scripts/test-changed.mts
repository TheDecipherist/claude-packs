#!/usr/bin/env node
// The changed-only test run for working runs ("the kit's test suite should only test things that have changed?").
// Run against the trunk (--base origin/<trunk>), it is the gate before landing and before a release (1.3.0); the full `npm test`
// runs only when the user asks for a full run, and this run says so every time.
//
//   npm run test:changed            or   node scripts/test-changed.mjs [--base <ref>] [--dry-run] [--root <repo>]
//
// The files changed since the base (git diff against it: committed, staged and unstaged; plus untracked files) are mapped to the
// test files that cover them, and each choice is printed with its reason:
//   - a test file that changed runs;
//   - a test covers a file it imports (static import, import(), new URL(..., import.meta.url)), directly or through other modules
//     (the CLI's bin imports lib/, so every test that runs the CLI covers lib/);
//   - a test covers a file it names: a path literal ('../packs/gpu-painter/skills/', 'packs/base/pack.json') covers what is under
//     it, a distinctive basename ('git-guard.mjs') covers the file of that name;
//   - the table (test-changed-table.mts), for what no import or name shows: pack files reach a project only through an install.
// Every run uses the fresh-tmp preload (running without it was KWB-2's cause). The graph and the choice are in
// test-changed-graph.mts, the hook proving in test-changed-hooks.mts.
import { spawnSync } from 'node:child_process';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coreBudget, projectLayout } from '../packs/base/hooks/lib/core-budget.mts';
import { gitOut, gitLines, gitRun } from '../packs/base/hooks/lib/git-run.mts';
import { isMain } from '../packs/base/hooks/lib/hook-log.mts';
import type { Env } from '../packs/base/hooks/lib/types.d.mts';
import { changedNames } from './changed-functions.mts';
import { choose, graph } from './test-changed-graph.mts';
import { proveHooks, selftestsOf } from './test-changed-hooks.mts';
import { TABLE } from './test-changed-table.mts';

export { changedNames, choose, graph, proveHooks, selftestsOf, TABLE };

const SELF = fileURLToPath(import.meta.url);

/** { path: 'A' | 'M' | 'D' | 'R' } since base: git's name-status (a rename counts for both its paths), untracked files 'A' (KWB-166). */
export function changeStatus(root: string, base: string, env: Env): Record<string, string> {
  const status: Record<string, string> = {};
  for (const line of gitLines(['diff', '--name-status', '-M', base], { cwd: root, env })) {
    const [code = '', ...paths] = line.split('\t');
    for (const p of paths) status[p] = code.slice(0, 1);
  }
  for (const f of gitLines(['ls-files', '--others', '--exclude-standard'], { cwd: root, env })) status[f] = 'A';
  return status;
}

export function changedFiles(root: string, base: string, env: Env): string[] {
  const diff = gitRun(['diff', '--name-only', base], { cwd: root, env });
  if (!diff.ok) throw new Error(`git diff ${base} failed: ${diff.stderr.trim()}`);
  const untracked = gitLines(['ls-files', '--others', '--exclude-standard'], { cwd: root, env }).join('\n');
  return [...new Set(`${diff.stdout}\n${untracked}`.split('\n').map((l) => l.trim()).filter(Boolean))]
    .filter((f) => !f.startsWith('.claude/worktrees/') && f !== '.claude-packs-lock' && !f.startsWith('node_modules/')).sort();
}

// A manifest whose only change is its version lines: a release's bump, which no test depends on (KWB-41: it chose every test).
export function versionBumpOnly(root: string, base: string, file: string, env: Env): boolean {
  if (!/(^|\/)package(-lock)?\.json$/.test(file)) return false;
  const lines = (gitOut(['diff', '-U0', base, '--', file], { cwd: root, env }) ?? '').split('\n').filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l));
  return lines.length > 0 && lines.every((l) => /^[+-]\s*"version":/.test(l));
}

function defaultBase(root: string, env: Env): { ref: string; label: string } {
  for (const trunk of ['main', 'master']) {
    const mb = gitOut(['merge-base', 'HEAD', trunk], { cwd: root, env });
    if (mb) return { ref: mb, label: `merge-base with ${trunk}` };
  }
  return { ref: 'HEAD', label: 'HEAD' };
}

interface Options { root: string; base: string | null; dry: boolean }

/** The arguments as options; null when one is not understood. */
function optionsOf(argv: readonly string[]): Options | null {
  const o: Options = { root: resolve(dirname(SELF), '..'), base: null, dry: false };
  for (let k = 0; k < argv.length; k += 1) {
    if (argv[k] === '--base') o.base = argv[++k] ?? null;
    else if (argv[k] === '--root') o.root = resolve(argv[++k] ?? '.');
    else if (argv[k] === '--dry-run') o.dry = true;
    else return null;
  }
  return o;
}

const GATE = 'This is a changed-only run. With --base origin/<trunk> this is the gate before landing and before a release; the full `npm test` runs only when the user asks.';

/** The run: what changed, which tests it reaches and why, the changed hooks proved, then the tests. Returns the exit code. */
export async function main(argv: readonly string[], env: Env, log: (line: string) => void = console.log): Promise<number> {
  const o = optionsOf(argv);
  if (!o) { console.error('usage: test-changed.mjs [--base <ref>] [--dry-run] [--root <repo>]'); return 2; }
  const git = { cwd: o.root, env };
  const base = o.base ? { ref: o.base, label: o.base } : defaultBase(o.root, env);
  const touched = changedFiles(o.root, base.ref, env);
  const bumped = touched.filter((f) => versionBumpOnly(o.root, base.ref, f, env));
  const changed = touched.filter((f) => !bumped.includes(f));
  const status = changeStatus(o.root, base.ref, env);
  const fnNames: Record<string, ReadonlySet<string>> = {};
  for (const c of changed) { const names = changedNames(o.root, base.ref, c, env); if (names !== null) fnNames[c] = names; }
  const { chosen, uncovered, tests } = choose(o.root, changed, undefined, status, fnNames);
  const proofs = selftestsOf(o.root, changed);
  log(`test:changed: base ${base.label} (${gitOut(['rev-parse', '--short', base.ref], git) ?? ''}), ${changed.length} changed file(s)`);
  for (const c of changed) log(`  ${c}`);
  if (bumped.length) log(`version bump only: ${bumped.join(', ')} (no test reads a version)`);
  log(`chose ${chosen.size} of ${tests.length} test files:`);
  for (const [t, why] of chosen) {
    const more = why.length > 3 ? `\n    (+${why.length - 3} more)` : '';
    log(`  ${t}\n    ${why.slice(0, 3).join('\n    ')}${more}`);
  }
  if (uncovered.length) log(`no test covers: ${uncovered.join(', ')}`);
  if (proofs.length) log(`selftests to prove (${proofs.length}): ${proofs.map((h) => basename(h)).join(', ')}`);
  if ((!chosen.size && !proofs.length) || o.dry) { log(GATE); return 0; }
  // KWB-111: node runs test files at one less than the core count by default (17 here), and each file installs the kit and
  // runs its selftests: the gate timed out on load. It takes the machine's core budget instead.
  // tests have their own cap: BUILDQ_CORES is the build queue's, and a session that set it to 16 for builds ran every test
  // file of a gate at once (load 20 to 25 on 18 cores, 2026-11-11); CLAUDE_PACKS_TEST_CORES raises it on purpose
  const testCap = Number(env.CLAUDE_PACKS_TEST_CORES) >= 1 ? Math.floor(Number(env.CLAUDE_PACKS_TEST_CORES)) : coreBudget({}, {});
  const concurrency = Math.min(coreBudget(env, projectLayout(o.root)), testCap);
  // the changed hooks prove themselves first, in seconds; a red one stops the gate before the tests (the first error first)
  const proved = await proveHooks(o.root, proofs, concurrency, { ...env });
  for (const r of proved) log(`  ${r.code === 0 ? 'ok  ' : 'FAIL'} ${basename(r.hook)}: ${r.out.split('\n').pop() ?? ''}`);
  const red = proved.filter((r) => r.code !== 0);
  if (red.length) { for (const r of red) log(`\n${r.hook}:\n${r.out}`); log(GATE); return 1; }
  if (!chosen.size) { log(GATE); return 0; }
  const args = ['--import', './test/fresh-tmp.mts', '--test', `--test-concurrency=${concurrency}`, ...chosen.keys()];
  log(`running: node ${args.join(' ')}`);
  // NODE_TEST_CONTEXT is set when this runs under a test runner; passed on, the nested run reports to it and exits 0 on a failure.
  const { NODE_TEST_CONTEXT: _context, ...nested } = env;
  const r = spawnSync(process.execPath, args, { cwd: o.root, stdio: 'inherit', env: nested });
  log(GATE);
  return r.status ?? 1;
}

if (isMain(import.meta.url)) process.exit(await main(process.argv.slice(2), process.env));
