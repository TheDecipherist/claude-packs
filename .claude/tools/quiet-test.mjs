#!/usr/bin/env node
// Runs a test command so it never reaches the user's desktop: no window, no browser, no stolen focus. Every test, gate and
// check goes through it, so the settings are made once. A run's exit code is the command's own.
//   node .claude/tools/quiet-test.mjs <command> [args...]
// On Linux a window opens on a virtual display. macOS has none, so the user's app is put back whenever something this run
// started comes to the front, and a project's rig reads QUIET_TEST to stay out of the Dock (the test-quietly skill).
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { isMain } from '../hooks/lib/hook-log.mjs';
import { budgetEnv, capJobs, coreBudget, projectLayout, shareOf } from '../hooks/lib/core-budget.mjs';
const REFUSED = 2;
const SLOTS = Number(process.env.BUILDQ_SLOTS ?? 2); // the build queue's slots: a test run takes one slot's share
const CHECK_EVERY_MS = 300;
/** What every run is told, for each tool that reads its own switch. */
export const QUIET_ENV = { CI: '1', HEADLESS: '1', QUIET_TEST: '1', BROWSER: 'none', ELECTRON_ENABLE_LOGGING: '0' };
const has = (tool, env) => spawnSync('sh', ['-c', `command -v ${tool}`], { env, stdio: 'ignore' }).status === 0;
const low = (command, env) => (has('nice', env) ? ['nice', '-n', '10', ...command] : [...command]);
const WRAPPERS = {
    linux(command, env) {
        if (!env.DISPLAY && !env.WAYLAND_DISPLAY)
            return { command: low(command, env), env };
        if (!has('xvfb-run', env))
            return { refused: 'quiet-test: xvfb-run is not installed, so a window would open on the desktop. Install xvfb.' };
        const { WAYLAND_DISPLAY: _dropped, ...rest } = env;
        return { command: low(['xvfb-run', '-a', ...command], env), env: rest };
    },
    darwin(command, env) {
        return { command: low(command, env), env, guard: true };
    },
};
/** How to run a command here: the wrapped command and its environment, or why it may not run. KWB-111: the run takes a
    build slot's share of the machine's core budget (its --jobs or -j cut to it, and CTest told it), beside the build queue. */
export function plan(command, env = process.env, platform = process.platform, cwd = process.cwd()) {
    const most = shareOf(coreBudget(env, projectLayout(env.CLAUDE_PROJECT_DIR ?? cwd)), SLOTS);
    const quiet = budgetEnv({ ...env, ...QUIET_ENV }, most);
    return (WRAPPERS[platform] ?? ((c, e) => ({ command: low(c, e), env: e })))(capJobs(command, most), quiet);
}
const lines = (tool, args) => execFileSync(tool, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
function frontApp() {
    const asn = lines('lsappinfo', ['front']).trim();
    const info = lines('lsappinfo', ['info', '-only', 'pid', '-only', 'name', asn]);
    return { pid: Number(/"pid"=(\d+)/.exec(info)?.[1]), name: /"LSDisplayName"="([^"]+)"/.exec(info)?.[1] };
}
function startedBy(root, pid) {
    for (let at = pid; at > 1; at = Number(lines('ps', ['-o', 'ppid=', '-p', String(at)]).trim()))
        if (at === root)
            return true;
    return false;
}
/** The user's own switch of app is left alone: only an app this run started is sent back. */
function guardFocus(childPid) {
    let mine = frontApp();
    return setInterval(() => {
        try {
            const now = frontApp();
            if (now.pid === mine.pid)
                return;
            if (startedBy(childPid, now.pid))
                spawnSync('open', ['-a', mine.name ?? '']);
            else
                mine = now;
        }
        catch { /* an app that closed between two looks has nothing to send back */ }
    }, CHECK_EVERY_MS);
}
/** Runs the command quietly; resolves with its exit code (REFUSED when it may not run or could not start). */
export function main(command, env = process.env, platform = process.platform) {
    if (command.length === 0) {
        console.error('usage: node .claude/tools/quiet-test.mjs <command> [args...]');
        return Promise.resolve(REFUSED);
    }
    const run = plan(command, env, platform);
    if (run.refused || !run.command || !run.env) {
        console.error(run.refused);
        return Promise.resolve(REFUSED);
    }
    const [program = '', ...rest] = run.command;
    const child = spawn(program, rest, { env: run.env, stdio: 'inherit' });
    const guard = run.guard && child.pid !== undefined ? guardFocus(child.pid) : undefined;
    return new Promise((resolve) => {
        child.on('error', (error) => {
            console.error(`quiet-test: ${error.message}`);
            resolve(REFUSED);
        });
        child.on('exit', (code, signal) => {
            clearInterval(guard);
            resolve(code ?? (signal ? 1 : 0));
        });
    });
}
if (isMain(import.meta.url))
    process.exit(await main(process.argv.slice(2)));
