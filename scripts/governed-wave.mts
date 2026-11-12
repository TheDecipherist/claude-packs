// The order's heaviest wave replayed through the load governor (typescript order W8.8's measured line): three test runs and a Go
// fuzzer started together, each through `governed`, with the 1-minute load sampled every 5 s. The wave of 2026-11-12 15:11 ran them
// ungoverned (three test runs at 6 files at once, the fuzzer at 4 workers for 600 s) and took 18 cores to load 43; it is never re-run
// ungoverned. This driver also plays the daemon's watchdog (resident/governor-pause.mts, the same class) on the real machine, so the
// ceiling's guarantee is measured too, and writes into the folder named by --out:
//   load.tsv     every 5 s: time, the 1-minute load, the ceiling, the jobs running, paused and waiting
//   jobs.tsv     each job: its start, when the governor granted it, its end, its exit code, its wait and its run
//   summary.txt  the highest load, the samples over the ceiling, the wave's wall, and each job's wait beside its run
//   node scripts/governed-wave.mts --out build/evidence/W8.8 [--fuzz-seconds 600] [--files 18]
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { put } from '../packs/base/hooks/lib/files.mts';
import { budgetOf, inFlight, machineHost } from '../packs/base/hooks/lib/governor.mts';
import { Pauser } from '../packs/base/hooks/resident/governor-pause.mts';

const KIT = fileURLToPath(new URL('..', import.meta.url));
const GOVERNED = join(KIT, 'packs/base/tools/governed.mjs');
const SAMPLE_MS = 5000;
const POLL_MS = 1000;
const TEST_FILES_ASKED = 6;   // each run asked for 6 files at once in the ungoverned wave
const FUZZ_WORKERS_ASKED = 4;

interface Job { name: string; cwd: string; args: string[]; started: number; granted: number | null; ended: number | null; code: number | null }

const flag = (args: readonly string[], name: string, fallback: string): string => { const i = args.indexOf(name); return i >= 0 ? (args[i + 1] ?? fallback) : fallback; };

/** Three test runs over three disjoint thirds of the unit and hook tests, and the fuzzer. */
function wave(fuzzSeconds: number, files: number): Job[] {
  const tests = ['test/unit/lib', 'test/unit/hooks-lib', 'test/hooks/base'].map((dir) =>
    readdirSync(join(KIT, dir)).filter((f) => f.endsWith('.test.mts')).sort().slice(0, files).map((f) => `${dir}/${f}`));
  const job = (name: string, cwd: string, args: string[]): Job => ({ name, cwd, args, started: 0, granted: null, ended: null, code: null });
  return [
    ...tests.map((set, i) => job(`test-${i + 1}`, KIT, ['--for', 'test', '--want', '3', '--priority', '0.6', '--',
      'node', '--import', './test/fresh-tmp.mts', '--test', `--test-concurrency=${TEST_FILES_ASKED}`, ...set])),
    job('fuzz', join(KIT, 'proxy'), ['--for', 'fuzz', '--want', '3', '--priority', '0.3', '--',
      'go', 'test', '-run=^$', '-fuzz=FuzzReadReply', `-fuzztime=${fuzzSeconds}s`, `-parallel=${FUZZ_WORKERS_ASKED}`, '.']),
  ];
}

function start(job: Job, logDir: string): Promise<void> {
  job.started = Date.now();
  return new Promise((done) => {
    const child = spawn('node', [GOVERNED, ...job.args], { cwd: job.cwd, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    const out: string[] = [];
    child.stdout.on('data', (d: Buffer) => out.push(d.toString('utf8')));
    child.stderr.on('data', (d: Buffer) => out.push(d.toString('utf8')));
    child.on('exit', (code) => { job.ended = Date.now(); job.code = code; put(join(logDir, `${job.name}.txt`), out.join('')); done(); });
  });
}

const secs = (ms: number): string => (ms / 1000).toFixed(0);

async function main(args: readonly string[]): Promise<number> {
  const outDir = join(KIT, flag(args, '--out', 'build/evidence/W8.8'));
  const jobs = wave(Number(flag(args, '--fuzz-seconds', '600')), Number(flag(args, '--files', '18')));
  const host = machineHost(process.env);
  const budget = budgetOf(host);
  const pauser = new Pauser({ host, self: process.pid, log: (l) => console.log(l), signal: (pgid, sig) => { try { process.kill(-pgid, sig); } catch { /* gone */ } } });
  const rows = ['time\tload1\tceiling\trunning\tpaused\twaiting'];
  const began = Date.now();
  const ends = jobs.map((j) => start(j, outDir));
  let all = false;
  void Promise.all(ends).then(() => { all = true; });
  let nextSample = began;
  while (!all) {
    const state = inFlight(host);
    for (const job of jobs) if (job.granted === null && state.jobs.some((g) => g.command.includes(job.args.slice(job.args.indexOf('--') + 1).join(' ')))) job.granted = Date.now();
    if (Date.now() >= nextSample) {
      pauser.observe();
      rows.push([secs(Date.now() - began), host.load().toFixed(2), budget.ceiling, state.jobs.filter((j) => j.pausedAt === null).length,
        state.jobs.filter((j) => j.pausedAt !== null).length, state.waiting.length].join('\t'));
      nextSample += SAMPLE_MS;
    }
    await delay(POLL_MS);
  }
  const wall = Date.now() - began;
  put(join(outDir, 'load.tsv'), `${rows.join('\n')}\n`);
  put(join(outDir, 'jobs.tsv'), `${['job\tstart_s\tgranted_s\tend_s\texit\twait_s\trun_s', ...jobs.map((j) => {
    const granted = j.granted ?? j.started;
    return [j.name, secs(j.started - began), secs(granted - began), secs((j.ended ?? 0) - began), j.code, secs(granted - j.started), secs((j.ended ?? 0) - granted)].join('\t');
  })].join('\n')}\n`);
  const loads = rows.slice(1).map((r) => Number(r.split('\t')[1]));
  const over = loads.filter((l) => l > budget.ceiling).length;
  const summary = [`cores ${budget.cores}, budget ${budget.slots} slots, ceiling ${budget.ceiling}; ${loads.length} samples every ${SAMPLE_MS / 1000} s`,
    `highest 1-minute load ${Math.max(...loads).toFixed(2)}; samples over the ceiling: ${over}`, `the wave's wall: ${secs(wall)} s`,
    ...jobs.map((j) => `${j.name}: waited ${secs((j.granted ?? j.started) - j.started)} s, ran ${secs((j.ended ?? 0) - (j.granted ?? j.started))} s, exit ${j.code}`)];
  put(join(outDir, 'summary.txt'), `${summary.join('\n')}\n`);
  console.log(summary.join('\n'));
  return over === 0 && jobs.every((j) => j.code === 0) ? 0 : 1;
}

process.exitCode = await main(process.argv.slice(2));
