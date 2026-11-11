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
// On the hook contract (typescript order W4): a recorder (it deletes build folders, in a child of its own, and refuses nothing).
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readdirSync, rmSync, statSync, statfsSync, utimesSync } from 'node:fs';
import type { Dirent } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { put } from './lib/files.mts';
import { isMain, projectRoot, runAsHook } from './lib/hook-log.mts';
import { readLayout } from './lib/layout.mts';
import { runHook, scratchProject, verdicts } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { Env, Hook, VerdictRow } from './lib/types.d.mts';
import { pass, say } from './lib/verdict.mts';

/** How long a worktree must be quiet before its build goes (BUILD_SWEEP_QUIET_MIN, minutes), and the free space below which the session is told. */
export const quietMinOf = (env: Env): number => Number(env['BUILD_SWEEP_QUIET_MIN'] ?? 120);
export const lowGbOf = (env: Env): number => Number(env['BUILD_SWEEP_LOW_GB'] ?? 40);

/** worktrees a project never sweeps (layout.json "keepWorktrees": names under .claude/worktrees, e.g. the build the user plays) */
export function keptNames(root: string): string[] {
  const kept = readLayout(root)['keepWorktrees'];
  return Array.isArray(kept) ? kept.filter((n): n is string => typeof n === 'string') : [];
}

/** the top-level folder name patterns of the build output, from layout.json "buildOutput" (default build/**) */
export function buildNames(root: string): RegExp[] {
  const out = readLayout(root)['buildOutput'];
  const globs = Array.isArray(out) ? out.filter((g): g is string => typeof g === 'string') : ['build/**'];
  return globs.map((g) => g.split('/')[0] ?? '').filter((n) => n && n !== '**')
    .map((n) => new RegExp(`^${n.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`));
}

const entriesOf = (dir: string): Dirent[] => { try { return readdirSync(dir, { withFileTypes: true }); } catch { return []; } };
const mtimeOf = (path: string): number => { try { return statSync(path).mtimeMs; } catch { return 0; } };

// the newest change in a worktree: its source files to depth 3 (build folders and .git left out), and the top of each build folder
function lastChange(dir: string, isBuild: (name: string) => boolean): number {
  let newest = 0;
  const visit = (d: string, depth: number): void => {
    for (const e of entriesOf(d)) {
      const p = join(d, e.name);
      if (depth === 0 && isBuild(e.name)) {
        if (!e.isDirectory()) continue;
        for (const f of entriesOf(p)) newest = Math.max(newest, mtimeOf(join(p, f.name)));
        continue;
      }
      if (e.name === '.git' || e.name === 'node_modules') continue;
      const t = mtimeOf(p);
      if (t === 0) continue;
      newest = Math.max(newest, t);
      if (e.isDirectory() && depth < 2) visit(p, depth + 1);
    }
  };
  visit(dir, 0);
  return newest;
}

function sizeGb(p: string): number {
  try { return Number(execFileSync('du', ['-sk', p], { encoding: 'utf8', timeout: 120000 }).split('\t')[0]) / 1048576; } catch { return 0; }
}

/** What a sweep needs: the time it judges quiet against (ms), how long is quiet (minutes), and whether to only say. */
export interface SweepOptions { now: number; quietMin: number; dryRun?: boolean; measure?: (path: string) => number }
/** One build folder that went (or would go, with dryRun). */
export interface Swept { worktree: string; folder: string; gb: number }

