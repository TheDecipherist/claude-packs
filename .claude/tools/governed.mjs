#!/usr/bin/env node
// governed (typescript order W8.8 item 3): a heavy command run through the load governor. It takes a grant for the job's kind and
// weight, waiting quietly in the governor's queue while the slots or the live load say no (one line of its state on stderr every 30 s,
// inside its own tool call: never a turn spent polling); then starts the command in a process group of its own, at a low priority
// (`nice -n 15`, on every core: KWB-149), with the concurrency it was granted set for it (CLAUDE_PACKS_TEST_CORES, -j,
// CMAKE_BUILD_PARALLEL_LEVEL, GOMAXPROCS, -parallel on `go test -fuzz`, --test-concurrency), frees the grant when the command ends
// (a kill frees it by the stale rule: the grant is held by this process's pid), and exits with the command's own code.
//   governed [--for test|build|fuzz|agent|install|other] [--want N] [--priority P] -- <command> [args...]
// The PreToolUse Bash hook `governor-route` puts every heavy command through it. A command started inside a governed job
// (CLAUDE_PACKS_GOVERNED is set) runs as it is: its job already holds the grant.
import { spawn } from 'node:child_process';
import { basename } from 'node:path';
import { constants } from 'node:os';
import { adopt, free, grantWhenFree, machineHost } from '../hooks/lib/governor.mjs';
import { DEFAULT_WANT } from '../hooks/lib/governor-budget.mjs';
import { isKind } from '../hooks/lib/governor-store.mjs';
import { capJobs } from '../hooks/lib/core-budget.mjs';
import { isMain } from '../hooks/lib/project.mjs';
const USAGE = 'usage: governed [--for KIND] [--want N] [--priority P] -- <command> [args...]';
/** The variable a governed job's children see: the grant's id. */
export const GOVERNED_ENV = 'CLAUDE_PACKS_GOVERNED';
/** How often a waiting job says where it stands. */
export const SAY_EVERY_MS = 30_000;
/** The niceness a job runs at where there is no taskpolicy. */
const NICE = '15';
/** A command ended by a signal exits as a shell reports it: 128 plus the signal's number. */
const SIGNAL_BASE = 128;
function parse(args, env) {
    const dash = args.indexOf('--');
    const flags = dash < 0 ? [] : args.slice(0, dash);
    const command = dash < 0 ? [...args] : args.slice(dash + 1);
    const fromEnv = env['CLAUDE_PACKS_PRIORITY'];
    const out = { kind: 'other', want: undefined, priority: fromEnv ? Number(fromEnv) : undefined, command };
    for (let i = 0; i < flags.length; i += 2) {
        const [flag = '', value = ''] = [flags[i], flags[i + 1]];
        if (flag === '--for' && isKind(value))
            out.kind = value;
        else if (flag === '--want' && Number(value) >= 1)
            out.want = Math.floor(Number(value));
        else if (flag === '--priority' && value !== '' && Number(value) >= 0 && Number(value) <= 1)
            out.priority = Number(value);
        else
            return `governed: ${flag} ${value}: not a flag and value it takes`;
    }
    return command.length > 0 ? out : 'governed: no command after --';
}
/** What a test run asks for: the cores its caller already set (CLAUDE_PACKS_TEST_CORES), else the table's weight. */
function wantOf(p, env) {
    const set = Number(env['CLAUDE_PACKS_TEST_CORES']);
    const want = p.want ?? DEFAULT_WANT[p.kind];
    return p.kind === 'test' && set >= 1 ? Math.min(want, Math.floor(set)) : want;
}
/** The command with the granted concurrency in its own flags, where the program takes one directly: make's and ninja's -j (cut, or
 *  added), `go test -fuzz`'s -parallel, `node --test`'s --test-concurrency. Everything else reads the environment. */
