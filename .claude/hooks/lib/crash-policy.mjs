// crash-policy: what a call does when a hook crashed on it (KF-18). Only exit 2 blocks, so a crash used to let the call through in
// silence, and doctor said so hours later. Now a crash on a tool call refuses that call once and says why, at the time; the same call
// again goes through, logged, because a broken hook must never stop the write that fixes it (its own bad config, say). An event with
// nothing to refuse (Stop, a prompt) is told with a systemMessage. A crash is never a verdict on the work, and has its own log.
//   crashVerdict(root, ev, judged) -> { code?, stderr?, stdout? }   judged: the runner's [{ hook, code, reason }]
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const HELD = join('.claude', 'state', 'crash-held.json');
const HOLD_MS = 60 * 60 * 1000;
const ANSWERS = new Set([0, 2]);
const TOOL_EVENTS = new Set(['PreToolUse', 'PostToolUse', undefined]);

const firstLine = (reason) => (reason ?? '').split('\n')[0].replace(/^run-hooks: \S+ failed: /, '') || 'no message';
const say = (c) => `${c.hook} crashed, so this call was not judged by it: ${firstLine(c.reason)}`;
const keyOf = (ev, hook) => createHash('sha1').update(JSON.stringify([hook, ev.hook_event_name, ev.tool_name, ev.tool_input])).digest('hex').slice(0, 16);
const notice = (message) => JSON.stringify({ systemMessage: message });

function readHeld(root) {
  try { return JSON.parse(readFileSync(join(root, HELD), 'utf8')); } catch { return {}; } // not a refusal: no list yet
}

// Records the keys; false when they cannot be kept, since a call refused with no memory of it could never go through.
function hold(root, held, keys) {
  if (!existsSync(join(root, '.claude'))) return false;
  const now = Date.now();
  const kept = Object.fromEntries(Object.entries(held).filter(([, t]) => now - t < HOLD_MS));
  for (const k of keys) kept[k] = now;
  mkdirSync(join(root, '.claude', 'state'), { recursive: true });
  writeFileSync(join(root, HELD), JSON.stringify(kept));
  return true;
}

export function crashVerdict(root, ev, judged) {
  const crashed = judged.filter((h) => !ANSWERS.has(h.code));
  if (!crashed.length) return {};
  const said = crashed.map(say).join('\n');
  const after = `Clear it once fixed: \`logs clear ${crashed[0].hook} fixed|superseded "<why>"\`.`;
  if (!ev.tool_name || !TOOL_EVENTS.has(ev.hook_event_name)) return { stdout: notice(`${said}\n${after}`) };
  const held = readHeld(root);
  const keys = crashed.map((c) => keyOf(ev, c.hook));
  if (keys.every((k) => held[k])) return { stdout: notice(`${said}\nThe call went through unjudged, and the crash is logged (\`logs crashes\`). ${after}`) };
  if (!hold(root, held, keys)) return { stdout: notice(said) };
  const ran = ev.hook_event_name === 'PostToolUse' ? 'The call has already run.' : 'The call has not run.';
  return { code: 2, stderr: `${said}\n${ran} This is a fault in the hook, not a verdict on your work. The same call again goes through unjudged, and is logged. Report the fault. ${after}\n` };
}