/** sweep a project's quiet worktrees; returns what went (or would go, with dryRun) */
export function sweep(root: string, { now, quietMin, dryRun = false, measure = sizeGb }: SweepOptions): Swept[] {
  const wts = join(root, '.claude/worktrees');
  if (!existsSync(wts)) return [];
  const isBuild = (n: string): boolean => buildNames(root).some((r) => r.test(n));
  const quiet = (name: string): boolean => now - lastChange(join(wts, name), isBuild) >= quietMin * 60000;
  const gone: Swept[] = [];
  const keep = new Set(keptNames(root));
  // the newest finished build (of the quiet worktrees) is always kept: the one the user is most likely to open (a sweep once removed
  // the build being played); a worktree still being worked on is kept anyway
  const newestBuild = (name: string): number => {
    const dir = join(wts, name);
    return Math.max(0, ...entriesOf(dir).filter((b) => b.isDirectory() && isBuild(b.name)).flatMap((b) => [mtimeOf(join(dir, b.name)), ...entriesOf(join(dir, b.name)).map((f) => mtimeOf(join(dir, b.name, f.name)))]));
  };
  const built = entriesOf(wts).filter((w) => w.isDirectory()).map((w) => ({ name: w.name, t: newestBuild(w.name) }))
    .filter((w) => w.t > 0 && quiet(w.name)).sort((a, b) => b.t - a.t);
  const newest = built[0];
  if (newest) keep.add(newest.name);
  for (const w of entriesOf(wts)) {
    if (!w.isDirectory() || keep.has(w.name) || !quiet(w.name)) continue;
    const dir = join(wts, w.name);
    for (const b of entriesOf(dir)) {
      if (!b.isDirectory() || !isBuild(b.name)) continue;
      const p = join(dir, b.name);
      gone.push({ worktree: w.name, folder: b.name, gb: measure(p) });
      if (!dryRun) rmSync(p, { recursive: true, force: true });
    }
  }
  return gone;
}

function freeGb(root: string): number {
  try { const s = statfsSync(root); return (s.bavail * s.bsize) / 1e9; } catch { return Infinity; }
}

/** What `--now` prints: each folder that went and the totals. */
export function sweepReport(gone: readonly Swept[], dry: boolean, free: number): string[] {
  return [
    ...gone.map((g) => `${dry ? 'would remove' : 'removed'} .claude/worktrees/${g.worktree}/${g.folder} (${g.gb.toFixed(1)} GB)`),
    `build-sweep: ${gone.length} build folder(s), ${gone.reduce((a, g) => a + g.gb, 0).toFixed(1)} GB ${dry ? 'would go' : 'freed'}; ${free.toFixed(0)} GB free`,
  ];
}

export const hook: Hook = (event, ctx) => {
  // the sweep runs on its own, so a session's start or an agent's stop never waits on a large delete
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--now'], { cwd: ctx.projectDir, detached: true, stdio: 'ignore', env: { ...ctx.env } });
  child.unref();
  const free = freeGb(ctx.projectDir);
  const low = lowGbOf(ctx.env);
  if (event.hook_event_name === 'SessionStart' && free < low) {
    return say(`build-sweep: the disk has ${free.toFixed(0)} GB free (under ${low}). Quiet agent worktrees' builds are being removed; ` +
      'if it stays low, see what else holds the space before starting agents that build.\n');
  }
  return pass;
};

/** A session starting in a worktree sweeps in the background and refuses nothing. */
export const worktreeCase: WorktreeCase = {
  steps: [{ label: 'a SessionStart from the worktree', event: { hook_event_name: 'SessionStart', cwd: '{wt}' }, want: 0 }],
};

const HOUR = 3600e3;
const MIN = 60e3;
// What the sweep's selftest plants: a file, and how long before `now` it was last changed (ms). The folders holding them are
// made as old as their oldest file.
const PLANTED: readonly (readonly [rel: string, age: number])[] = [
  ['out/app.o', 5 * HOUR],                                                                        // the main checkout's build: never swept
  ['.claude/worktrees/done/src/a.cpp', 5 * HOUR], ['.claude/worktrees/done/out/x.o', 5 * HOUR], ['.claude/worktrees/done/build-proof/y.o', 5 * HOUR],
  ['.claude/worktrees/done/outside/z.txt', 5 * HOUR],                                             // a folder that only looks like a build name
  ['.claude/worktrees/editing/src/a.cpp', 10 * MIN], ['.claude/worktrees/editing/out/x.o', 5 * HOUR],
  ['.claude/worktrees/building/src/a.cpp', 5 * HOUR], ['.claude/worktrees/building/out/.ninja_log', 10 * MIN],
  ['.claude/worktrees/night/src/a.cpp', 6 * HOUR], ['.claude/worktrees/night/out/app.o', 6 * HOUR],   // named in keepWorktrees
  ['.claude/worktrees/latest/src/a.cpp', 5 * HOUR], ['.claude/worktrees/latest/out/app.o', 5 * HOUR - MIN],   // the newest build, quiet
];

