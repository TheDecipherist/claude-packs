#!/usr/bin/env node
// build-sweep (SessionStart, SubagentStop): an agent worktree's build output is removed once the worktree has gone quiet.
//
// The user, 2026-11-01: "we should make [something] in claude-packs that automatically removes old build artifacts that are no
// longer needed". Every agent works in its own worktree under .claude/worktrees and builds the whole project there (3 to 15 GB);
// nothing removed them after the agent's work was merged, and two projects filled a 2 TB disk (283 GB in 88 worktrees and
// 642 GB in 178), until every command failed with ENOSPC.
//
// What goes: only the build output (layout.json "buildOutput", default build/**) of a worktree under .claude/worktrees that
// has been quiet for QUIET_MIN: no source file at depth 3 or less changed, and nothing written at the top of its build folder
// (.ninja_log, CMakeCache.txt: a build in progress writes there). Never the main checkout's build, never a source file, never a
// worktree itself (it may hold uncommitted work), never the worktree with the newest build (the one most likely being played),
// never a worktree named in layout.json "keepWorktrees". A build can always be made again; that is why only the build goes.
// At SessionStart it also says when the disk is low, so the next agent's build does not fill it.
//   node build-sweep.mjs                 the hook (reads the event on stdin; sweeps in the background)
//   node build-sweep.mjs --now [--dry-run]   sweep this project now and say what went
//   node build-sweep.mjs --selftest
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, statfsSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { asHook, isMain } from './lib/hook-log.mjs';

const QUIET_MIN = Number(process.env.BUILD_SWEEP_QUIET_MIN ?? 120);
const LOW_GB = Number(process.env.BUILD_SWEEP_LOW_GB ?? 40);

/** the top-level folder name patterns of the build output, from layout.json "buildOutput" (default build/**) */
/** worktrees a project never sweeps (layout.json "keepWorktrees": names under .claude/worktrees, e.g. the build the user plays) */
export function keptNames(root) {
  try { return JSON.parse(readFileSync(join(root, '.claude/layout.json'), 'utf8')).keepWorktrees ?? []; } catch { return []; }
}

export function buildNames(root) {
  let globs = ['build/**'];
  try { globs = JSON.parse(readFileSync(join(root, '.claude/layout.json'), 'utf8')).buildOutput ?? globs; } catch { /* no layout: the default */ }
  return globs.map((g) => g.split('/')[0]).filter((n) => n && n !== '**')
    .map((n) => new RegExp(`^${n.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`));
}

// the newest change in a worktree: its source files to depth 3 (build folders and .git left out), and the top of each build folder
function lastChange(dir, isBuild) {
  let newest = 0;
  const walk = (d, depth) => {
    let entries = [];
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = join(d, e.name);
      if (depth === 0 && isBuild(e.name)) {
        if (!e.isDirectory()) continue;
        try { for (const f of readdirSync(p)) newest = Math.max(newest, statSync(join(p, f)).mtimeMs); } catch { /* gone */ }
        continue;
      }
      if (e.name === '.git' || e.name === 'node_modules') continue;
      try { newest = Math.max(newest, statSync(p).mtimeMs); } catch { continue; }
      if (e.isDirectory() && depth < 2) walk(p, depth + 1);
    }
  };
  walk(dir, 0);
  return newest;
}

function sizeGb(p) {
  try { return Number(execFileSync('du', ['-sk', p], { encoding: 'utf8', timeout: 120000 }).split('\t')[0]) / 1048576; } catch { return 0; }
}

/** sweep a project's quiet worktrees; returns [{worktree, folder, gb}] of what went (or would go, with dryRun) */
export function sweep(root, { now = Date.now(), quietMin = QUIET_MIN, dryRun = false, measure = sizeGb } = {}) {
  const wts = join(root, '.claude/worktrees');
  if (!existsSync(wts)) return [];
  const names = buildNames(root);
  const isBuild = (n) => names.some((r) => r.test(n));
  const gone = [], keep = new Set(keptNames(root));
  // the newest finished build (of the quiet worktrees) is always kept: the one the user is most likely to open (a sweep once removed
  // the build being played); a worktree still being worked on is kept anyway
  const built = readdirSync(wts, { withFileTypes: true }).filter((w) => w.isDirectory()).map((w) => {
    const dir = join(wts, w.name); let t = 0;
    for (const b of readdirSync(dir, { withFileTypes: true })) if (b.isDirectory() && isBuild(b.name)) try { t = Math.max(t, statSync(join(dir, b.name)).mtimeMs, ...readdirSync(join(dir, b.name)).map((f) => statSync(join(dir, b.name, f)).mtimeMs)); } catch { /* gone */ }
    return { name: w.name, t };
  }).filter((w) => w.t > 0 && now - lastChange(join(wts, w.name), isBuild) >= quietMin * 60000).sort((a, b) => b.t - a.t);
  if (built.length) keep.add(built[0].name);
  for (const w of readdirSync(wts, { withFileTypes: true })) {
    if (!w.isDirectory() || keep.has(w.name)) continue;
    const dir = join(wts, w.name);
    if (now - lastChange(dir, isBuild) < quietMin * 60000) continue;
    for (const b of readdirSync(dir, { withFileTypes: true })) {
      if (!b.isDirectory() || !isBuild(b.name)) continue;
      const p = join(dir, b.name);
      gone.push({ worktree: w.name, folder: b.name, gb: measure(p) });
      if (!dryRun) rmSync(p, { recursive: true, force: true });
    }
  }
  return gone;
}

function freeGb(root) {
  try { const s = statfsSync(root); return (s.bavail * s.bsize) / 1e9; } catch { return Infinity; }
}

