// run-keeps-going: a session with nobody there ends its turn only when its work order is DONE, or when a stretch since the last
// send-back moved nothing (unattended-runs: "never end a run with work left that you could have done"). The rule alone was not
// followed: supernova2's sessions 3 to 28 each did one item in 10 to 25 turns and ended, saying the order was "nowhere near
// finished" (KWB-next), so every item paid a cold start.
// A Stop hook. Nobody there is lib/unattended.mts (CLAUDE_PACKS_UNATTENDED, or a `claude -p` session). The order is
// CLAUDE_PACKS_ORDER (run.sh sets it), else the one folder under docs/workorders with a progress.md and no DONE; with none, or
// more than one and none named, it passes. Progress is the order's progress.md: the hook keeps its hash at each send-back in
// .claude/state/run-keeps-going.json and counts the send-backs in a row that recorded nothing; the third such ends the turn, so a
// run that cannot move never loops. One send-back was not enough: each session met it with a wrap-up (a refusal marked, a commit)
// that recorded nothing, and its next Stop passed (KWB-next, supernova2 tonight: 6 sessions in 15 minutes, each sent back once).
//   node run-keeps-going.mjs --selftest
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDir } from './lib/files.mts';
import { shortHash } from './lib/hash.mts';
import { contextOf, isMain, runAsHook } from './lib/hook-log.mts';
import { readJson, writeJson } from './lib/json.mts';
import { put, runHook, scratchProject, verdicts } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { Hook, VerdictRow } from './lib/types.d.mts';
import { unattended } from './lib/unattended.mts';
import { pass, refuse } from './lib/verdict.mts';

const ORDERS = join('docs', 'workorders');
const STATE = join('.claude', 'state', 'run-keeps-going.json');
const STALLS = 3;   // send-backs in a row with nothing new in progress.md before a turn may end

/** The order this run works on: the one named, else the only one with progress and no DONE; null when that is not one. */
export function openOrder(root: string, named: string | undefined): string | null {
  if (named) return existsSync(join(root, ORDERS, named)) ? named : null;
  let all: string[] = [];
  try { all = readdirSync(join(root, ORDERS), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name); } catch { return null; }
  const open = all.filter((o) => existsSync(join(root, ORDERS, o, 'progress.md')) && !existsSync(join(root, ORDERS, o, 'DONE')));
  return open.length === 1 ? (open[0] ?? null) : null;
}

const progressHash = (root: string, order: string): string => {
  try { return shortHash(readFileSync(join(root, ORDERS, order, 'progress.md'), 'utf8')); } catch { return ''; }
};

export const hook: Hook = (event, ctx) => {
  if (event.hook_event_name !== 'Stop' || !unattended(ctx)) return pass;
  const root = ctx.projectDir;
  const order = openOrder(root, ctx.env['CLAUDE_PACKS_ORDER']);
  if (!order || existsSync(join(root, ORDERS, order, 'DONE'))) return pass;
  const now = progressHash(root, order);
  const last = readJson<{ session?: unknown; progress?: unknown; stalls?: unknown }>(join(root, STATE));
  // sent back already and nothing recorded since: one more stall; STALLS of them in a row and this run cannot move now
  const same = event.stop_hook_active === true && last?.session === event.session_id && last?.progress === now;
  const stalls = same ? (typeof last?.stalls === 'number' ? last.stalls : 0) + 1 : 0;
  if (stalls >= STALLS) return pass;
  ensureDir(join(root, '.claude', 'state'));
  writeJson(join(root, STATE), { session: event.session_id ?? null, progress: now, stalls });
  return refuse(
    `BLOCKED by run-keeps-going: nobody is there, and work order ${order} has no DONE. Do not end the turn, and do not answer with a `
    + `summary: start the next item now (docs/workorders/${order}/progress.md says where the run stands), record it there when it is done, `
    + `and go on to the one after. The turn ends on the DONE file, or after ${STALLS} send-backs in a row that record nothing new in `
    + 'progress.md: if something truly stops the run, write what in progress.md first.',
  );
};

