// making-check-count (Stop and SubagentStop, after making-check): counts the send-backs of making-check, per session. Three
// send-backs with the same findings end the turn, and that count is state: making-check (a judge) writes nothing and only reads
// it, so this recorder keeps it (typescript W4; lib/send-backs.mts). It reads the turn as making-check does (lib/making-check-turn.mts)
// and refuses nothing. It must run after making-check, so the judge reads the count as it stood before this stop.
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readText } from './lib/files.mts';
import { readJson, toJson } from './lib/json.mts';
import { isMain, runAsHook } from './lib/hook-log.mts';
import { check } from './lib/making-check-turn.mts';
import { put, runHook, scratchProject, verdicts } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import { recordSendBack, sendBackFile } from './lib/send-backs.mts';
import type { SendBacks } from './lib/send-backs.mts';
import type { Hook } from './lib/types.d.mts';
import { MAKING, logUsage } from './lib/usage-log.mts';
import { pass } from './lib/verdict.mts';

export const hook: Hook = (event, ctx) => {
  if (event.hook_event_name && !['Stop', 'SubagentStop'].includes(event.hook_event_name)) return pass;
  const problems = check(event, ctx);
  recordSendBack(sendBackFile(ctx.env, event.session_id), problems);
  // making-check reports and no longer holds the turn (KWB-234): what it found is kept here, for the supervisor's turn check
  for (const finding of problems) logUsage(ctx, event, MAKING, { finding });
  return pass;
};

/** A recorder refuses nothing, in a worktree as in the main checkout. */
export const worktreeCase: WorktreeCase = {
  steps: [
    { label: 'a stop with no transcript counts nothing and refuses nothing', event: { hook_event_name: 'Stop', cwd: '{wt}', session_id: 'wtc-count' }, want: 0 },
  ],
};

const SLOT = 'float slotGain (int slot) { return gains[slot]; }\n';

export function selftest(): number {
  const hookFile = fileURLToPath(import.meta.url);
  const shape = { concepts: { slot: { shape: 'many', count: 4, generator: 'slotId(i, field)', words: ['slot'] } }, exclude: [] };
  const dir = scratchProject({ 'design/shape.json': toJson(shape), '.claude/logs/.keep': '' });   // a project has its .claude/: the log is kept there
  const session = `count-${basename(dir)}`;   // the scratch folder's own name: no other run shares it
  const file = sendBackFile({}, session);
  const turn = (name: string, writes: boolean): string => {
    const write = { type: 'assistant', cwd: dir, message: { content: [{ type: 'tool_use', id: 'w1', name: 'Write', input: { file_path: join(dir, 'src/gain.cpp'), content: SLOT } }] } };
    put(join(dir, name), [{ type: 'user', message: { content: 'go' } }, ...(writes ? [write] : [])].map((e) => toJson(e)).join('\n'));
    return join(dir, name);
  };
  const faulty = turn('faulty.jsonl', true);   // wrote slot code, no making line: a send-back
  const clean = turn('clean.jsonl', false);
  const stop = (transcript: string): number | null => runHook(hookFile, dir, { hook_event_name: 'Stop', transcript_path: transcript, cwd: dir, session_id: session }).status;
  const count = (): unknown => readJson<SendBacks>(file)?.count ?? null;
  const rows: [string, unknown, unknown][] = [['no count before the first stop', count(), null]];
  rows.push(['a turn with findings is counted, and the recorder refuses nothing', `${stop(faulty)}:${String(count())}`, '0:1']);
  rows.push(['the same findings again make two', `${stop(faulty)}:${String(count())}`, '0:2']);
  rows.push(['a clean turn resets the count', `${stop(clean)}:${String(count())}`, '0:0']);
  const kept = (readText(join(dir, MAKING)) ?? '').split('\n').filter((l) => l.includes('"finding"')).length;
  rows.push(['each finding is kept in the making log, the clean turn adds none (KWB-234)', kept > 0 && kept % 2 === 0 ? 'kept' : String(kept), 'kept']);
  return verdicts('making-check-count', rows.map(([label, got, want]) => [label, String(got), String(want)]));
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'making-check-count', hook, selftest);
