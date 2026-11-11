// KWB-111: one machine-wide core budget for every build and test run, shared by the build queue (buildq.mjs) and
// quiet-test.mjs. The queue limited how many jobs ran, never how big: two allowed jobs at -j18 and a fanned-out test run
// filled 18 cores. A job now gets its share of the budget (its -j or --jobs cut to it, and the variables CMake, CTest and
// make read), and runs at a low priority so the user's own apps stay responsive.
// The environment, the platform and the layout are the caller's to pass, never read from the process here.
import { cpus } from 'node:os';
import { join } from 'node:path';
import { readJson } from './json.mjs';
/** The layout's guards, read from the project the job runs in; empty when there is none. */
export function projectLayout(root) {
    const layout = readJson(join(root, '.claude', 'layout.json'));
    return typeof layout === 'object' && layout !== null && !Array.isArray(layout) ? layout : {};
}
/** Cores every job together may use: BUILDQ_CORES, else layout guards.buildq.cores, else a third of the machine (at least 2). */
export function coreBudget(env, layout = {}, cores = cpus().length) {
    const asked = Number(env.BUILDQ_CORES ?? layout?.guards?.buildq?.cores);
    if (Number.isFinite(asked) && asked >= 1)
        return Math.floor(asked);
    return Math.max(2, Math.floor(cores / 3));
}
/** One job's share of the budget, when `slots` jobs may run at once. */
// KWB-150: by the jobs running as it starts, its own counted, so a build alone takes the whole budget; never less than the
// slot's share (budget ÷ slots), so more jobs than slots (a dead one's slot being taken back) cannot starve it. No count:
// the slot's share.
export const shareOf = (budget, slots, running = slots) => Math.max(1, Math.floor(budget / Math.max(1, Math.min(slots, running))));
const COUNT = /^\d+$/;
/** The command with every job count it asks for cut to `most`; ninja asked for none takes every core, so it gets `most`. */
export function capJobs(args, most) {
    const out = [...args];
    let asked = false;
    for (let i = 0; i < out.length; i += 1) {
        const flag = out[i] ?? '';
        const next = out[i + 1] ?? '';
        if (['-j', '--jobs', '--parallel', '-l'].includes(flag) && COUNT.test(next)) {
            if (flag !== '-l')
                asked = true;
            out[i + 1] = String(Math.min(Number(next), most));
            i += 1;
        }
        else if (/^-j\d+$/.test(flag)) {
            asked = true;
            out[i] = `-j${Math.min(Number(flag.slice(2)), most)}`;
        }
        else if (/^--(jobs|parallel)=\d+$/.test(flag)) {
            asked = true;
            const [name, n] = flag.split('=');
            out[i] = `${name}=${Math.min(Number(n), most)}`;
        }
    }
    const exe = (out[0] ?? '').split('/').pop();
    if (exe === 'ninja' && !asked)
        out.splice(1, 0, `-j${most}`);
    return out;
}
/** The environment with the share named where CMake, CTest and make read a job count. */
export function budgetEnv(env, most) {
    return { ...env, CMAKE_BUILD_PARALLEL_LEVEL: String(most), CTEST_PARALLEL_LEVEL: String(most), MAKEFLAGS: `-j${most}` };
}
/** The command run at a low priority: it yields to the user's own apps (`nice`) and keeps every core. Background QoS
    (`taskpolicy -b`) is never used: macOS runs it on the efficiency cores only, and a Mac's build took 2.5 cores of 18 with
    its fan never on (KWB-149). BUILDQ_PRIORITY=normal runs it as asked. */
export function gentle(command, { platform, env }) {
    if (env.BUILDQ_PRIORITY === 'normal')
        return [...command];
    if (platform === 'win32')
        return [...command];
    return ['nice', '-n', '10', ...command];
}
