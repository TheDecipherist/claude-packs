// KWB-111: one machine-wide core budget for every build and test run, shared by the build queue (buildq.mjs) and
// quiet-test.mjs. The queue limited how many jobs ran, never how big: two allowed jobs at -j18 and a fanned-out test run
// filled 18 cores. A job now gets its share of the budget (its -j or --jobs cut to it, and the variables CMake, CTest and
// make read), and runs at a low priority so the user's own apps stay responsive.
import { existsSync, readFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { join } from 'node:path';

/** The layout's guards, read from the project the job runs in; empty when there is none. */
export function projectLayout(root) {
  const file = join(root, '.claude', 'layout.json');
  try { return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {}; } catch { return {}; }
}

/** Cores every job together may use: BUILDQ_CORES, else layout guards.buildq.cores, else a third of the machine (at least 2). */
export function coreBudget(env = process.env, layout = {}, cores = cpus().length) {
  const asked = Number(env.BUILDQ_CORES ?? layout?.guards?.buildq?.cores);
  if (Number.isFinite(asked) && asked >= 1) return Math.floor(asked);
  return Math.max(2, Math.floor(cores / 3));
}

/** One job's share of the budget, when `slots` jobs may run at once. */
export const shareOf = (budget, slots) => Math.max(1, Math.floor(budget / Math.max(1, slots)));

const COUNT = /^\d+$/;

/** The command with every job count it asks for cut to `most`; ninja asked for none takes every core, so it gets `most`. */
export function capJobs(args, most) {
  const out = [...args];
  let asked = false;
  for (let i = 0; i < out.length; i += 1) {
    const flag = out[i];
    if (['-j', '--jobs', '--parallel', '-l'].includes(flag) && COUNT.test(out[i + 1] ?? '')) {
      if (flag !== '-l') asked = true;
      out[i + 1] = String(Math.min(Number(out[i + 1]), most));
      i += 1;
    } else if (/^-j\d+$/.test(flag)) {
      asked = true;
      out[i] = `-j${Math.min(Number(flag.slice(2)), most)}`;
    } else if (/^--(jobs|parallel)=\d+$/.test(flag)) {
      asked = true;
      const [name, n] = flag.split('=');
      out[i] = `${name}=${Math.min(Number(n), most)}`;
    }
  }
  const exe = (out[0] ?? '').split('/').pop();
  if (exe === 'ninja' && !asked) out.splice(1, 0, `-j${most}`);
  return out;
}

/** The environment with the share named where CMake, CTest and make read a job count. */
export function budgetEnv(env, most) {
  return { ...env, CMAKE_BUILD_PARALLEL_LEVEL: String(most), CTEST_PARALLEL_LEVEL: String(most), MAKEFLAGS: `-j${most}` };
}

/** The command run at a low priority. A build on macOS takes background QoS (spare cores only); a run with timing checks
    (`timing`) keeps every core and only yields (`nice`), so a frame-time check is not measured on throttled cores.
    BUILDQ_PRIORITY=normal runs it as asked. */
export function gentle(command, { platform = process.platform, env = process.env, timing = false } = {}) {
  if (env.BUILDQ_PRIORITY === 'normal') return command;
  if (platform === 'darwin' && !timing) return ['taskpolicy', '-b', ...command];
  if (platform === 'win32') return command;
  return ['nice', '-n', '10', ...command];
}