/** A Stop where no order has progress passes, in the worktree and in the main checkout: whoever runs the test, nobody there or not. */
export const worktreeCase: WorktreeCase = {
  steps: [
    { label: 'a Stop in the worktree, no order running', event: { hook_event_name: 'Stop', session_id: 'wt', cwd: '{wt}' }, want: 0 },
    { label: 'a Stop in the main checkout, no order running', event: { hook_event_name: 'Stop', session_id: 'wt', cwd: '{here}' }, want: 0 },
  ],
};

export function selftest(): number {
  const hookFile = fileURLToPath(import.meta.url);
  const project = (orders: Record<string, { progress?: string; done?: boolean }>): string => {
    const files: Record<string, string> = { 'README.md': '# x\n' };
    for (const [name, o] of Object.entries(orders)) {
      files[`docs/workorders/${name}/workorder.md`] = '# order\n';
      if (o.progress !== undefined) files[`docs/workorders/${name}/progress.md`] = o.progress;
      if (o.done) files[`docs/workorders/${name}/DONE`] = 'done\n';
    }
    return scratchProject(files);
  };
  const stop = (dir: string, env: Record<string, string> = { CLAUDE_PACKS_UNATTENDED: '1' }, extra: Record<string, unknown> = {}): number => {
    const v = hook({ hook_event_name: 'Stop', session_id: 's1', ...extra }, contextOf({ projectDir: dir, cwd: dir, env: { CLAUDE_PROJECT_DIR: dir, ...env } }));
    return v instanceof Promise ? -1 : v.code;
  };
  // a wrap-up that records nothing is sent back again; the third stall in a row ends; one that recorded an item is sent back again
  const stalls = (n: number): number => {
    const d = project({ a: { progress: '- W1.1 x\n' } });
    let code = stop(d);
    for (let i = 0; i < n; i += 1) code = stop(d, undefined, { stop_hook_active: true });
    return code;
  };
  const moving = (): number => {
    const d = project({ a: { progress: '- W1.1 x\n' } });
    stop(d);
    put(join(d, 'docs/workorders/a/progress.md'), '- W1.1 x\n- W1.2 y\n');
    return stop(d, undefined, { stop_hook_active: true });
  };
  const rows: VerdictRow[] = [
    ['an open order, nobody there', stop(project({ a: { progress: '- W1.1 x\n' } })), 2],
    ['the order is DONE', stop(project({ a: { progress: '- W1 done\n', done: true } })), 0],
    ['the order the run names is DONE', stop(project({ a: { progress: '- W1 done\n', done: true } }), { CLAUDE_PACKS_UNATTENDED: '1', CLAUDE_PACKS_ORDER: 'a' }), 0],
    ['someone is there', stop(project({ a: { progress: '' } }), { CLAUDE_PACKS_UNATTENDED: '0' }), 0],
    ['no order with progress', stop(project({ a: {} })), 0],
    ['two open orders, none named', stop(project({ a: { progress: '' }, b: { progress: '' } })), 0],
    ['two open orders, one named by the run', stop(project({ a: { progress: '' }, b: { progress: '' } }), { CLAUDE_PACKS_UNATTENDED: '1', CLAUDE_PACKS_ORDER: 'b' }), 2],
    ['sent back, a wrap-up that records nothing: sent back again', stalls(1), 2],
    ['two stalls in a row: sent back again', stalls(2), 2],
    ['three stalls in a row: it ends (never loops)', stalls(STALLS), 0],
    ['sent back, an item recorded since: sent back again', moving(), 2],
    ['a hook event that is not Stop, as the runner calls it', runHook(hookFile, project({ a: { progress: '' } }), { hook_event_name: 'PostToolUse', session_id: 's1' }).status ?? -1, 0],
  ];
  return verdicts('run-keeps-going', rows);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'run-keeps-going', hook, selftest);
