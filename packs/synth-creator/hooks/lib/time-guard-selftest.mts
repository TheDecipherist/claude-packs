// time-guard's selftest: each finding planted and its quiet twin, run through the hook's own `run` with a made-up process table,
// then the hook itself through the runner. The hook hands in its own `run` (importing it here would be a cycle: it imports this
// file to run its selftest).
import { rmSync } from 'node:fs';
import type { RunOptions } from '../time-guard.mts';
import { descendants, etimeS, ownProcesses, sessionPid } from './own-processes.mts';
import type { ProcessRow } from './own-processes.mts';
import { bashOf, runHook, scratchProject, snapshot, verdicts, writtenSince } from './selftest.mts';
import { DEFAULTS, readOnlyCommand } from './time-findings.mts';
import type { Row } from './time-findings.mts';
import { placeOf } from './time-state.mts';
import type { GuardState } from './time-state.mts';
import type { HookEvent, VerdictRow } from './types.d.mts';

type Run = (event: HookEvent, opts: RunOptions) => string[];
/** What a case changes about a call: the options, and whether it runs inside a worktree. */
type Extra = Partial<RunOptions> & { inWorktree?: boolean };
/** One look at a made-up process table: its label, the table, whether it is told, and what else the call changes. */
type MachineLook = readonly [label: string, table: readonly Row[], told: boolean, extra?: Extra];

const G = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --headless=new --disable-gpu';
const EXPORT = 'node /x/kit/synthpanel-creator/bin/synthpanel.js export-native design/export-spec.json';
const WAIT = "/bin/zsh -c eval 'until grep -q exit /tmp/x.log; do sleep 15; done'";
const BENCH: Extra = { cfg: { ...DEFAULTS, probePattern: '\\S*/bench_\\w+' } };   // a project's own probe pattern (guards.time.probePattern)

// The machine's slow things, each with its quiet twin (a process table, as ps would give it: pid, age in s, command).
const LOOKS: readonly MachineLook[] = [
  ['an export of 7 min', [[1, 420, EXPORT]], true],
  ['an export of 30 s', [[1, 30, EXPORT]], false],
  ['12 headless Chromes', Array.from({ length: 12 }, (_, i): Row => [i, 10, G]), true],
  ['2 headless Chromes of 10 s', [[0, 10, G], [1, 10, G]], false],
  ['a headless Chrome of a day', [[9, 93600, G]], true],
  ['a ctest of an hour', [[3, 3600, 'ctest --test-dir build -j4']], true],
  ['a probe of 25 min', [[4, 1500, '/x/build/SynthFaceProbe_artefacts/RelWithDebInfo/SynthFaceProbe --press-all']], true],
  ['a shell that names a build is not a build', [[8, 3600, '/bin/zsh -c cmake --build build -j6 && ctest']], false],
  ['a build of 40 min', [[8, 2400, 'cmake --build build -j6']], true],
  ['a shell that names a probe is not a probe', [[9, 3000, '/bin/zsh -c ./build/SynthFaceProbe_artefacts/RelWithDebInfo/SynthFaceProbe --walk x']], false],
  ['a quiet machine', [[5, 4000, '/bin/zsh'], [6, 20, 'cmake --build build -j4']], false, { commitMin: 5, worktrees: {} }],
  ['a wait loop of a day', [[7, 90000, WAIT]], true],
  ['a wait loop of 5 min', [[7, 300, WAIT]], false],
  // KWB-87: only what this session started is its to stop
  ["this session's own wait loop of a day", [[7, 90000, WAIT]], true, { own: new Set([7]) }],
  ["another session's wait loop of a day is not this one's", [[7, 90000, WAIT]], false, { own: new Set([8]) }],
  ["another session's build of 40 min is not this one's", [[8, 2400, 'cmake --build build -j6']], false, { own: new Set() }],
  ['a headless Chrome of a day, whoever started it', [[9, 93600, G]], true, { own: new Set() }],
  ['a snake-case probe of 25 min', [[4, 1500, '/x/out/probes/engines/synth_engines_probe --only FIRESAW']], true],
  ["a project's own probe pattern: its bench of 25 min", [[4, 1500, '/x/out/bench_voices --all']], true, BENCH],
  ["a project's own probe pattern: another program is no probe", [[4, 1500, '/x/out/synth_engines_probe']], false, BENCH],
];

