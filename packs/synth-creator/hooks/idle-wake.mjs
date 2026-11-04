#!/usr/bin/env node
// idle-wake: a proposed next step is started when Tim has gone quiet (Tim, 2026-10-11: "If I havent said anything for
// 15min I am probably in bed. And unless there is no logical reason for you to not start the next thing ... then you
// obviously should start"; later: "maybe you also need to check memory at this time?").
//
// A Stop hook with `asyncRewake`: it runs in the background after the main session ends ANY turn, so the turn ends and
// Tim can type. It watches the session's transcript; anything written to it (Tim typing, an agent reporting, the session
// working) ends the watch quietly. After WAIT_MIN minutes of silence it exits 2, which wakes the session with the message
// below and EVERY ASK Tim made in the last day, word for word (tims-asks.mjs). A turn that ends with the words NOTHING OPEN
// starts no watch, so a finished night does not wake itself every 15 minutes.
//   node idle-wake.mjs --selftest
import { appendFileSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { asks, render } from './tims-asks.mjs';

const WAIT_MIN = Number(process.env.IDLE_WAKE_MIN ?? 15);
const LOOK_S = Number(process.env.IDLE_WAKE_LOOK_S ?? 10);

const PROPOSES = new RegExp([
  "\\bnext,?\\s+(?:I(?:'d|\\s+would|\\s+will|'ll)|is|up|step|on\\s+my\\s+list|comes?)\\b",
  '\\b(?:shall|should|can|may)\\s+I\\b', '\\b(?:want|like)\\s+me\\s+to\\b', '\\bwould\\s+you\\s+like\\b', '\\bdo\\s+you\\s+want\\b',
  "\\bI(?:'d|\\s+would)?\\s+(?:recommend|suggest|propose)\\b", '\\bmy\\s+recommendation\\b',
  "\\bI'll\\s+(?:start|begin|continue|carry\\s+on|pick\\s+up|move\\s+on)\\b", "\\bthen\\s+I(?:'ll|\\s+will)\\b", '\\bready\\s+to\\s+(?:start|begin|go)\\b',
].join('|'), 'i');

const WAKE = (m, what) => `idle-wake: Tim has said nothing for ${m.toFixed(0)} minutes since you ${what}. He is probably in bed. First go through his asks ` +
  "below and build.md's In progress: anything not done and proved is open work. Then, unless there is a logical reason not to (it needs his eyes, " +
  'ears or hands, it is destructive or outward-facing, or it waits on something unfinished), START the next thing NOW, so what was started is ' +
  'finished when he wakes. If there is such a reason, say it in one line and take the next thing instead. If truly nothing is left that you ' +
  'can do, end your turn with the words NOTHING OPEN.';

export function proposes(text) {
  if (!text) return false;
  const tail = text.trim().slice(-1500);
  return PROPOSES.test(tail) || tail.trimEnd().endsWith('?');
}

const sizeOf = (path) => { try { const s = statSync(path); return `${s.size}:${s.mtimeMs}`; } catch { return null; } };
const nap = (s) => new Promise((done) => setTimeout(done, s * 1000));

// [0, ''] when there is nothing to do or activity was seen; [2, words] after silence for waitS.
export async function watch(event, waitS, lookS, sleep = nap) {
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
  let words = WAKE(waitS / 60, proposes(msg) ? 'proposed or asked about a next step' : 'ended a turn');
  try { const listed = render(asks(path)); if (listed) words += `\n\n${listed}`; } catch { /* the wake still goes */ }
  return [2, words];
}

async function selftest() {
  let bad = 0;
  const expect = (name, got, want) => { if (got !== want) { bad += 1; console.error(`FAIL  ${name}: exit ${got}`); } };
  const d = mkdtempSync(join(tmpdir(), 'idle-wake-'));
  const t = join(d, 't.jsonl');
  writeFileSync(t, '{}\n');
  const ev = (m) => ({ hook_event_name: 'Stop', transcript_path: t, last_assistant_message: m });
  const still = async () => {};
  expect("silence after 'Next I'd build P4'", (await watch(ev("Done. Next I'd build P4 PAD SETUP."), 3, 1, still))[0], 2);
  expect("silence after 'Shall I start the bank?'", (await watch(ev('All green. Shall I start the bank?'), 3, 1, still))[0], 2);
  expect("silence after 'My recommendation'", (await watch(ev('My recommendation: the cache first.'), 3, 1, still))[0], 2);
  expect('Tim types during the wait', (await watch(ev("Next I'd build P4."), 3, 1, async () => appendFileSync(t, '{"type":"user"}\n')))[0], 0);
  expect('silence after a plain report (every turn arms)', (await watch(ev('K10 is landed as fb67cbb3. 46 of 46 green.'), 3, 1, still))[0], 2);
  expect('a turn ending NOTHING OPEN', (await watch(ev('All asks done and proved. NOTHING OPEN'), 3, 1, still))[0], 0);
  expect('another hook event', (await watch({ hook_event_name: 'PostToolUse', transcript_path: t, last_assistant_message: 'Shall I?' }, 3, 1, still))[0], 0);
  if (!proposes('Shall I go on?') || proposes('Landed.')) { bad += 1; console.error('FAIL  proposes'); }
  rmSync(d, { recursive: true, force: true });
  console.log(`idle-wake selftest: ${bad ? `${bad} wrong` : 'OK'}`);
  return bad ? 1 : 0;
}

async function main() {
  if (process.argv.includes('--selftest')) return selftest();
  let event;
  try { event = JSON.parse(readFileSync(0, 'utf8')); } catch { return 0; }
  const [code, words] = await watch(event, WAIT_MIN * 60, LOOK_S);
  if (code === 2) process.stderr.write(`${words}\n`);
  return code;
}

process.exit(await main());
