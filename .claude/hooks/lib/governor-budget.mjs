// The load governor's budget (typescript order W8.8 item 1): the machine it runs on (cores, 1-minute load, clock, which pids are alive)
// and what may be granted on it: slots, 60 % of the cores by default, and a load ceiling, 70 % by default. The last 20 % of the cores
// is never granted (item 0b, the user: "we can never use the last 20%. thats reserved for the system and you"): a hard limit no
// setting can raise. The user's own budget is ~/.config/claude-packs/governor.json; a project's layout may lower it, never raise it.
//   machineHost(env) -> the real machine     budgetOf(host, project) -> { cores, slots, ceiling }     coresOf(setting, cores)
import { availableParallelism, homedir, loadavg } from 'node:os';
import { join } from 'node:path';
import { alive } from './daemon-find.mjs';
import { isRecord, readJson } from './json.mjs';
/** The budget's default share of the cores, the load ceiling's, and the share nothing may pass. */
export const BUDGET_SHARE = 0.6;
export const CEILING_SHARE = 0.7;
export const HARD_SHARE = 0.8;
/** What a take with no want asks for, by kind: a test run at 3, a fuzzer at 2 workers and its coordinator, an agent's own process
 *  at 1. A build asks for its share through buildq's own core budget instead (`upTo`). */
export const DEFAULT_WANT = { test: 3, build: 4, fuzz: 3, agent: 1, install: 2, other: 2 };
/** The machine this process runs on, read through the caller's environment. CLAUDE_PACKS_GOVERNOR_CORES and CLAUDE_PACKS_GOVERNOR_LOAD plant the cores and the load for a
 *  test (the load W8.7's sampler sees is the same kernel number, `vm.loadavg`, so this reads it directly). */
export function machineHost(env) {
    const plantedCores = Number(env['CLAUDE_PACKS_GOVERNOR_CORES']);
    const plantedLoad = env['CLAUDE_PACKS_GOVERNOR_LOAD'];
    return {
        env,
        home: env['HOME'] || homedir(),
        cores: plantedCores >= 1 ? Math.floor(plantedCores) : availableParallelism(),
        load: () => (plantedLoad !== undefined && plantedLoad !== '' ? Number(plantedLoad) : loadavg()[0] ?? 0),
        now: Date.now,
        alive,
    };
}
/** `~/.config/claude-packs/governor.json` (XDG_CONFIG_HOME): `{ "budget": 0.6 | 8, "ceiling": 0.7 | 12 }`. */
export const governorConfig = (env, home) => join(env['XDG_CONFIG_HOME'] || join(home, '.config'), 'claude-packs', 'governor.json');
/** A setting as cores: a share up to 1 (0.6; 1 is all of them), a count over 1 (8), a percentage ("60%"); null when it is none. */
export function coresOf(value, cores) {
    const text = typeof value === 'string' ? value.trim() : '';
    const pct = text.endsWith('%') ? Number(text.slice(0, -1)) / 100 : null;
    const n = pct ?? (typeof value === 'number' ? value : text === '' ? NaN : Number(text));
    if (!Number.isFinite(n) || n <= 0)
        return null;
    return n <= 1 || pct !== null ? n * cores : n;
}
/** The project's own cap, `.claude/layout.json` "guards": { "governor": { "budget": ... } }: it may lower the budget, never raise it. */
function projectCap(project, cores) {
    if (!project)
        return null;
    const layout = readJson(join(project, '.claude', 'layout.json'));
    const guards = isRecord(layout) ? layout['guards'] : null;
    const governor = isRecord(guards) ? guards['governor'] : null;
    return isRecord(governor) ? coresOf(governor['budget'], cores) : null;
}
/** The budget: the machine's file, else 60 % of the cores for slots and 70 % for the ceiling, lowered by the project, and both held
 *  under 80 % of the cores whatever any setting says (at least 1 each). */
export function budgetOf(host, project) {
    const file = readJson(governorConfig(host.env, host.home));
    const config = isRecord(file) ? file : {};
    const hard = Math.max(1, Math.floor(host.cores * HARD_SHARE));
    const machine = coresOf(config['budget'], host.cores) ?? host.cores * BUDGET_SHARE;
    const cap = projectCap(project, host.cores);
    const slots = Math.max(1, Math.min(hard, Math.floor(cap === null ? machine : Math.min(machine, cap))));
    const ceiling = Math.max(1, Math.min(hard, Math.round(coresOf(config['ceiling'], host.cores) ?? host.cores * CEILING_SHARE)));
    return { cores: host.cores, slots, ceiling };
}
