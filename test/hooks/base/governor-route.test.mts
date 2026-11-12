// governor-route (typescript order W8.8 item 4): a heavy Bash command is rewritten through `governed` by updatedInput, and an agent's
// start holds a governor slot. The hook's contract in a base install, then the order's Done when: a planted `npm test`, `cmake --build`
// and `go test -fuzz` are each rewritten, `ls`, a governed command and a pipe whose heavy part is not first are not; an agent start past
// the budget waits. Every run has its own governor folder (the test preload's) and plants its cores and load.
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { assert, fresh, hookRun, test } from '../../kit-cli.mts';
import type { Payload } from '../../kit-cli.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';
import { heavyOf, routeCommand } from '../../../packs/base/hooks/lib/heavy-commands.mts';
import { free, inFlight, machineHost, take } from '../../../packs/base/hooks/lib/governor.mts';

const HOOK = 'governor-route.mjs';
const bash = (command: string): Payload => ({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command, description: 'd' } });
const agentStart = (id: string): Payload => ({ hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_use_id: id, tool_input: { prompt: 'p' } });

holdsTheContract({
  hook: HOOK,
  dir: () => fixture('base'),
  same: (project) => ({ payload: bash('npm test'), status: 0 }),
});

/** A planted machine of 18 cores at load 0 in a governor folder of its own; `agentWait` is how long an agent start may wait. */
function plantedEnv(cores = '18', agentWait = '200'): Record<string, string> {
  return { CLAUDE_PACKS_GOVERNOR_DIR: fresh('route-gov-'), CLAUDE_PACKS_GOVERNOR_CORES: cores, CLAUDE_PACKS_GOVERNOR_LOAD: '0', CLAUDE_PACKS_AGENT_WAIT_MS: agentWait };
}

