// governor-route (typescript order W8.8 item 4): everything heavy runs through the load governor, also what did not ask.
//   PreToolUse Bash      a heavy command (the table in lib/heavy-commands.mts: builds, test runs, fuzzers, installs, the soak and
//                        replay scripts) is rewritten through `.claude/tools/governed.mjs` by `updatedInput`, so it waits for its slots
//                        and runs with the concurrency it was granted. Claude Code checks its permission rules against the rewritten
//                        command; no permissionDecision is given, so the user's own rules still decide. A light command, a command
//                        already governed and a pipe whose heavy part is not first are left alone.
//   PreToolUse Agent     an agent's start holds one slot (lib/governor-agents.mts), waiting for one when the budget is full, and is
//                        refused with the governor's answer when none comes in time.
//   SubagentStop         the session's oldest agent slot is freed.
// The governor's state is the machine's (the user's cache folder), never the project's: this hook writes nothing in the project.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { agentSlot, AGENT_WAIT_MS, freeAgentSlot } from './lib/governor-agents.mjs';
import { machineHost } from './lib/governor.mjs';
import { routeCommand } from './lib/heavy-commands.mjs';
import { isMain, runAsHook } from './lib/hook-log.mjs';
import { claudeRoot } from './lib/project.mjs';
import { bashStep } from './lib/selftest.mjs';
import { pass, refuse, say } from './lib/verdict.mjs';
const TOOL = join('.claude', 'tools', 'governed.mjs');
const AGENT_TOOLS = new Set(['Agent', 'Task']);
/** The installed `governed` the rewrite runs: the checkout's own (a worktree's), else the project's; null when neither has it. */
function governedTool(ctx) {
    for (const root of [claudeRoot(ctx.projectDir, ctx.cwd, ctx.cwd), ctx.projectDir]) {
        const tool = join(root, TOOL);
        if (existsSync(tool))
            return tool;
    }
    return null;
}
/** The Bash call with its heavy parts put through `governed`, or nothing to say. */
function route(event, ctx) {
    const input = event.tool_input ?? {};
    const command = typeof input['command'] === 'string' ? input['command'] : '';
    const tool = command === '' ? null : governedTool(ctx);
    const routed = tool === null ? null : routeCommand(command, tool);
    if (routed === null)
        return pass;
    return say({ hookSpecificOutput: { hookEventName: 'PreToolUse', updatedInput: { ...input, command: routed } } });
}
const priorityOf = (env) => {
    const p = Number(env['CLAUDE_PACKS_PRIORITY']);
    return env['CLAUDE_PACKS_PRIORITY'] && p >= 0 && p <= 1 ? p : undefined;
};
/** An agent's start: its slot, or a refusal with the governor's answer. */
function startAgent(event, ctx) {
    // a test plants a short wait; every real start waits AGENT_WAIT_MS
    const planted = ctx.env['CLAUDE_PACKS_AGENT_WAIT_MS'];
    const waitMs = planted && Number(planted) >= 0 ? Number(planted) : AGENT_WAIT_MS;
    const slot = agentSlot(machineHost(ctx.env), { sessionPid: ctx.sessionPid, project: ctx.projectDir, priority: priorityOf(ctx.env),
        toolUseId: typeof event['tool_use_id'] === 'string' ? event['tool_use_id'] : '', waitMs });
    if (slot.ok)
        return pass;
    return refuse(`BLOCKED by governor-route: no slot for another agent after ${Math.round(waitMs / 1000)} s (${slot.line}). The machine's `
        + 'budget is full: start this agent again when one of the running agents or jobs has ended (`node .claude/tools/load.mjs ask --for agent` says when).');
}
export const hook = (event, ctx) => {
    if (event.hook_event_name === 'SubagentStop') {
        freeAgentSlot(machineHost(ctx.env), ctx.sessionPid);
        return pass;
    }
    if (event.tool_name === 'Bash')
        return route(event, ctx);
    if (AGENT_TOOLS.has(event.tool_name ?? ''))
        return startAgent(event, ctx);
    return pass;
};
/** A heavy command is routed from a worktree as from the main checkout (exit 0 with the rewrite), a light one passes. */
export const worktreeCase = {
    steps: [
        bashStep('a test run after a cd into the worktree', 'cd {wt} && npm test', 0),
        bashStep('a build in the main checkout', 'cd {here} && cmake --build build', 0),
        bashStep('a light command in the worktree', 'cd {wt} && ls', 0),
    ],
};
const selftest = async () => (await import('./lib/governor-route-selftest.mjs')).selftest();
if (isMain(import.meta.url))
    await runAsHook(import.meta.url, 'governor-route', hook, selftest);
