// What a job granted N slots is started with (typescript order W8.8 items 0 and 3): one table from a kind and a slot count to the
// environment and the flags its tools read, so `load ask` prints it, `governed` sets it, and nothing works out a -j of its own.
//   settingsFor(kind, slots) -> { env, flags, agents, words }
import { budgetEnv } from './core-budget.mjs';
/** An agent's own work runs at this many cores (its tests at CLAUDE_PACKS_TEST_CORES=3, the order's constraint of 2026-11-12):
 *  the advice counts how many more agents the free cores carry. Starting one holds a single slot (item 4); this is what it will run. */
export const AGENT_WORK_CORES = 3;
/** A Go fuzzer's workers: one core is left for `go test`'s own coordinator. */
const fuzzWorkers = (slots) => Math.max(1, slots - 1);
/** The flags of each kind's command, for `slots`. */
const FLAGS = {
    test: (n) => [`--test-concurrency=${n}`],
    build: (n) => [`-j${n}`],
    fuzz: (n) => [`-parallel=${fuzzWorkers(n)}`],
    agent: () => [],
    install: () => [],
    other: () => [],
};
/** The settings for a job of `kind` granted `slots` (at least 1). */
export function settingsFor(kind, slots) {
    const n = Math.max(1, Math.floor(slots));
    const tools = budgetEnv({}, n);
    const env = { CLAUDE_PACKS_TEST_CORES: String(n), GOMAXPROCS: String(n) };
    for (const [name, value] of Object.entries(tools))
        if (value !== undefined)
            env[name] = value;
    const agents = Math.floor(n / AGENT_WORK_CORES);
    const words = `tests: CLAUDE_PACKS_TEST_CORES=${n}; builds: -j${n}; fuzz: -parallel=${fuzzWorkers(n)}; agents: ${agents} more`;
    return { slots: n, env, flags: FLAGS[kind](n), agents, words };
}
