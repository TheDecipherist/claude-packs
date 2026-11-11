// time-guard: nothing is slow without someone being told (after a night of two-hour panel exports that
// every agent, and the session watching them, took for normal).
//
// PreToolUse + PostToolUse on every tool, for the session and every agent it starts. After a call it tells the caller
// (exit 2 on PostToolUse: the call has run, nothing is blocked, the words reach the agent) when:
//   1. THE CALL ITSELF TOOK LONG: more than SLOW_CALL_MIN minutes (a question to the user never counts);
//   2. SOMETHING ON THE MACHINE IS SLOW (looked at once a minute at most): a panel export older than EXPORT_MIN, more than
//      CHROME_MAX headless Chromes or one older than CHROME_MIN, whoever started them; and, among the processes this session
//      started (lib/own-processes.mts, KWB-87: unattended sessions were told to kill the runners that started them), a build
//      older than BUILD_MIN, a ctest run older than CTEST_MIN, a probe older than PROBE_MIN (guards.time.probePattern says
//      what a probe is), a wait loop older than WAIT_LOOP_MIN. Another session's processes are its own guard's to judge;
//   3. AN AGENT'S WORKTREE HAS NOT MOVED: work unsaved for SAVE_MIN, no commit for QUIET_MIN, or two agents in one;
//   4. THE CONTROLLER (the session in the main checkout, never one working inside a worktree: KWB-87) sees every worktree
//      holding work unsaved for long, every SCAN_MIN minutes;
// and before a call it REFUSES a wait that can never end: `until ! pgrep -f "<words>"`, whose pgrep finds the loop's own
// command line (a heredoc body is text, not a loop). A finding is said again only after REPEAT_MIN minutes.
// Project values: .claude/layout.json "guards": { "time": { "probePattern", "saveCommand" } }.
//   node time-guard.mjs --selftest   (lib/time-guard-selftest.mts)
// On the hook contract (typescript order W4): the project, the environment, the session's pid and the time come from the event's
// context. A judge: what it remembers is kept in the caller's temp folder, never in the project, and its scan of every worktree
// runs detached as before (lib/time-state.mts; findings in lib/time-findings.mts).
import { fileURLToPath } from 'node:url';
import { contextOf, isMain, runAsHook } from './lib/hook-log.mts';
import { ownProcesses, processTable } from './lib/own-processes.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import { DEFAULTS, LIMITS, machineFindings, readOnlyCommand } from './lib/time-findings.mts';
import type { Row, TimeCfg } from './lib/time-findings.mts';
import { agentRunning, lastCommitMin, lateOf, loadState, placeOf, readLate, saveState, scanLater, scanNow, unsavedMin } from './lib/time-state.mts';
import type { GuardState, Late, Place } from './lib/time-state.mts';
import type { Hook, HookEvent } from './lib/types.d.mts';
import { pass, refuse } from './lib/verdict.mts';

export { DEFAULTS };

