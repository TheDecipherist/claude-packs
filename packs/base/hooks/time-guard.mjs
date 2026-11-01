#!/usr/bin/env node
// time-guard: nothing is slow without someone being told (Tim, 2026-10-11, after a night of two-hour panel exports that
// every agent, and the session watching them, took for normal).
//
// PreToolUse + PostToolUse on every tool, for the session and every agent it starts. After a call it tells the caller
// (exit 2 on PostToolUse: the call has run, nothing is blocked, the words reach the agent) when:
//   1. THE CALL ITSELF TOOK LONG: more than SLOW_CALL_MIN minutes (a question to the user never counts);
//   2. SOMETHING ON THE MACHINE IS SLOW, whoever started it (looked at once a minute at most): a panel export older than
//      EXPORT_MIN, more than CHROME_MAX headless Chromes or one older than CHROME_MIN, a build older than BUILD_MIN, a ctest
//      run older than CTEST_MIN, a probe older than PROBE_MIN (guards.time.probePattern says what a probe is), a wait
//      loop older than WAIT_LOOP_MIN;
//   3. AN AGENT'S WORKTREE HAS NOT MOVED: work unsaved for SAVE_MIN, no commit for QUIET_MIN, or two agents in one;
//   4. THE CONTROLLER sees every worktree holding work unsaved for long, every SCAN_MIN minutes;
// and before a call it REFUSES a wait that can never end: `until ! pgrep -f "<words>"`, whose pgrep finds the loop's own
// command line (a heredoc body is text, not a loop). A finding is said again only after REPEAT_MIN minutes.
// Project values: .claude/layout.json "guards": { "time": { "probePattern", "saveCommand" } }.
//   node time-guard.mjs --selftest
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { readLayout } from './lib/layout.mjs';

export const DEFAULTS = {
  probePattern: '\\S*/\\w*(?:Probe|_probe)\\b', // the probe binary itself, never a shell that names one
  saveCommand: 'git add <paths> && git commit -m "<note>" -- <paths>',
};
const CFG = { ...DEFAULTS };
const SLOW_CALL_MIN = 10, EXPORT_MIN = 5, CHROME_MAX = 6, CHROME_MIN = 5, BUILD_MIN = 30, CTEST_MIN = 45, PROBE_MIN = 20;
const QUIET_MIN = 60, SAVE_MIN = 30, SCAN_MIN = 15, WAIT_LOOP_MIN = 60, REPEAT_MIN = 10, LOOK_EVERY_S = 60;

