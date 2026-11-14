// run-keeps-going: a session with nobody there ends its turn only when its work order is DONE, or when a stretch since the last
// send-back moved nothing (unattended-runs: "never end a run with work left that you could have done"). The rule alone was not
// followed: supernova2's sessions 3 to 28 each did one item in 10 to 25 turns and ended, saying the order was "nowhere near
// finished" (KWB-next), so every item paid a cold start.
// A Stop hook. Nobody there is lib/unattended.mts (CLAUDE_PACKS_UNATTENDED, or a `claude -p` session). The order is
// CLAUDE_PACKS_ORDER (run.sh sets it), else the one folder under docs/workorders with a progress.md and no DONE; with none, or
// more than one and none named, it passes. Progress is the order's progress.md: the hook keeps its hash at each send-back in
// .claude/state/run-keeps-going.json, and a turn already sent back (stop_hook_active) whose progress.md has not changed since
// ends, so a run that cannot move never loops.
//   node run-keeps-going.mjs --selftest
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shortHash } from './lib/hash.mts';
import { contextOf, isMain, runAsHook } from './lib/hook-log.mts';
import { readJson, writeJson } from './lib/json.mts';
import { put, runHook, scratchProject, verdicts } from './lib/selftest.mts';
import type { Hook, VerdictRow } from './lib/types.d.mts';
import { unattended } from './lib/unattended.mts';
import { pass, refuse } from './lib/verdict.mts';

const ORDERS = join('docs', 'workorders');
const STATE = join('.claude', 'state', 'run-keeps-going.json');

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
  const last = readJson<{ session?: unknown; progress?: unknown }>(join(root, STATE));
  // sent back already, and nothing recorded since: this run cannot move now, and the next session starts fresh
  if (event.stop_hook_active && last?.session === event.session_id && last?.progress === now) return pass;
  writeJson(join(root, STATE), { session: event.session_id ?? null, progress: now });
  return refuse(
    `BLOCKED by run-keeps-going: nobody is there, and work order ${order} has no DONE. Do not end the turn: start the next item `
    + `(docs/workorders/${order}/progress.md says where the run stands), record it there when it is done, and go on. `
    + 'The turn ends on the DONE file, or when a stretch records nothing new in progress.md: then say in progress.md what stops the run.',
  );
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
  // a run that recorded nothing after its send-back ends; one that recorded an item is sent back again
  const stalled = (): number => { const d = project({ a: { progress: '- W1.1 x\n' } }); stop(d); return stop(d, undefined, { stop_hook_active: true }); };
  const moving = (): number => {
    const d = project({ a: { progress: '- W1.1 x\n' } });
    stop(d);
    put(join(d, 'docs/workorders/a/progress.md'), '- W1.1 x\n- W1.2 y\n');
    return stop(d, undefined, { stop_hook_active: true });
  };
  const rows: VerdictRow[] = [
    ['an open order, nobody there', stop(project({ a: { progress: '- W1.1 x\n' } })), 2],
    ['the order is DONE', stop(project({ a: { progress: '- W1 done\n', done: true } })), 0],
    ['someone is there', stop(project({ a: { progress: '' } }), { CLAUDE_PACKS_UNATTENDED: '0' }), 0],
    ['no order with progress', stop(project({ a: {} })), 0],
    ['two open orders, none named', stop(project({ a: { progress: '' }, b: { progress: '' } })), 0],
    ['two open orders, one named by the run', stop(project({ a: { progress: '' }, b: { progress: '' } }), { CLAUDE_PACKS_UNATTENDED: '1', CLAUDE_PACKS_ORDER: 'b' }), 2],
    ['sent back, nothing recorded since: it ends (never loops)', stalled(), 0],
    ['sent back, an item recorded since: sent back again', moving(), 2],
    ['a hook event that is not Stop, as the runner calls it', runHook(hookFile, project({ a: { progress: '' } }), { hook_event_name: 'PostToolUse', session_id: 's1' }).status ?? -1, 0],
  ];
  return verdicts('run-keeps-going', rows);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'run-keeps-going', hook, selftest);
