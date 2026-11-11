// idle-wake: a proposed next step is started when the user has gone quiet ("If I havent said anything for
// 15min I am probably in bed. And unless there is no logical reason for you to not start the next thing ... then you
// obviously should start"; later: "maybe you also need to check memory at this time?").
//
// A Stop hook with `asyncRewake`: it runs in the background after the main session ends ANY turn, so the turn ends and
// The user can type. It watches the session's transcript; anything written to it (the user typing, an agent reporting, the session
// working) ends the watch quietly. After WAIT_MIN minutes of silence it exits 2, which wakes the session with the message
// below and EVERY ASK the user made in the last day, word for word (user-asks.mts). A turn that ends with the words NOTHING OPEN
// starts no watch, so a finished night does not wake itself every 15 minutes.
//   node idle-wake.mjs --selftest
// On the hook contract (typescript order W4): `hook(event, ctx)` waits and returns its Verdict, and the import does nothing (it
// once ran at the top level). It keeps its own settings entry (asyncRewake: it never runs inside the runner).
import { appendFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { isMain, runAsHook } from './lib/hook-log.mts';
import { promptFile, runHook, scratchProject, snapshot, verdicts, writtenSince } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { Hook, HookEvent } from './lib/types.d.mts';
import { pass, refuse } from './lib/verdict.mts';
import { listFor } from './user-asks.mts';

const PROPOSES = new RegExp([
  "\\bnext,?\\s+(?:I(?:'d|\\s+would|\\s+will|'ll)|is|up|step|on\\s+my\\s+list|comes?)\\b",
  '\\b(?:shall|should|can|may)\\s+I\\b', '\\b(?:want|like)\\s+me\\s+to\\b', '\\bwould\\s+you\\s+like\\b', '\\bdo\\s+you\\s+want\\b',
  "\\bI(?:'d|\\s+would)?\\s+(?:recommend|suggest|propose)\\b", '\\bmy\\s+recommendation\\b',
  "\\bI'll\\s+(?:start|begin|continue|carry\\s+on|pick\\s+up|move\\s+on)\\b", "\\bthen\\s+I(?:'ll|\\s+will)\\b", '\\bready\\s+to\\s+(?:start|begin|go)\\b',
].join('|'), 'i');

const wakeWords = (m: number, what: string): string => `idle-wake: The user has said nothing for ${m.toFixed(0)} minutes since you ${what}. They are probably away. First go through their asks ` +
  "below and build.md's In progress: anything not done and proved is open work. Then, unless there is a logical reason not to (it needs their eyes, " +
  'ears or hands, it is destructive or outward-facing, or it waits on something unfinished), START the next thing NOW, so what was started is ' +
  'finished when they are back. If there is such a reason, say it in one line and take the next thing instead. If truly nothing is left that you ' +
  'can do, end your turn with the words NOTHING OPEN.';

export function proposes(text: string): boolean {
  if (!text) return false;
  const tail = text.trim().slice(-1500);
  return PROPOSES.test(tail) || tail.trimEnd().endsWith('?');
}

const sizeOf = (path: string): string | null => { try { const s = statSync(path); return `${s.size}:${s.mtimeMs}`; } catch { return null; } };
const nap = (s: number): Promise<void> => new Promise((done) => setTimeout(done, s * 1000));

/** [0, ''] when there is nothing to do or activity was seen; [2, words] after silence for waitS. `listAsks` reads the user's asks of a transcript. */
export async function watch(event: HookEvent, waitS: number, lookS: number, sleep: (s: number) => Promise<void>, listAsks: (transcript: string) => string): Promise<[number, string]> {
  if (event.hook_event_name !== undefined && event.hook_event_name !== 'Stop') return [0, ''];
  const msg = event.last_assistant_message ?? '';
  if (msg.includes('NOTHING OPEN')) return [0, ''];
  const path = event.transcript_path;
  if (!path) return [0, ''];
  const first = sizeOf(path);
  for (let waited = 0; waited < waitS; waited += lookS) {
    await sleep(lookS);
    if (sizeOf(path) !== first) return [0, ''];
  }
  let words = wakeWords(waitS / 60, proposes(msg) ? 'proposed or asked about a next step' : 'ended a turn');
  try { const listed = listAsks(path); if (listed) words += `\n\n${listed}`; } catch { /* the wake still goes */ }
  return [2, words];
}

export const hook: Hook = async (event, ctx) => {
  const waitS = Number(ctx.env['IDLE_WAKE_MIN'] ?? 15) * 60;
  const lookS = Number(ctx.env['IDLE_WAKE_LOOK_S'] ?? 10);
  const [code, words] = await watch(event, waitS, lookS, nap, (path) => listFor(path, ctx.env, ctx.projectDir, ctx.now / 1000 + waitS));
  return code === 2 ? refuse(words) : pass;
};

/** A turn that ends with NOTHING OPEN starts no watch in a worktree either (the wake itself is timed, so it stays in the cases file). */
export const worktreeCase: WorktreeCase = {
  files: { '{wt}/transcript.jsonl': '{}\n' },
  steps: [{ label: 'a turn ending NOTHING OPEN', event: { hook_event_name: 'Stop', transcript_path: '{wt}/transcript.jsonl', last_assistant_message: 'All done. NOTHING OPEN' }, want: 0 }],
};

export async function selftest(): Promise<number> {
  const dir = scratchProject();
  const t = promptFile(dir, 't', 'start');
  const ev = (m: string): HookEvent => ({ hook_event_name: 'Stop', transcript_path: t, last_assistant_message: m });
  const still = async (): Promise<void> => {};
  const quiet = async (): Promise<void> => { appendFileSync(t, '{"type":"user"}\n'); };
  const none = (): string => '';
  const exit = async (m: string, sleep = still): Promise<number> => (await watch(ev(m), 3, 1, sleep, none))[0];
  const listed = (await watch(ev('Done.'), 3, 1, still, () => 'THE ASKS'))[1];
  const before = snapshot(dir);
  const nothing = runHook(fileURLToPath(import.meta.url), dir, ev('All asks done and proved. NOTHING OPEN')).status;
  return verdicts('idle-wake', [
    ["silence after 'Next I'd build P4'", await exit("Done. Next I'd build P4 PAD SETUP."), 2],
    ["silence after 'Shall I start the bank?'", await exit('All green. Shall I start the bank?'), 2],
    ["silence after 'My recommendation'", await exit('My recommendation: the cache first.'), 2],
    ['silence after a plain report (every turn arms)', await exit('K10 is landed as fb67cbb3. 46 of 46 green.'), 2],
    ['a turn ending NOTHING OPEN', await exit('All asks done and proved. NOTHING OPEN'), 0],
    ['another hook event', (await watch({ hook_event_name: 'PostToolUse', transcript_path: t, last_assistant_message: 'Shall I?' }, 3, 1, still, none))[0], 0],
    ['the wake carries the asks', listed.includes('THE ASKS') ? 1 : 0, 1],
    ['a turn ending NOTHING OPEN, through the runner, starts no watch', nothing, 0],
    ['a judge writes no file (the write trap)', writtenSince(dir, before).join(','), ''],
    ['the question mark and the proposal are read as proposals, a plain report is not', proposes('Shall I go on?') && !proposes('Landed.') ? 1 : 0, 1],
    // the user types during the wait: the watch ends quietly (last, since it appends to the transcript)
    ['the user types during the wait', await exit("Next I'd build P4.", quiet), 0],
  ]);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'idle-wake', hook, selftest);
