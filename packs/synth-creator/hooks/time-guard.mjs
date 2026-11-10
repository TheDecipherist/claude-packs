#!/usr/bin/env node
// time-guard: nothing is slow without someone being told (after a night of two-hour panel exports that
// every agent, and the session watching them, took for normal).
//
// PreToolUse + PostToolUse on every tool, for the session and every agent it starts. After a call it tells the caller
// (exit 2 on PostToolUse: the call has run, nothing is blocked, the words reach the agent) when:
//   1. THE CALL ITSELF TOOK LONG: more than SLOW_CALL_MIN minutes (a question to the user never counts);
//   2. SOMETHING ON THE MACHINE IS SLOW (looked at once a minute at most): a panel export older than EXPORT_MIN, more than
//      CHROME_MAX headless Chromes or one older than CHROME_MIN, whoever started them; and, among the processes this session
//      started (lib/own-processes.mjs, KWB-87: unattended sessions were told to kill the runners that started them), a build
//      older than BUILD_MIN, a ctest run older than CTEST_MIN, a probe older than PROBE_MIN (guards.time.probePattern says
//      what a probe is), a wait loop older than WAIT_LOOP_MIN. Another session's processes are its own guard's to judge;
//   3. AN AGENT'S WORKTREE HAS NOT MOVED: work unsaved for SAVE_MIN, no commit for QUIET_MIN, or two agents in one;
//   4. THE CONTROLLER (the session in the main checkout, never one working inside a worktree: KWB-87) sees every worktree
//      holding work unsaved for long, every SCAN_MIN minutes;
// and before a call it REFUSES a wait that can never end: `until ! pgrep -f "<words>"`, whose pgrep finds the loop's own
// command line (a heredoc body is text, not a loop). A finding is said again only after REPEAT_MIN minutes.
// Project values: .claude/layout.json "guards": { "time": { "probePattern", "saveCommand" } }.
//   node time-guard.mjs --selftest   (lib/time-guard-selftest.mjs)
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readLayout } from './lib/layout.mjs';
import { asHook, isMain } from './lib/hook-log.mjs';
import { ownProcesses, processTable } from './lib/own-processes.mjs';

export const DEFAULTS = {
  probePattern: '\\S*/\\w*(?:Probe|_probe)\\b', // the probe binary itself, never a shell that names one
  saveCommand: 'git add <paths> && git commit -m "<note>" -- <paths>',
};
export const CFG = { ...DEFAULTS };
const SLOW_CALL_MIN = 10, EXPORT_MIN = 5, CHROME_MAX = 6, CHROME_MIN = 5, BUILD_MIN = 30, CTEST_MIN = 45, PROBE_MIN = 20;
const QUIET_MIN = 60, SAVE_MIN = 30, SCAN_MIN = 15, WAIT_LOOP_MIN = 60, REPEAT_MIN = 10, LOOK_EVERY_S = 60;