const projectRoot = resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd()).replace(/\/\.claude\/worktrees\/[^/]+(\/.*)?$/, '');
const STATE = join(process.env.TMPDIR ?? tmpdir(), `time-guard-${basename(projectRoot).replace(/[^\w.-]/g, '-') || 'project'}`);
const sh = (cmd, args, cwd) => { try { return execFileSync(cmd, args, { cwd, encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; } };

export function etimeS(s) {
  const t = s.trim();
  const dash = t.lastIndexOf('-');
  const days = dash >= 0 ? Number(t.slice(0, dash)) : 0;
  const parts = (dash >= 0 ? t.slice(dash + 1) : t).split(':').map(Number);
  while (parts.length < 3) parts.unshift(0);
  return days * 86400 + parts[0] * 3600 + parts[1] * 60 + parts[2];
}

function processes() {
  const out = sh('ps', ['-axo', 'pid=,etime=,command=']) ?? '';
  return out.split('\n').map((l) => l.match(/^\s*(\d+)\s+(\S+)\s+(.*)$/)).filter(Boolean).map((m) => [Number(m[1]), etimeS(m[2]), m[3]]);
}

export function machineFindings(rows) {
  const f = [];
  const mins = (s) => s / 60;
  const headless = rows.filter((r) => /Google Chrome(?: for Testing)?(?:\.app\/Contents\/MacOS\/\S+)?\s.*--headless/.test(r[2]) && !r[2].includes('Helper'));
  if (headless.length > CHROME_MAX) {
    f.push(['chrome-count', `${headless.length} headless Chromes are running at once (more than ${CHROME_MAX}): something is starting one per picture again. ` +
      'Find it (ps -axo pid,etime,command | grep -- --headless) and stop it; Chrome is started only by kit/synthpanel-creator/src/onechrome.js, for a whole batch']);
  }
  for (const [pid, age] of headless) {
    if (mins(age) > CHROME_MIN) f.push([`chrome-old-${pid}`, `a headless Chrome (pid ${pid}) has run ${mins(age).toFixed(0)} min: it is stuck or leaked. Find who started it and why it never finished; stop it by its pid`]);
  }
  const probe = new RegExp(`^(?:${CFG.probePattern})`);
  for (const [pid, age, cmd] of rows) {
    const m = mins(age).toFixed(0);
    if (/node \S*synthpanel\S*\.js export-native/.test(cmd) && mins(age) > EXPORT_MIN) {
      f.push([`export-${pid}`, `a panel export (pid ${pid}) has run ${m} min; one takes seconds since B-382 (one Chrome, a cache of every picture). It is stuck: find why before waiting longer`]);
    } else if (/^\S*ctest\b/.test(cmd) && mins(age) > CTEST_MIN) {
      f.push([`ctest-${pid}`, `a ctest run (pid ${pid}) has run ${m} min (more than ${CTEST_MIN}): find the slow test (ctest prints each as it ends) instead of waiting for all of them`]);
    } else if (/^\S*(?:cmake\s+--build|\/make|make|ninja)\b/.test(cmd) && mins(age) > BUILD_MIN) { // the build itself, not a shell naming it
      f.push([`build-${pid}`, `a build (pid ${pid}) has run ${m} min (more than ${BUILD_MIN}): look at the load (uptime) and what else is building`]);
    } else if (probe.test(cmd) && mins(age) > PROBE_MIN) {
      f.push([`probe-${pid}`, `a probe (pid ${pid}: ${cmd.split(/\s+/)[0].split('/').pop()}) has run ${m} min (more than ${PROBE_MIN}): every probe has a time limit; find what it is waiting on`]);
    } else if (/\buntil\b.*;\s*do\s+sleep\b/.test(cmd) && mins(age) > WAIT_LOOP_MIN) {
      f.push([`waitloop-${pid}`, `a wait loop (pid ${pid}) has run ${m} min: whatever it waits for is finished or dead. Stop it (kill ${pid}); wait on a background command's own notification instead of a loop`]);
    }
  }
  return f;
}

function lastCommitMin(cwd) {
  const out = sh('git', ['log', '-1', '--format=%ct'], cwd)?.trim();
  return out ? (Date.now() / 1000 - Number(out)) / 60 : null;
}

// Minutes since the OLDEST change not yet committed in a worktree (build folders left out); null when it is clean.
function unsavedMin(wt) {
  const out = sh('git', ['--no-optional-locks', '-C', wt, 'status', '--porcelain', '--untracked-files=all']);
  if (out === null) return null;
  let oldest = null;
  for (const line of out.split('\n')) {
    const f = line.slice(3).trim().replace(/^"|"$/g, '');
    if (!f || /^(build|listen\/|screenshots\/)/.test(f) || f.includes('/build')) continue;
    try { const t = statSync(join(wt, f)).mtimeMs / 1000; oldest = oldest === null ? t : Math.min(oldest, t); } catch { /* gone */ }
  }
  return oldest === null ? null : (Date.now() / 1000 - oldest) / 60;
}

function listWorktrees() {
  const root = join(projectRoot, '.claude', 'worktrees');
  try { return readdirSync(root).sort().map((d) => join(root, d)).filter((d) => { try { statSync(join(d, '.git')); return true; } catch { return false; } }); } catch { return []; }
}

// Is this agent still running, by the cap hook's count? Unknown state counts as running (the safe side).
const CLAIM_LAPSE_MIN = 15;

function agentRunning(aid) {
  let st;
  try { st = JSON.parse(readFileSync(join(homedir(), '.claude/agent-cap-state.json'), 'utf8')); } catch { return true; }
  const sessions = Object.values(st).filter((s) => s && typeof s === 'object');
  if (sessions.some((s) => aid in (s.running ?? {}))) return true;
  return !sessions.some((s) => aid in (s.known ?? {}));
}

function sayOnce(key, msg, now, st) {
  if (now - (st[key] ?? 0) < REPEAT_MIN * 60) return null;
  st[key] = now;
  return msg;
}

export function run(event, { now = Date.now() / 1000, rows = null, commitMin = null, state = null, worktrees = null } = {}) {
  const st = state ?? loadState();
  const said = [];
  const tid = event.tool_use_id ?? '';
  const input = event.tool_input ?? {};
  if (event.hook_event_name === 'PreToolUse') {
    let cmd = event.tool_name === 'Bash' ? String(input.command ?? '') : '';
    cmd = cmd.replace(/<<-?\s*['"]?(\w+)['"]?[^\n]*\n[\s\S]*?\n\s*\1\s*(?:\n|$)/g, '\n'); // a heredoc body is text, not a loop
    if (/until\s+!\s*pgrep\s+-[a-z]*f\s+(['"])(?!\[)/.test(cmd)) {
      return ['REFUSED: `until ! pgrep -f "..."` never ends: pgrep -f finds the loop\'s own command line, which holds the same words. Run the work ' +
        "with run_in_background and wait for its notification; or, if you must poll, make the pattern unable to match itself: pgrep -f '[T]abulaFaceProbe --x'"];
    }
    if (tid) (st.starts ??= {})[tid] = now;
    if (!state) saveState(st);
    return [];
  }
  // 1. the call itself
  const started = tid ? st.starts?.[tid] : undefined;
  if (tid && st.starts) delete st.starts[tid];
  if (started !== undefined && event.tool_name !== 'AskUserQuestion' && (now - started) / 60 > SLOW_CALL_MIN) {
    said.push(`this call took ${((now - started) / 60).toFixed(0)} min (more than ${SLOW_CALL_MIN}): \`${String(input.command ?? event.tool_name ?? '').slice(0, 80)}\`. Find what made it slow before running it again; never wait on it as normal`);
  }
  // 2. the machine, once a minute at most
  if (now - (st.looked ?? 0) >= LOOK_EVERY_S || rows !== null) {
    st.looked = now;
    for (const [key, msg] of machineFindings(rows ?? processes())) { const m = sayOnce(key, msg, now, st); if (m) said.push(m); }
  }
  // 3. each agent's own worktree, learned from the commands it runs (.claude/worktrees/<name>)
  const who = event.agent_id ?? 'main';
  if (who !== 'main') (st.seen ??= {})[who] = now; // when each agent last ran anything: a finished agent's claim lapses (below)
  const text = `${input.command ?? ''} ${input.file_path ?? ''}`;
  for (const m of text.matchAll(/(\/[^\s'"]*?\/\.claude\/worktrees\/([\w.-]+))/g)) {
    if (who === 'main') continue;
    st.owner ??= {};
    let prev = st.owner[m[2]];
    // a claim lapses with its agent: known stopped, or quiet for CLAIM_LAPSE_MIN (the agent-cap state that said "stopped" is no
    // longer written, so without the quiet rule a finished agent kept its worktree for ever and no successor could reuse its build)
    if (prev && prev !== who && (!agentRunning(prev) || now - (st.seen?.[prev] ?? 0) > CLAIM_LAPSE_MIN * 60)) prev = null;
    if (prev && prev !== who) {
      const s = sayOnce(`shared-${m[2]}`, `the worktree .claude/worktrees/${m[2]} is already used by another agent (${prev}). Each agent works only in its own: ` +
        'make yours (git worktree add --detach .claude/worktrees/<yours> main) and move your files there', now, st);
      if (s) said.push(s);
    } else {
      st.owner[m[2]] = who;
      (st.wt ??= {})[who] = m[1];
    }
  }
  const mine = who !== 'main' ? st.wt?.[who] : null;
  if (mine) {
    const u = rows === null ? unsavedMin(mine) : null; // a selftest case: never git on a made-up path
    const cmn = commitMin ?? lastCommitMin(mine);
    if (u !== null && u > SAVE_MIN) {
      const s = sayOnce(`unsaved-${mine}`, `your worktree (${mine.split('/').pop()}) holds work unsaved for ${u.toFixed(0)} min (more than ${SAVE_MIN}). Save it now: ${CFG.saveCommand}`, now, st);
      if (s) said.push(s);
    } else if (cmn !== null && cmn > QUIET_MIN) {
      const s = sayOnce(`quiet-${mine}`, `your worktree's last commit was ${cmn.toFixed(0)} min ago (more than ${QUIET_MIN}). If you are waiting on something slow, find why it is slow; if the work moved, save it`, now, st);
      if (s) said.push(s);
    }
  }
  // 4. the controller sees every worktree
  const scan = worktrees ?? (rows !== null ? {} : null);
  if (who === 'main' && (now - (st.scanned ?? 0) >= SCAN_MIN * 60 || scan !== null)) {
    st.scanned = now;
    const late = [];
    for (const wt of scan ? Object.keys(scan) : listWorktrees()) {
      const u = scan ? scan[wt] : unsavedMin(wt);
      if (u !== null && u > SAVE_MIN) late.push(`${wt.split('/').pop()} (${u.toFixed(0)} min)`);
    }
    if (late.length) said.push(`worktrees holding work unsaved for more than ${SAVE_MIN} min: ${late.join(', ')}. Ask their agents to save (${CFG.saveCommand}), or find why they stall`);
  }
  st.starts = Object.fromEntries(Object.entries(st.starts ?? {}).filter(([, v]) => now - v < 86400));
  if (!state) saveState(st);
  return said;
}

function loadState() { try { return JSON.parse(readFileSync(join(STATE, 'state.json'), 'utf8')); } catch { return {}; } }
function saveState(st) {
  try {
    mkdirSync(STATE, { recursive: true });
    const tmp = join(STATE, `state.${process.pid}.json`);
    writeFileSync(tmp, JSON.stringify(st));
    renameSync(tmp, join(STATE, 'state.json'));
  } catch { /* the guard never stops work by failing itself */ }
}

function selftest() {
  let bad = 0;
  const expect = (name, said, want) => { if ((said.length > 0) !== want) { bad += 1; console.error(`FAIL  ${name}: ${said.length ? 'said' : 'quiet'}`); } };
  const G = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --headless=new --disable-gpu';
  const post = (extra = {}) => ({ hook_event_name: 'PostToolUse', ...extra });
  const at = (rows, extra = {}) => ({ now: 5000, state: {}, rows, commitMin: 1, ...extra });
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

function main() {
  let event;
  try { event = JSON.parse(readFileSync(0, 'utf8')); } catch { return 0; }
  Object.assign(CFG, DEFAULTS, readLayout(projectRoot).guards?.time ?? {});
  let said;
  try { said = run(event); } catch { return 0; } // the guard never stops work by failing itself
  if (!said.length) return 0;
  process.stderr.write(`time-guard: ${said.join('\n time-guard: ')}\n`);
  return 2;
}

process.exit(process.argv.includes('--selftest') ? selftest() : main());