export function withFlags(command, grant) {
    const [program = '', ...rest] = command;
    const name = basename(program);
    const n = grant.slots;
    if (name === 'make' || name === 'gmake' || name === 'ninja') {
        const capped = capJobs(command, n);
        return capped.some((a) => /^-j\d*$|^--jobs/.test(a)) ? capped : [program, `-j${n}`, ...rest];
    }
    if (name === 'go' && rest[0] === 'test' && rest.some((a) => /^-{1,2}fuzz(?:=|$)/.test(a))) {
        const kept = [];
        for (let i = 0; i < rest.length; i += 1) {
            const arg = rest[i] ?? '';
            if (/^-{1,2}parallel=/.test(arg))
                continue;
            if (/^-{1,2}parallel$/.test(arg)) {
                i += 1;
                continue;
            } // and its value
            kept.push(arg);
        }
        return [program, ...kept, grant.kind === 'fuzz' ? (grant.settings.flags[0] ?? `-parallel=${n}`) : `-parallel=${n}`];
    }
    if (name !== 'node' || !rest.includes('--test'))
        return [...command];
    // a concurrency the command asked for is cut to the grant; none asked for gets the grant
    const asked = rest.find((a) => a.startsWith('--test-concurrency='));
    if (asked === undefined)
        return [program, `--test-concurrency=${n}`, ...rest];
    return [program, ...rest.map((a) => (a === asked ? `--test-concurrency=${Math.min(n, Number(a.split('=')[1]) || n)}` : a))];
}
/** The environment a granted job starts with: the grant's settings, but a lower count the caller already set is kept. */
export function grantedEnv(env, grant) {
    const out = { ...env, [GOVERNED_ENV]: grant.id };
    for (const [name, value] of Object.entries(grant.settings.env)) {
        const had = Number(env[name]);
        out[name] = name !== 'MAKEFLAGS' && had >= 1 && had < Number(value) ? String(had) : value;
    }
    return out;
}
/** The command at a low priority, nice on every platform but Windows: macOS's background QoS (`taskpolicy -b`) held work to the
 *  lower, slower core tier at a low clock (an M5 Max has 6 Super and 12 Performance cores and no efficiency cores; KWB-149; the user, 2026-11-12: "it doesnt seem like we use the fast cores"), and the governor's budget and
 *  ceiling already keep the last 20 % free, so a job may use every core at a lower priority. */
export const lowPriority = (command, platform) => platform === 'win32' ? [...command] : ['nice', '-n', NICE, ...command];
/** Runs the command in its own process group and resolves with its exit code; a signal to this process goes to the whole group. */
function runGroup(command, env, cwd, started) {
    return new Promise((done) => {
        const [program = '', ...rest] = command;
        const child = spawn(program, rest, { stdio: 'inherit', env, cwd, detached: true });
        const pass = (signal) => { if (child.pid !== undefined)
            try {
                process.kill(-child.pid, signal);
            }
            catch { /* gone */ } };
        const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'].map((s) => [s, () => pass(s)]);
        for (const [s, f] of signals)
            process.on(s, f);
        if (child.pid !== undefined)
            started(child.pid);
        const end = (code) => { for (const [s, f] of signals)
            process.off(s, f); done(code); };
        child.on('error', (e) => { process.stderr.write(`governed: ${program}: ${e.message}\n`); end(1); });
        child.on('exit', (code, signal) => end(code ?? SIGNAL_BASE + (signal === null ? 0 : constants.signals[signal])));
    });
}
/** The tool: takes the grant (waiting while it must), runs the command with it, frees it; the command's exit code (2 on a usage fault). */
export async function governed(args, caller, host = machineHost(caller.env)) {
    const p = parse(args, caller.env);
    if (typeof p === 'string') {
        caller.say(`${p}\n${USAGE}`);
        return 2;
    }
    if (caller.env[GOVERNED_ENV])
        return runGroup(p.command, { ...caller.env }, caller.cwd, () => undefined);
    const project = caller.env['CLAUDE_PROJECT_DIR'] || caller.cwd;
    let saidAt = -Infinity;
    const onWait = (answer, waited) => {
        if (waited - saidAt < SAY_EVERY_MS)
            return;
        saidAt = waited;
        caller.say(`governed: waiting ${Math.round(waited / 1000)} s for ${p.command.join(' ').slice(0, 80)}: ${answer.line}`);
    };
    const grant = grantWhenFree(host, { kind: p.kind, want: wantOf(p, caller.env), priority: p.priority, project, pid: caller.pid,
        command: p.command.join(' ') }, onWait);
    try {
        const command = lowPriority(withFlags(p.command, grant), caller.platform);
        return await runGroup(command, grantedEnv(caller.env, grant), caller.cwd, (pgid) => { adopt(host, grant.id, pgid); });
    }
    finally {
        free(host, grant.id);
    }
}
if (isMain(import.meta.url)) {
    const caller = { env: process.env, cwd: process.cwd(), pid: process.pid, platform: process.platform, say: (line) => { process.stderr.write(`${line}\n`); } };
    process.exitCode = await governed(process.argv.slice(2), caller);
}