/** The rewritten command from the installed hook, or '' when it let the call through as it was. */
function routedBy(project: string, command: string): string {
  const r = hookRun(project, HOOK, bash(command), plantedEnv());
  assert.equal(r.status, 0, r.stderr);
  if (r.stdout.trim() === '') return '';
  const out = JSON.parse(r.stdout) as { hookSpecificOutput: { hookEventName: string; permissionDecision?: string; updatedInput: { command: string; description: string } } };
  assert.equal(out.hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.equal(out.hookSpecificOutput.permissionDecision, undefined, 'the user\'s own permission rules still decide');
  assert.equal(out.hookSpecificOutput.updatedInput.description, 'd', 'the call\'s other fields are kept');
  return out.hookSpecificOutput.updatedInput.command;
}

test('a planted npm test, cmake --build and go test -fuzz are each rewritten through governed', () => {
  const project = fixture('base');
  const tool = join(project, '.claude/tools/governed.mjs');
  assert.equal(routedBy(project, 'npm test'), `node '${tool}' --for test --want 3 -- npm test`);
  assert.equal(routedBy(project, 'cmake --build build -j8'), `node '${tool}' --for build --want 4 -- cmake --build build -j8`);
  assert.equal(routedBy(project, 'go test -fuzz=FuzzWire -fuzztime=60s ./proxy/'), `node '${tool}' --for fuzz --want 3 -- go test -fuzz=FuzzWire -fuzztime=60s ./proxy/`);
});

test('ls, a governed command and a pipe whose heavy part is not first are left alone', () => {
  const project = fixture('base');
  assert.equal(routedBy(project, 'ls -la'), '');
  assert.equal(routedBy(project, `node '${join(project, '.claude/tools/governed.mjs')}' --for test --want 3 -- npm test`), '');
  assert.equal(routedBy(project, 'git log --oneline | npm test'), '');
  assert.equal(routedBy(project, 'echo "npm test"'), '');
});

test('the heavy part is routed where it starts a list item or a pipe, after its assignments, and before its wrappers', () => {
  const t = '/p/.claude/tools/governed.mjs';
  const g = (kind: string, want: number): string => `node '${t}' --for ${kind} --want ${want} -- `;
  assert.equal(routeCommand('cd x && CLAUDE_PACKS_TEST_CORES=3 taskpolicy -b node .claude/tools/quiet-test.mjs npm run test:changed > build/g.txt 2>&1', t),
    `cd x && CLAUDE_PACKS_TEST_CORES=3 ${g('test', 3)}taskpolicy -b node .claude/tools/quiet-test.mjs npm run test:changed > build/g.txt 2>&1`);
  assert.equal(routeCommand('npm test 2>&1 | tail -5', t), `${g('test', 3)}npm test 2>&1 | tail -5`);
  assert.equal(routeCommand('npm ci && npm run build', t), `${g('install', 2)}npm ci && ${g('build', 4)}npm run build`);
  assert.equal(routeCommand('exec make -j4', t), `exec ${g('build', 4)}make -j4`);
  assert.equal(routeCommand('node scripts/soak.mts --clients 4 &', t), `${g('other', 4)}node scripts/soak.mts --clients 4 &`);
  assert.equal(routeCommand("cat <<'EOF' > f\nnpm test\nEOF", t), null, 'a heredoc is past reading: left alone');
  assert.equal(routeCommand('(cd x && npm test)', t), null, 'a subshell is past reading: left alone');
  assert.equal(heavyOf(['node', '.claude/tools/buildq.mjs', 'make']), 'governed', 'buildq takes its own grant');
  assert.equal(heavyOf(['sudo', 'make', 'install']), null);
  assert.deepEqual(heavyOf(['python3', '-m', 'pytest', '-x']), { kind: 'test', want: 3 });
  assert.equal(heavyOf(['git', 'status']), null);
});

/** The installed hook on an agent's start, run beside the test so a slot can be freed while it waits; its exit code and wall. */
function startAgentAsync(project: string, env: Record<string, string>, id: string): Promise<{ status: number | null; ms: number }> {
  const began = Date.now();
  return new Promise((done) => {
    const child = spawn('node', [join(project, '.claude/hooks', HOOK)], { env: { ...process.env, CLAUDE_PROJECT_DIR: project, ...env }, stdio: ['pipe', 'ignore', 'ignore'] });
    child.stdin.end(JSON.stringify(agentStart(id)));
    child.on('exit', (status) => done({ status, ms: Date.now() - began }));
  });
}

test('an agent start past the budget waits, and starts when a slot is freed', async () => {
  const project = fixture('base');
  // 4 cores: a budget of 2 slots; a planted job holds both
  const env = plantedEnv('4', '5000');
  const host = machineHost(env);
  const held = take(host, { kind: 'build', want: 2, priority: 1, pid: process.pid });
  assert.ok(held.ok);
  const waiting = startAgentAsync(project, env, 'tool-1');
  // the hook's node start under load takes a moment: look for its ticket up to QUEUED_WITHIN_MS
  const QUEUED_WITHIN_MS = 4000;
  const STEP_MS = 100;
  const began = Date.now();
  while (inFlight(host).waiting.length === 0 && Date.now() - began < QUEUED_WITHIN_MS) await delay(STEP_MS);
  assert.equal(inFlight(host).waiting.length, 1, 'the agent is in the governor\'s queue while it waits');
  const FREE_AFTER_MS = 300;
  await delay(FREE_AFTER_MS);
  free(host, held.grant.id);
  const started = await waiting;
  assert.equal(started.status, 0);
  assert.ok(started.ms >= FREE_AFTER_MS, `it waited ${started.ms} ms`);
  assert.equal(inFlight(host).jobs.filter((j) => j.kind === 'agent').length, 1, 'the agent holds one slot');
});

test('an agent start that gets no slot in time is refused with the governor\'s answer, and a stopped agent frees its slot', () => {
  const project = fixture('base');
  const env = plantedEnv('2', '200');   // 1 slot
  assert.equal(hookRun(project, HOOK, agentStart('a'), env).status, 0);
  const refused = hookRun(project, HOOK, agentStart('b'), env);
  assert.equal(refused.status, 2);
  assert.match(refused.stderr, /no slot for another agent .*wait: /);
  assert.equal(inFlight(machineHost(env)).waiting.length, 0, 'a refused start leaves the queue');
  assert.equal(hookRun(project, HOOK, { hook_event_name: 'SubagentStop', agent_id: 'x' }, env).status, 0);
  assert.equal(hookRun(project, HOOK, agentStart('c'), env).status, 0);
});