function main(text) {
  const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  if (process.argv.includes('--now')) {
    const dry = process.argv.includes('--dry-run');
    const gone = sweep(root, { dryRun: dry });
    for (const g of gone) console.log(`${dry ? 'would remove' : 'removed'} .claude/worktrees/${g.worktree}/${g.folder} (${g.gb.toFixed(1)} GB)`);
    console.log(`build-sweep: ${gone.length} build folder(s), ${gone.reduce((a, g) => a + g.gb, 0).toFixed(1)} GB ${dry ? 'would go' : 'freed'}; ${freeGb(root).toFixed(0)} GB free`);
    return 0;
  }
  let event = {};
  try { event = JSON.parse(text || '{}'); } catch { /* no event */ }
  // the sweep runs on its own, so a session's start or an agent's stop never waits on a large delete
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--now'], { cwd: root, detached: true, stdio: 'ignore', env: process.env });
  child.unref();
  const free = freeGb(root);
  if (event.hook_event_name === 'SessionStart' && free < LOW_GB) {
    console.log(`build-sweep: the disk has ${free.toFixed(0)} GB free (under ${LOW_GB}). Quiet agent worktrees' builds are being removed; ` +
      'if it stays low, see what else holds the space before starting agents that build.');
  }
  return 0;
}

function selftest() {
  const root = mkdtempSync(join(tmpdir(), 'build-sweep-'));
  const put = (p, t) => { mkdirSync(join(root, p, '..'), { recursive: true }); writeFileSync(join(root, p), 'x'); utimesSync(join(root, p), t / 1000, t / 1000); };
  const now = Date.now(), old = now - 5 * 3600e3, fresh = now - 10 * 60e3;
  mkdirSync(join(root, '.claude'), { recursive: true });
  writeFileSync(join(root, '.claude/layout.json'), JSON.stringify({ buildOutput: ['out/**', 'build-*/**'], keepWorktrees: ['night'] }));
  put('out/app.o', old);                                                          // the main checkout's build: never swept
  put('.claude/worktrees/done/src/a.cpp', old); put('.claude/worktrees/done/out/x.o', old); put('.claude/worktrees/done/build-proof/y.o', old);
  put('.claude/worktrees/editing/src/a.cpp', fresh); put('.claude/worktrees/editing/out/x.o', old);
  put('.claude/worktrees/building/src/a.cpp', old); put('.claude/worktrees/building/out/.ninja_log', fresh);
  put('.claude/worktrees/done/outside/z.txt', old);                               // a folder that only looks like a build name
  put('.claude/worktrees/night/src/a.cpp', old - 3600e3); put('.claude/worktrees/night/out/app.o', old - 3600e3);   // named in keepWorktrees
  put('.claude/worktrees/latest/src/a.cpp', old); put('.claude/worktrees/latest/out/app.o', old + 60e3);          // the newest build, quiet
  for (const d of ['done', 'editing', 'building', 'night', 'latest']) for (const p of [join(root, '.claude/worktrees', d), join(root, '.claude/worktrees', d, 'src')]) utimesSync(p, old / 1000, old / 1000);
  for (const p of ['out', 'build-proof', 'outside']) if (existsSync(join(root, '.claude/worktrees/done', p))) utimesSync(join(root, '.claude/worktrees/done', p), old / 1000, old / 1000);
  utimesSync(join(root, '.claude/worktrees/editing/out'), old / 1000, old / 1000);
  utimesSync(join(root, '.claude/worktrees/building/out'), old / 1000, old / 1000);
  utimesSync(join(root, '.claude/worktrees/night/out'), (old - 3600e3) / 1000, (old - 3600e3) / 1000);
  utimesSync(join(root, '.claude/worktrees/latest/out'), (old + 60e3) / 1000, (old + 60e3) / 1000);
  const dry = sweep(root, { now, measure: () => 0, dryRun: true });
  const dryKept = existsSync(join(root, '.claude/worktrees/done/out'));
  const gone = sweep(root, { now, measure: () => 0 });
  const has = (p) => existsSync(join(root, p));
  const cases = [
    ['a dry run names the two folders and removes nothing', dry.length === 2 && dryKept, JSON.stringify(dry)],
    ['a quiet worktree loses its out/', !has('.claude/worktrees/done/out')],
    ['and its build-proof/ (a build-* pattern)', !has('.claude/worktrees/done/build-proof')],
    ['but keeps its sources', has('.claude/worktrees/done/src/a.cpp')],
    ['and a folder that only starts like a build name', has('.claude/worktrees/done/outside/z.txt')],
    ['a worktree whose sources changed 10 min ago keeps its build', has('.claude/worktrees/editing/out/x.o')],
    ['a worktree whose build is running keeps it', has('.claude/worktrees/building/out/.ninja_log')],
    ['the main checkout keeps its build', has('out/app.o')],
    ['a worktree named in keepWorktrees keeps its build', has('.claude/worktrees/night/out/app.o')],
    ['the newest build is kept though quiet', has('.claude/worktrees/latest/out/app.o')],
    ['exactly two folders went', gone.length === 2],
  ];
  rmSync(root, { recursive: true, force: true });
  const bad = cases.filter(([, ok]) => !ok);
  for (const [what, , why] of bad) console.log(`build-sweep selftest FAILED: ${what}${why ? ' ' + why : ''}`);
  console.log(bad.length ? `build-sweep selftest: FAIL (${bad.length} of ${cases.length})` : `build-sweep selftest: OK (${cases.length} cases)`);
  return bad.length ? 1 : 0;
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? selftest() : process.argv.includes('--now') ? main('') : await asHook('build-sweep', main));
