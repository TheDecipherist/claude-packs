// time-guard's findings: what a table of the machine's processes says is slow, and which command only looks. Pure: no process,
// no file, no clock (the hook reads them and hands them in).
//   machineFindings(rows, own, cfg) -> [[key, message]]   a panel export, headless Chromes and, among the processes this session
//     started (own-processes.mts, KWB-87), a build, a ctest run, a probe and a wait loop that has run too long
//   readOnlyCommand(cmd) -> true when every part of the command only looks (a `cd` first is only where)
import { cutHeredocs } from './shell-lex.mts';

/** One process: its pid, its age in seconds and its command line. */
export type Row = readonly [pid: number, age: number, cmd: string];
/** A finding: the key it is said once under, and what it says. */
export type Finding = readonly [key: string, message: string];

/** Project values: .claude/layout.json "guards": { "time": { "probePattern", "saveCommand" } }. */
export interface TimeCfg { probePattern: string; saveCommand: string }

export const DEFAULTS: TimeCfg = {
  probePattern: '\\S*/\\w*(?:Probe|_probe)\\b', // the probe binary itself, never a shell that names one
  saveCommand: 'git add <paths> && git commit -m "<note>" -- <paths>',
};

/** The limits, in minutes unless the name says otherwise. */
export const LIMITS = {
  slowCall: 10, exportMin: 5, chromeMax: 6, chromeMin: 5, build: 30, ctest: 45, probe: 20,
  quiet: 60, save: 30, scan: 15, waitLoop: 60, repeat: 10, lookEveryS: 60,
} as const;

const mins = (s: number): number => s / 60;

// rows: [pid, age in s, command]; own: the pids this session started, or null when that cannot be known (then every process)
export function machineFindings(rows: readonly Row[], own: ReadonlySet<number> | null, cfg: TimeCfg): Finding[] {
  const f: Finding[] = [];
  const headless = rows.filter((r) => /Google Chrome(?: for Testing)?(?:\.app\/Contents\/MacOS\/\S+)?\s.*--headless/.test(r[2]) && !r[2].includes('Helper'));
  if (headless.length > LIMITS.chromeMax) {
    f.push(['chrome-count', `${headless.length} headless Chromes are running at once (more than ${LIMITS.chromeMax}): something is starting one per picture again. ` +
      'Find it (ps -axo pid,etime,command | grep -- --headless) and stop it; Chrome is started only by kit/synthpanel-creator/src/onechrome.js, for a whole batch']);
  }
  for (const [pid, age] of headless) {
    if (mins(age) > LIMITS.chromeMin) f.push([`chrome-old-${pid}`, `a headless Chrome (pid ${pid}) has run ${mins(age).toFixed(0)} min: it is stuck or leaked. Find who started it and why it never finished; stop it by its pid`]);
  }
  const probe = new RegExp(`^(?:${cfg.probePattern})`);
  for (const [pid, age, cmd] of rows) {
    const m = mins(age).toFixed(0);
    if (/node \S*synthpanel\S*\.js export-native/.test(cmd) && mins(age) > LIMITS.exportMin) {
      f.push([`export-${pid}`, `a panel export (pid ${pid}) has run ${m} min; one takes seconds since B-382 (one Chrome, a cache of every picture). It is stuck: find why before waiting longer`]);
    } else if (own && !own.has(pid)) {
      continue; // another session's build, test run, probe or loop (KWB-87)
    } else if (/^\S*ctest\b/.test(cmd) && mins(age) > LIMITS.ctest) {
      f.push([`ctest-${pid}`, `a ctest run (pid ${pid}) has run ${m} min (more than ${LIMITS.ctest}): find the slow test (ctest prints each as it ends) instead of waiting for all of them`]);
    } else if (/^\S*(?:cmake\s+--build|\/make|make|ninja)\b/.test(cmd) && mins(age) > LIMITS.build) { // the build itself, not a shell naming it
      f.push([`build-${pid}`, `a build (pid ${pid}) has run ${m} min (more than ${LIMITS.build}): look at the load (uptime) and what else is building`]);
    } else if (probe.test(cmd) && mins(age) > LIMITS.probe) {
      f.push([`probe-${pid}`, `a probe (pid ${pid}: ${(cmd.split(/\s+/)[0] ?? '').split('/').pop() ?? ''}) has run ${m} min (more than ${LIMITS.probe}): every probe has a time limit; find what it is waiting on`]);
    } else if (/\buntil\b.*;\s*do\s+sleep\b/.test(cmd) && mins(age) > LIMITS.waitLoop) {
      f.push([`waitloop-${pid}`, `a wait loop (pid ${pid}) has run ${m} min: whatever it waits for is finished or dead. Stop it (kill ${pid}); wait on a background command's own notification instead of a loop`]);
    }
  }
  return f;
}

// A command that only looks: every segment starts with a read-only program (a `cd` first is only where), no redirect.
const LOOKS: ReadonlySet<string> = new Set(['ls', 'cat', 'head', 'tail', 'grep', 'rg', 'find', 'wc', 'stat', 'pwd', 'echo', 'file', 'diff', 'du', 'tree', 'sort', 'cut', 'awk']);
const GIT_LOOKS: ReadonlySet<string> = new Set(['status', 'log', 'diff', 'show', 'branch', 'rev-parse', 'ls-files', 'ls-remote', 'worktree', 'remote', 'blame']);

export function readOnlyCommand(cmd: string): boolean {
  const body = cutHeredocs(cmd).text;
  if (/(?:^|[^-=])>|\btee\b|\$\(|`/.test(body.replace(/2>&1|>\s*\/dev\/null/g, ''))) return false;
  const segs = body.split(/&&|\|\||;|\||\n/).map((x) => x.trim()).filter((x) => x && !/^cd(\s|$)/.test(x));
  return segs.length > 0 && segs.every((x) => {
    const w = x.split(/\s+/);
    const subcommand = w.find((a, i) => i && !a.startsWith('-') && w[i - 1] !== '-C') ?? '';
    return LOOKS.has(w[0] ?? '') || (w[0] === 'git' && GIT_LOOKS.has(subcommand));
  });
}