function sweepRows(): VerdictRow[] {
  const root = scratchProject({}, { folders: {}, concepts: {}, buildOutput: ['out/**', 'build-*/**'], keepWorktrees: ['night'] });
  const now = 1_800_000_000_000;
  const stamp = (rel: string, age: number): void => { const t = (now - age) / 1000; utimesSync(join(root, rel), t, t); };
  for (const [rel, age] of PLANTED) { put(join(root, rel), 'x'); stamp(rel, age); }
  // each folder as old as its file (a file written 10 min ago, the edit or the running build, leaves its folder old: the file says so)
  for (const [rel, age] of PLANTED) {
    const folders = rel.split('/').slice(0, -1);
    for (let n = folders.length; n > 0 && !['.claude', '.claude/worktrees'].includes(folders.slice(0, n).join('/')); n -= 1) stamp(folders.slice(0, n).join('/'), age < HOUR ? 5 * HOUR : age);
  }
  const options = { now, quietMin: 120, measure: (): number => 0 };
  const dry = sweep(root, { ...options, dryRun: true });
  const dryKept = existsSync(join(root, '.claude/worktrees/done/out'));
  const gone = sweep(root, options);
  const has = (p: string): number => (existsSync(join(root, p)) ? 1 : 0);
  return [
    ['a dry run names the two folders and removes nothing', dry.length === 2 && dryKept ? 1 : 0, 1],
    ['a quiet worktree loses its out/', has('.claude/worktrees/done/out'), 0],
    ['and its build-proof/ (a build-* pattern)', has('.claude/worktrees/done/build-proof'), 0],
    ['but keeps its sources', has('.claude/worktrees/done/src/a.cpp'), 1],
    ['and a folder that only starts like a build name', has('.claude/worktrees/done/outside/z.txt'), 1],
    ['a worktree whose sources changed 10 min ago keeps its build', has('.claude/worktrees/editing/out/x.o'), 1],
    ['a worktree whose build is running keeps it', has('.claude/worktrees/building/out/.ninja_log'), 1],
    ['the main checkout keeps its build', has('out/app.o'), 1],
    ['a worktree named in keepWorktrees keeps its build', has('.claude/worktrees/night/out/app.o'), 1],
    ['the newest build is kept though quiet', has('.claude/worktrees/latest/out/app.o'), 1],
    ['exactly two folders went', gone.length, 2],
  ];
}

export function selftest(): number {
  const dir = scratchProject();
  const hookFile = fileURLToPath(import.meta.url);
  return verdicts('build-sweep', [
    ...sweepRows(),
    ['the hook through the runner refuses nothing (it sweeps in a child of its own)', runHook(hookFile, dir, { hook_event_name: 'SessionStart' }).status, 0],
    ['the report counts what went', sweepReport([{ worktree: 'a', folder: 'out', gb: 1.25 }], false, 50).join('|'),
      'removed .claude/worktrees/a/out (1.3 GB)|build-sweep: 1 build folder(s), 1.3 GB freed; 50 GB free'],
  ]);
}

if (isMain(import.meta.url)) {
  const env = process.env;
  await runAsHook(import.meta.url, 'build-sweep', hook, selftest, {
    flags: {
      '--now': (args) => {
        const dry = args.includes('--dry-run');
        const root = projectRoot();
        for (const line of sweepReport(sweep(root, { now: Date.now(), quietMin: quietMinOf(env), dryRun: dry }), dry, freeGb(root))) console.log(line);
        return 0;
      },
    },
  });
}