const CLAIM_LAPSE_MIN = 15;
const HEREDOC = /<<-?\s*['"]?(\w+)['"]?[^\n]*\n[\s\S]*?\n\s*\1\s*(?:\n|$)/g;   // a heredoc body is text, not a loop
const WORKTREE = /(\/[^\s'"]*?\/\.claude\/worktrees\/([\w.-]+))/;

/** What one call to `run` needs. The hook gives the first group from its context; a selftest gives the second (a made-up process table, its own state). */
export interface RunOptions {
  place: Place;
  cfg: TimeCfg;
  /** The hook's own file, started with `--scan-worktrees` for the controller's scan. */
  self: string;
  /** The Claude Code process the event came from. */
  sessionPid: number;
  /** Seconds since the epoch. */
  now: number;
  rows?: readonly Row[] | null;
  own?: ReadonlySet<number> | null;
  commitMin?: number | null | ((wt: string) => number | null);
  state?: GuardState | null;
  worktrees?: Readonly<Record<string, number | null>> | null;
  late?: Late | null;
}

/** Says a finding once: null while it was said less than REPEAT_MIN ago. */
function sayOnce(key: string, msg: string, now: number, st: GuardState): string | null {
  const told = (st.told ??= {});
  if (now - (told[key] ?? 0) < LIMITS.repeat * 60) return null;
  told[key] = now;
  return msg;
}

/** What the guard says about one event; remembers in `state` (a selftest's own) or in the caller's temp folder. */
export function run(event: HookEvent, opts: RunOptions): string[] {
  const { place, cfg, now } = opts;
  const rows = opts.rows ?? null;
  const st = opts.state ?? loadState(place);
  const keep = (): void => { if (!opts.state) saveState(place, st); };
  const said: string[] = [];
  const tid = typeof event['tool_use_id'] === 'string' ? event['tool_use_id'] : '';
  const input = event.tool_input ?? {};
  if (event.hook_event_name === 'PreToolUse') {
    const cmd = (event.tool_name === 'Bash' ? String(input.command ?? '') : '').replace(HEREDOC, '\n');
    if (/until\s+!\s*pgrep\s+-[a-z]*f\s+(['"])(?!\[)/.test(cmd)) {
      return ['REFUSED: `until ! pgrep -f "..."` never ends: pgrep -f finds the loop\'s own command line, which holds the same words. Run the work ' +
        "with run_in_background and wait for its notification; or, if you must poll, make the pattern unable to match itself: pgrep -f '[T]abulaFaceProbe --x'"];
    }
    if (tid) (st.starts ??= {})[tid] = now;
    keep();
    return [];
  }
  // 1. the call itself
  const started = tid ? st.starts?.[tid] : undefined;
  if (tid && st.starts) delete st.starts[tid];
  if (started !== undefined && event.tool_name !== 'AskUserQuestion' && (now - started) / 60 > LIMITS.slowCall) {
    said.push(`this call took ${((now - started) / 60).toFixed(0)} min (more than ${LIMITS.slowCall}): \`${String(input.command ?? event.tool_name ?? '').slice(0, 80)}\`. Find what made it slow before running it again; never wait on it as normal`);
  }
  // 2. the machine, once a minute at most
  if (now - (st.looked ?? 0) >= LIMITS.lookEveryS || rows !== null) {
    st.looked = now;
    const table = rows === null ? processTable() : null;
    const found = rows !== null ? machineFindings(rows, opts.own ?? null, cfg) : machineFindings((table ?? []).map((r): Row => [r.pid, r.age, r.cmd]), ownProcesses(table ?? [], opts.sessionPid), cfg);
    for (const [key, msg] of found) { const m = sayOnce(key, msg, now, st); if (m) said.push(m); }
  }
  // 3. each agent's own worktree, learned from the commands it runs (.claude/worktrees/<name>)
  const who = event.agent_id ?? 'main';
  if (who !== 'main') (st.seen ??= {})[who] = now; // when each agent last ran anything: a finished agent's claim lapses (below)
  const text = `${input.command ?? ''} ${input.file_path ?? ''}`;
  const lead = /^\s*cd\s+["']?([^\s'";&|]+)/.exec(String(input.command ?? ''))?.[1];
  const here = (lead ? WORKTREE.exec(lead) : null) ?? WORKTREE.exec(text); // KWB-140: the worktree THIS call works in: its leading cd, else the first it names
  for (const m of text.matchAll(new RegExp(WORKTREE.source, 'g'))) {
    if (who === 'main') continue;
    const [, path = '', name = ''] = m;
    const owner = (st.owner ??= {});
    let prev = owner[name];
    // a claim lapses with its agent: known stopped, or quiet for CLAIM_LAPSE_MIN (the agent-cap state that said "stopped" is no
    // longer written, so without the quiet rule a finished agent kept its worktree for ever and no successor could reuse its build)
    if (prev && prev !== who && (!agentRunning(prev, place.env) || now - (st.seen?.[prev] ?? 0) > CLAIM_LAPSE_MIN * 60)) prev = undefined;
    if (prev && prev !== who) {
      const s = sayOnce(`shared-${name}`, `the worktree .claude/worktrees/${name} is already used by another agent (${prev}). Each agent works only in its own: ` +
        'make yours (git worktree add --detach .claude/worktrees/<yours> main) and move your files there', now, st);
      if (s) said.push(s);
    } else {
      owner[name] = who;
      (st.wt ??= {})[who] = path;
    }
  }
  const readOnly = typeof input.command === 'string' && readOnlyCommand(input.command);
  let mine: string | null = who !== 'main' ? st.wt?.[who] ?? null : null;
  if (mine && here && who !== 'main') { // the call's own worktree, never the remembered one (KWB-140); another agent's is its own guard's
    mine = st.owner?.[here[2] ?? ''] === who ? here[1] ?? null : null;
    if (mine) (st.wt ??= {})[who] = mine;
  }
  if (mine && !readOnly) ((st.wrote ??= {})[who] ??= {})[mine] = true;
  if (mine && readOnly && !st.wrote?.[who]?.[mine]) mine = null; // a look at a worktree this session has not written to says nothing
  // its git status at most once a minute (KWB-24: two git commands on every call of every agent)
  if (mine && (rows !== null || now - (st.checked?.[mine] ?? 0) >= LIMITS.lookEveryS)) {
    if (rows === null) (st.checked ??= {})[mine] = now;
    const u = rows === null ? unsavedMin(mine, now, place.env) : null; // a selftest case: never git on a made-up path
    const cm = opts.commitMin;
    const cmn = typeof cm === 'function' ? cm(mine) : cm ?? lastCommitMin(mine, now, place.env);
    if (u !== null && u > LIMITS.save) {
      const s = sayOnce(`unsaved-${mine}`, `your worktree (${mine.split('/').pop()}) holds work unsaved for ${u.toFixed(0)} min (more than ${LIMITS.save}). Save it now: ${cfg.saveCommand}`, now, st);
      if (s) said.push(s);
    } else if (cmn !== null && cmn > LIMITS.quiet) {
      const s = sayOnce(`quiet-${mine}`, `your worktree's last commit was ${cmn.toFixed(0)} min ago (more than ${LIMITS.quiet}). If you are waiting on something slow, find why it is slow; if the work moved, save it`, now, st);
      if (s) said.push(s);
    }
  }
  // 4. the controller sees every worktree: a git status in each runs in its own process, never in the hook (KWB-24: a synth's
  // 125 worktrees took over a minute, the hook was killed at its timeout before it saved `scanned`, so every call scanned again)
  const controller = who === 'main' && !place.inWorktree; // a session working inside a worktree is not the controller (KWB-87)
  const scan = opts.worktrees ?? (rows !== null ? {} : null);
  const tell = (list: readonly string[]): void => { if (list.length) said.push(`worktrees holding work unsaved for more than ${LIMITS.save} min: ${list.join(', ')}. Ask their agents to save (${cfg.saveCommand}), or find why they stall`); };
  if (controller && (now - (st.scanned ?? 0) >= LIMITS.scan * 60 || scan !== null)) {
    st.scanned = now;
    if (scan) tell(lateOf(scan));
    else { saveState(place, st); scanLater(place, opts.self); }
  }
  const found = opts.late ?? (rows === null ? readLate(place) : null);
  if (controller && found && found.at > (st.lateTold ?? 0)) { st.lateTold = found.at; tell(found.list); }
  st.starts = Object.fromEntries(Object.entries(st.starts ?? {}).filter(([, v]) => now - v < 86400));
  keep();
  return said;
}

/** guards.time from the layout: the two strings it may set. */
function timeCfg(guards: Readonly<Record<string, unknown>> | undefined): Partial<TimeCfg> {
  const time = guards?.['time'];
  if (time === null || typeof time !== 'object') return {};
  const { probePattern, saveCommand } = time as Record<string, unknown>;
  return { ...(typeof probePattern === 'string' ? { probePattern } : {}), ...(typeof saveCommand === 'string' ? { saveCommand } : {}) };
}

export const hook: Hook = (event, ctx) => {
  let said: string[];
  try {
    said = run(event, { place: placeOf(ctx.projectDir, ctx.env), cfg: { ...DEFAULTS, ...timeCfg(ctx.layout.guards) }, self: fileURLToPath(import.meta.url), sessionPid: ctx.sessionPid, now: ctx.now / 1000 });
  } catch { return pass; } // the guard never stops work by failing itself
  return said.length ? refuse(`time-guard: ${said.join('\n time-guard: ')}`) : pass;
};

const loop = (pattern: string): string => ['until', '!', 'pgrep', '-f', pattern, '>/dev/null;', 'do', 'sleep', '5;', 'done'].join(' ');

/** The endless wait loop is refused in a worktree, and one that cannot match itself passes. */
export const worktreeCase: WorktreeCase = {
  steps: [
    { label: 'an endless wait loop after a cd into the worktree', event: { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: `cd {wt} && ${loop('"cmake --build"')}` } }, want: 2 },
    { label: 'a pgrep that cannot match itself', event: { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: `cd {wt} && ${loop("'[c]make --build'")}` } }, want: 0 },
  ],
};

export async function selftest(): Promise<number> {
  return (await import('./lib/time-guard-selftest.mts')).selftest(fileURLToPath(import.meta.url), run);
}

if (isMain(import.meta.url)) {
  await runAsHook(import.meta.url, 'time-guard', hook, selftest, {
    flags: { '--scan-worktrees': () => { const ctx = contextOf(); return scanNow(placeOf(ctx.projectDir, ctx.env), Date.now() / 1000); } },
  });
}