export function selftest(hookFile: string, run: Run): number {
  const rows: VerdictRow[] = [];
  const dir = scratchProject();
  const place = placeOf('/x/proj', { TMPDIR: dir });
  const call = (event: HookEvent, { inWorktree = false, ...extra }: Extra = {}): string[] =>
    run(event, { place: { ...place, inWorktree }, cfg: DEFAULTS, self: hookFile, sessionPid: 0, now: 5000, ...extra });
  const expect = (name: string, said: readonly string[], want: boolean): void => { rows.push([name, said.length > 0 ? 1 : 0, want ? 1 : 0]); };
  const same = (name: string, got: unknown, want: unknown): void => { rows.push([name, JSON.stringify(got), JSON.stringify(want)]); };
  const post = (extra: HookEvent = {}): HookEvent => ({ hook_event_name: 'PostToolUse', ...extra });
  const at = (table: readonly Row[], extra: Extra = {}): Extra => ({ state: {}, rows: table, commitMin: 1, ...extra });
  const A = (command: string, who = 'a1'): HookEvent => post({ agent_id: who, tool_input: { command } });
  // a call of an agent in a worktree, from a state it keeps between calls
  const agent = (state: GuardState, command: string, who: string, now: number, commitMin: Extra['commitMin'] = 1): string[] => call(A(command, who), { now, state, rows: [], commitMin });
  const st: GuardState = {};
  call({ hook_event_name: 'PreToolUse', tool_use_id: 'a' }, { now: 1000, state: st, rows: [], commitMin: 1 });
  expect('a call of 12 min', call(post({ tool_use_id: 'a', tool_input: { command: 'bash tools/build-panel.sh' } }), { now: 1720, state: st, rows: [], commitMin: 1 }), true);
  call({ hook_event_name: 'PreToolUse', tool_use_id: 'b' }, { now: 2000, state: st, rows: [], commitMin: 1 });
  expect('a call of 2 min', call(post({ tool_use_id: 'b' }), { now: 2120, state: st, rows: [], commitMin: 1 }), false);
  for (const [label, table, told, extra] of LOOKS) expect(label, call(post(), at(table, extra)), told);
  expect("an agent's worktree quiet for 90 min", call(A('cd /x/.claude/worktrees/k2 && make'), at([], { commitMin: 90 })), true);
  const s2: GuardState = {};
  agent(s2, 'cd /x/.claude/worktrees/k2 && make', 'a1', 5000, 90);
  expect('the same said again a minute later', agent(s2, 'ls', 'a1', 5060, 90), false);
  const s3: GuardState = {};
  agent(s3, 'cd /x/.claude/worktrees/onechrome && ls', 'main-ish', 5000);
  expect('a second agent in the same worktree', agent(s3, 'cd /x/.claude/worktrees/onechrome && vi', 'a2', 5001), true);
  const s4: GuardState = {};
  agent(s4, 'cd /x/.claude/worktrees/handed && ls', 'first', 5000);
  expect('a successor after the first agent has been quiet 16 min takes the worktree', agent(s4, 'cd /x/.claude/worktrees/handed && ls', 'next', 5000 + 16 * 60), false);
  expect('and the first agent coming back finds it taken', agent(s4, 'cd /x/.claude/worktrees/handed && ls', 'first', 5000 + 17 * 60), true);
  // KWB-140: the worktree a call works in, not the one remembered from before
  const age = (m: number) => (wt: string): number => (wt.endsWith('/stale') ? 1259 : m);
  const s5: GuardState = {};
  agent(s5, 'cd /x/.claude/worktrees/stale && make', 'w', 5000, age(1));
  expect('KWB-140: a look at another, fresh worktree while a stale one is remembered', agent(s5, 'cd /x/.claude/worktrees/fresh && ls && grep -n x f', 'w', 5000 + 1200, age(3)), false);
  expect('KWB-140: and its write, in the fresh worktree', agent(s5, 'cd /x/.claude/worktrees/fresh && make', 'w', 5000 + 1260, age(3)), false);
  expect('KWB-140: a write in the stale worktree it names still says it', agent(s5, 'cd /x/.claude/worktrees/stale && make', 'w', 5000 + 1320, age(3)), true);
  const s6: GuardState = {};
  expect('KWB-140: a look at a stale worktree this session has not written to says nothing', agent(s6, 'cd /x/.claude/worktrees/stale && ls | head', 'v', 5000, 1259), false);
  expect('KWB-140: a git status there says nothing either', agent(s6, 'cd /x/.claude/worktrees/stale && git status --short', 'v', 5000 + 700, 1259), false);
  expect('KWB-140: the first write there says it', agent(s6, 'cd /x/.claude/worktrees/stale && touch f', 'v', 5000 + 1400, 1259), true);
  expect('the controller told of a worktree unsaved for 45 min', call(post(), at([], { worktrees: { '/x/.claude/worktrees/guide': 45 } })), true);
  expect('the controller, nothing unsaved', call(post(), at([], { worktrees: { '/x/.claude/worktrees/guide': 5 } })), false);
  expect('a session working inside a worktree is not the controller (KWB-87)', call(post(), at([], { worktrees: { '/x/.claude/worktrees/guide': 45 }, inWorktree: true })), false);
  const told: GuardState = {};
  const found = { at: 4000, list: ['guide (45 min)'] };
  expect("the background scan's finding is told", call(post(), at([], { state: told, late: found })), true);
  expect('and told once', call(post(), at([], { state: told, late: found, now: 5100 })), false);
  expect('nor told to a session inside a worktree (KWB-87)', call(post(), at([], { state: {}, late: found, inWorktree: true })), false);
  const pre = (command: string): string[] => call({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command } }, { now: 5000, state: {} });
  const loop = ['until', '!', 'pgrep', '-f', '"cmake --build"', '>/dev/null;', 'do', 'sleep', '5;', 'done'].join(' ');
  expect('the endless wait loop inside a heredoc (text for a program) passes', pre(`python3 - <<'EOF'\nprint('${loop}')\nEOF\necho ok`), false);
  expect('the same loop after a heredoc is still refused', pre(`cat > a.txt <<EOF\nx\nEOF\n${loop}`), true);
  expect('REFUSED: the endless wait loop', pre(loop), true);
  expect('a pgrep that cannot match itself passes', pre(loop.replace('"cmake --build"', "'[c]make --build'")), false);
  const table: ProcessRow[] = [
    { pid: 10, ppid: 1, age: 0, cmd: 'claude -p Run the step' }, { pid: 11, ppid: 10, age: 0, cmd: '/bin/bash -c make' }, { pid: 12, ppid: 11, age: 0, cmd: 'make -j4' },
    { pid: 20, ppid: 1, age: 0, cmd: '/bin/bash runner.sh' }, { pid: 21, ppid: 20, age: 0, cmd: 'claude -p next' }, { pid: 30, ppid: 21, age: 0, cmd: 'node run-hooks.mjs' },
  ];
  same('the session above a hook is its nearest claude', sessionPid(table, 11), 10);
  same("a session's processes are those below it", [...descendants(table, 10)].sort(), [11, 12]);
  same('the runner that started a session is not its own', ownProcesses(table, 30)?.has(20), false);
  same('no claude above: nothing is known', ownProcesses([{ pid: 5, ppid: 1, age: 0, cmd: 'bash' }], 5), null);
  expect('a question answered after 12 min is not a slow call (WB-22)', call(post({ tool_name: 'AskUserQuestion', tool_use_id: 'q1' }), { now: 5720, state: { starts: { q1: 5000 } }, rows: [] }), false);
  expect('a Bash call of 12 min still is', call(post({ tool_name: 'Bash', tool_use_id: 'b1', tool_input: { command: 'x' } }), { now: 5720, state: { starts: { b1: 5000 } }, rows: [] }), true);
  same('ps etime', [etimeS('1-02:03:04'), etimeS('05:06')], [93784, 306]);
  same('a read-only look and a write', [readOnlyCommand('cd x && git status --short | head'), readOnlyCommand('echo x > f')], [true, false]);
  // the hook through the runner: a judge, so it writes nothing into the project (what it remembers is in the temp folder, removed below)
  const proj = scratchProject();
  const before = snapshot(proj);
  rows.push(['the endless wait loop is refused through the runner', runHook(hookFile, proj, { hook_event_name: 'PreToolUse', ...bashOf(loop, proj) }).status, 2]);
  rows.push(['an ordinary call passes through the runner', runHook(hookFile, proj, { hook_event_name: 'PreToolUse', ...bashOf('ls', proj) }).status, 0]);
  rows.push(['a judge writes no file (the write trap)', writtenSince(proj, before).join(','), '']);
  rmSync(placeOf(proj, process.env).stateDir, { recursive: true, force: true });
  return verdicts('time-guard', rows);
}