const projectDir = resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
const projectRoot = projectDir.replace(/\/\.claude\/worktrees\/[^/]+(\/.*)?$/, '');
const IN_WORKTREE = projectDir !== projectRoot;
const STATE = join(process.env.TMPDIR ?? tmpdir(), `time-guard-${basename(projectRoot).replace(/[^\w.-]/g, '-') || 'project'}`);
const sh = (cmd, args, cwd) => { try { return execFileSync(cmd, args, { cwd, encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; } };

// rows: [pid, age in s, command]; own: the pids this session started, or null when that cannot be known (then every process)
export function machineFindings(rows, own = null) {
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
    } else if (own && !own.has(pid)) {
      continue; // another session's build, test run, probe or loop (KWB-87)
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

// A command that only looks: every segment starts with a read-only program (a `cd` first is only where), no redirect.
const LOOKS = new Set(['ls', 'cat', 'head', 'tail', 'grep', 'rg', 'find', 'wc', 'stat', 'pwd', 'echo', 'file', 'diff', 'du', 'tree', 'sort', 'cut', 'awk']);
const GIT_LOOKS = new Set(['status', 'log', 'diff', 'show', 'branch', 'rev-parse', 'ls-files', 'ls-remote', 'worktree', 'remote', 'blame']);
export function readOnlyCommand(cmd) {
  const body = cmd.replace(/<<-?\s*['"]?(\w+)['"]?[^\n]*\n[\s\S]*?\n\s*\1\s*(?:\n|$)/g, '\n');
  if (/(?:^|[^-=])>|\btee\b|\$\(|`/.test(body.replace(/2>&1|>\s*\/dev\/null/g, ''))) return false;
  const segs = body.split(/&&|\|\||;|\||\n/).map((x) => x.trim()).filter((x) => x && !/^cd(\s|$)/.test(x));
  return segs.length > 0 && segs.every((x) => { const w = x.split(/\s+/); return LOOKS.has(w[0]) || (w[0] === 'git' && GIT_LOOKS.has(w.find((a, i) => i && !a.startsWith('-') && !(w[i - 1] === '-C')) ?? '')); });
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

export function run(event, { now = Date.now() / 1000, rows = null, own, commitMin = null, state = null, worktrees = null, late = null, inWorktree = IN_WORKTREE } = {}) {
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
    const table = rows === null ? processTable() : null;
    const found = rows !== null ? machineFindings(rows, own ?? null) : machineFindings(table.map((r) => [r.pid, r.age, r.cmd]), ownProcesses(table));
    for (const [key, msg] of found) { const m = sayOnce(key, msg, now, st); if (m) said.push(m); }
  }
  // 3. each agent's own worktree, learned from the commands it runs (.claude/worktrees/<name>)
  const who = event.agent_id ?? 'main';
  if (who !== 'main') (st.seen ??= {})[who] = now; // when each agent last ran anything: a finished agent's claim lapses (below)
  const text = `${input.command ?? ''} ${input.file_path ?? ''}`;
  const WT = /(\/[^\s'"]*?\/\.claude\/worktrees\/([\w.-]+))/;
  const lead = /^\s*cd\s+["']?([^\s'";&|]+)/.exec(String(input.command ?? ''))?.[1];
  const here = (lead && WT.exec(lead)) || WT.exec(text); // KWB-140: the worktree THIS call works in: its leading cd, else the first it names
  for (const m of text.matchAll(new RegExp(WT.source, 'g'))) {
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
  const readOnly = typeof input.command === 'string' && readOnlyCommand(String(input.command ?? ''));
  let mine = who !== 'main' ? st.wt?.[who] : null;
  if (mine && here && who !== 'main') { // the call's own worktree, never the remembered one (KWB-140); another agent's is its own guard's
    mine = st.owner?.[here[2]] === who ? here[1] : null;
    if (mine) st.wt[who] = mine;
  }
  if (mine && !readOnly) ((st.wrote ??= {})[who] ??= {})[mine] = true;
  if (mine && readOnly && !st.wrote?.[who]?.[mine]) mine = null; // a look at a worktree this session has not written to says nothing
  // its git status at most once a minute (KWB-24: two git commands on every call of every agent)
  if (mine && (rows !== null || now - (st.checked?.[mine] ?? 0) >= LOOK_EVERY_S)) {
    if (rows === null) (st.checked ??= {})[mine] = now;
    const u = rows === null ? unsavedMin(mine) : null; // a selftest case: never git on a made-up path
    const cmn = typeof commitMin === 'function' ? commitMin(mine) : commitMin ?? lastCommitMin(mine);
    if (u !== null && u > SAVE_MIN) {
      const s = sayOnce(`unsaved-${mine}`, `your worktree (${mine.split('/').pop()}) holds work unsaved for ${u.toFixed(0)} min (more than ${SAVE_MIN}). Save it now: ${CFG.saveCommand}`, now, st);
      if (s) said.push(s);
    } else if (cmn !== null && cmn > QUIET_MIN) {
      const s = sayOnce(`quiet-${mine}`, `your worktree's last commit was ${cmn.toFixed(0)} min ago (more than ${QUIET_MIN}). If you are waiting on something slow, find why it is slow; if the work moved, save it`, now, st);
      if (s) said.push(s);
    }
  }
  // 4. the controller sees every worktree: a git status in each runs in its own process, never in the hook (KWB-24: a synth's
  // 125 worktrees took over a minute, the hook was killed at its timeout before it saved `scanned`, so every call scanned again)
  const controller = who === 'main' && !inWorktree; // a session working inside a worktree is not the controller (KWB-87)
  const scan = worktrees ?? (rows !== null ? {} : null);
  const tell = (list) => list.length && said.push(`worktrees holding work unsaved for more than ${SAVE_MIN} min: ${list.join(', ')}. Ask their agents to save (${CFG.saveCommand}), or find why they stall`);
  if (controller && (now - (st.scanned ?? 0) >= SCAN_MIN * 60 || scan !== null)) {
    st.scanned = now;
    if (scan) tell(lateOf(scan));
    else { saveState(st); scanLater(); }
  }
  const found = late ?? (rows === null ? readLate() : null);
  if (controller && found && found.at > (st.lateTold ?? 0)) { st.lateTold = found.at; tell(found.list); }
  st.starts = Object.fromEntries(Object.entries(st.starts ?? {}).filter(([, v]) => now - v < 86400));
  if (!state) saveState(st);
  return said;
}

const lateOf = (unsaved) => Object.entries(unsaved).filter(([, u]) => u !== null && u > SAVE_MIN).map(([wt, u]) => `${wt.split('/').pop()} (${u.toFixed(0)} min)`);
const LATE = join(STATE, 'late.json');
function readLate() { try { return JSON.parse(readFileSync(LATE, 'utf8')); } catch { return null; } }
function scanLater() { try { spawn(process.execPath, [fileURLToPath(import.meta.url), '--scan-worktrees'], { cwd: projectRoot, detached: true, stdio: 'ignore', env: process.env }).unref(); } catch { /* next time */ } }
function scanNow() {
  const list = lateOf(Object.fromEntries(listWorktrees().map((wt) => [wt, unsavedMin(wt)])));
  try { mkdirSync(STATE, { recursive: true }); writeFileSync(`${LATE}.${process.pid}`, JSON.stringify({ at: Date.now() / 1000, list })); renameSync(`${LATE}.${process.pid}`, LATE); } catch { /* next time */ }
  return 0;
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

function main(text) {
  let event;
  try { event = JSON.parse(text); } catch { return 0; }
  Object.assign(CFG, DEFAULTS, readLayout(projectRoot).guards?.time ?? {});
  let said;
  try { said = run(event); } catch { return 0; } // the guard never stops work by failing itself
  if (!said.length) return 0;
  process.stderr.write(`time-guard: ${said.join('\n time-guard: ')}\n`);
  return 2;
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) {
  process.exit(process.argv.includes('--selftest') ? (await import('./lib/time-guard-selftest.mjs')).selftest({ run, CFG, DEFAULTS }) : process.argv.includes('--scan-worktrees') ? scanNow() : await asHook('time-guard', main));
}
