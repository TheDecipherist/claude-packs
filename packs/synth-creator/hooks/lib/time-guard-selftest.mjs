// time-guard's selftest: each finding planted and its quiet twin, run through the hook's own `run` with a made-up process table.
// The hook hands in its own exports (importing it here would wait on the hook's own top-level await).
import { descendants, etimeS, ownProcesses, sessionPid } from './own-processes.mjs';

export function selftest({ run, CFG, DEFAULTS }) {
  let bad = 0;
  const expect = (name, said, want) => { if ((said.length > 0) !== want) { bad += 1; console.error(`FAIL  ${name}: ${said.length ? 'said' : 'quiet'}`); } };
  const same = (name, got, want) => { if (JSON.stringify(got) !== JSON.stringify(want)) { bad += 1; console.error(`FAIL  ${name}: got ${JSON.stringify(got)}`); } };
  const G = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --headless=new --disable-gpu';
  const post = (extra = {}) => ({ hook_event_name: 'PostToolUse', ...extra });
  const at = (rows, extra = {}) => ({ now: 5000, state: {}, rows, commitMin: 1, inWorktree: false, ...extra });
  const st = {};
  run({ hook_event_name: 'PreToolUse', tool_use_id: 'a' }, { now: 1000, state: st, rows: [], commitMin: 1 });
  expect('a call of 12 min', run(post({ tool_use_id: 'a', tool_input: { command: 'bash tools/build-panel.sh' } }), { now: 1720, state: st, rows: [], commitMin: 1 }), true);
  run({ hook_event_name: 'PreToolUse', tool_use_id: 'b' }, { now: 2000, state: st, rows: [], commitMin: 1 });
  expect('a call of 2 min', run(post({ tool_use_id: 'b' }), { now: 2120, state: st, rows: [], commitMin: 1 }), false);
  const exp = 'node /x/kit/synthpanel-creator/bin/synthpanel.js export-native design/export-spec.json';
  expect('an export of 7 min', run(post(), at([[1, 420, exp]])), true);
  expect('an export of 30 s', run(post(), at([[1, 30, exp]])), false);
  expect('12 headless Chromes', run(post(), at(Array.from({ length: 12 }, (_, i) => [i, 10, G]))), true);
  expect('2 headless Chromes of 10 s', run(post(), at([[0, 10, G], [1, 10, G]])), false);
  expect('a headless Chrome of a day', run(post(), at([[9, 93600, G]])), true);
  expect('a ctest of an hour', run(post(), at([[3, 3600, 'ctest --test-dir build -j4']])), true);
  expect('a probe of 25 min', run(post(), at([[4, 1500, '/x/build/SynthFaceProbe_artefacts/RelWithDebInfo/SynthFaceProbe --press-all']])), true);
  const A = (command, who = 'a1') => post({ agent_id: who, tool_input: { command } });
  expect("an agent's worktree quiet for 90 min", run(A('cd /x/.claude/worktrees/k2 && make'), at([], { commitMin: 90 })), true);
  const s2 = {};
  run(A('cd /x/.claude/worktrees/k2 && make'), { now: 5000, state: s2, rows: [], commitMin: 90 });
  expect('the same said again a minute later', run(A('ls'), { now: 5060, state: s2, rows: [], commitMin: 90 }), false);
  const s3 = {};
  run(A('cd /x/.claude/worktrees/onechrome && ls', 'main-ish'), { now: 5000, state: s3, rows: [], commitMin: 1 });
  expect('a second agent in the same worktree', run(A('cd /x/.claude/worktrees/onechrome && vi', 'a2'), { now: 5001, state: s3, rows: [], commitMin: 1 }), true);
  const s4 = {};
  run(A('cd /x/.claude/worktrees/handed && ls', 'first'), { now: 5000, state: s4, rows: [], commitMin: 1 });
  expect('a successor after the first agent has been quiet 16 min takes the worktree', run(A('cd /x/.claude/worktrees/handed && ls', 'next'), { now: 5000 + 16 * 60, state: s4, rows: [], commitMin: 1 }), false);
  expect('and the first agent coming back finds it taken', run(A('cd /x/.claude/worktrees/handed && ls', 'first'), { now: 5000 + 17 * 60, state: s4, rows: [], commitMin: 1 }), true);
  expect('the controller told of a worktree unsaved for 45 min', run(post(), at([], { worktrees: { '/x/.claude/worktrees/guide': 45 } })), true);
  expect('the controller, nothing unsaved', run(post(), at([], { worktrees: { '/x/.claude/worktrees/guide': 5 } })), false);
  expect('a session working inside a worktree is not the controller (KWB-87)', run(post(), at([], { worktrees: { '/x/.claude/worktrees/guide': 45 }, inWorktree: true })), false);
  const told = {};
  const found = { at: 4000, list: ['guide (45 min)'] };
  expect('the background scan\'s finding is told', run(post(), at([], { state: told, late: found })), true);
  expect('and told once', run(post(), { ...at([], { state: told, late: found }), now: 5100 }), false);
  expect('nor told to a session inside a worktree (KWB-87)', run(post(), at([], { state: {}, late: found, inWorktree: true })), false);
  const pre = (command) => run({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command } }, { now: 5000, state: {} });
  const loop = ['until', '!', 'pgrep', '-f', '"cmake --build"', '>/dev/null;', 'do', 'sleep', '5;', 'done'].join(' ');
  expect('the endless wait loop inside a heredoc (text for a program) passes', pre(`python3 - <<'EOF'\nprint('${loop}')\nEOF\necho ok`), false);
  expect('the same loop after a heredoc is still refused', pre(`cat > a.txt <<EOF\nx\nEOF\n${loop}`), true);
  expect('REFUSED: the endless wait loop', pre(loop), true);
  expect('a pgrep that cannot match itself passes', pre(loop.replace('"cmake --build"', "'[c]make --build'")), false);
  expect('a shell that names a build is not a build', run(post(), at([[8, 3600, '/bin/zsh -c cmake --build build -j6 && ctest']])), false);
  expect('a build of 40 min', run(post(), at([[8, 2400, 'cmake --build build -j6']])), true);
  expect('a shell that names a probe is not a probe', run(post(), at([[9, 3000, '/bin/zsh -c ./build/SynthFaceProbe_artefacts/RelWithDebInfo/SynthFaceProbe --walk x']])), false);
  expect('a quiet machine', run(post(), at([[5, 4000, '/bin/zsh'], [6, 20, 'cmake --build build -j4']], { commitMin: 5, worktrees: {} })), false);
  const wait = "/bin/zsh -c eval 'until grep -q exit /tmp/x.log; do sleep 15; done'";
  expect('a wait loop of a day', run(post(), at([[7, 90000, wait]])), true);
  expect('a wait loop of 5 min', run(post(), at([[7, 300, wait]])), false);
  // KWB-87: only what this session started is its to stop
  expect("this session's own wait loop of a day", run(post(), at([[7, 90000, wait]], { own: new Set([7]) })), true);
  expect("another session's wait loop of a day is not this one's", run(post(), at([[7, 90000, wait]], { own: new Set([8]) })), false);
  expect("another session's build of 40 min is not this one's", run(post(), at([[8, 2400, 'cmake --build build -j6']], { own: new Set() })), false);
  expect('a headless Chrome of a day, whoever started it', run(post(), at([[9, 93600, G]], { own: new Set() })), true);
  const table = [
    { pid: 10, ppid: 1, cmd: 'claude -p Run the step' }, { pid: 11, ppid: 10, cmd: '/bin/bash -c make' }, { pid: 12, ppid: 11, cmd: 'make -j4' },
    { pid: 20, ppid: 1, cmd: '/bin/bash runner.sh' }, { pid: 21, ppid: 20, cmd: 'claude -p next' }, { pid: 30, ppid: 21, cmd: 'node run-hooks.mjs' },
  ];
  same('the session above a hook is its nearest claude', sessionPid(table, 11), 10);
  same("a session's processes are those below it", [...descendants(table, 10)].sort(), [11, 12]);
  same('the runner that started a session is not its own', ownProcesses(table, 30)?.has(20), false);
  same('no claude above: nothing is known', ownProcesses([{ pid: 5, ppid: 1, cmd: 'bash' }], 5), null);
  expect('a question answered after 12 min is not a slow call (WB-22)', run(post({ tool_name: 'AskUserQuestion', tool_use_id: 'q1' }), { now: 5720, state: { starts: { q1: 5000 } }, rows: [] }), false);
  expect('a Bash call of 12 min still is', run(post({ tool_name: 'Bash', tool_use_id: 'b1', tool_input: { command: 'x' } }), { now: 5720, state: { starts: { b1: 5000 } }, rows: [] }), true);
  expect('a snake-case probe of 25 min', run(post(), at([[4, 1500, '/x/out/probes/engines/synth_engines_probe --only FIRESAW']])), true);
  CFG.probePattern = '\\S*/bench_\\w+'; // a project's own probe pattern (guards.time.probePattern)
  expect("a project's own probe pattern: its bench of 25 min", run(post(), at([[4, 1500, '/x/out/bench_voices --all']])), true);
  expect("a project's own probe pattern: another program is no probe", run(post(), at([[4, 1500, '/x/out/synth_engines_probe']])), false);
  Object.assign(CFG, DEFAULTS);
  if (etimeS('1-02:03:04') !== 93784 || etimeS('05:06') !== 306) { bad += 1; console.error('FAIL  ps etime'); }
  console.log(`time-guard selftest: ${bad ? `${bad} wrong` : 'OK'}`);
  return bad ? 1 : 0;
}
