// rules-held: the rules a session holds now, for rules-reach-the-shell, read from the project's rule log as it grows (only the
// bytes added since the last call are read). A compaction drops what path loads gave, so a `compact` load that follows any other
// line starts the session's set again (KWB-228). The rules it was given before its last compaction are kept apart: given again,
// such a rule needs only its law, not its whole file (KWB-231: the whole file again cost +318 % on a session of 7 compactions).
import { closeSync, openSync, readSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseJson } from './json.mts';
import { RULES } from './usage-log.mts';

/** What a session holds now, and every rule it has been given in an earlier stretch between compactions. */
export interface Held { rules: Set<string>; before: Set<string>; offset: number; lastWhy: string }
const heldBySession = new Map<string, Held>();

const empty = (): Held => ({ rules: new Set(), before: new Set(), offset: 0, lastWhy: '' });

/** One log line read into the session's state. */
function take(held: Held, e: { rule?: string; why?: string }): void {
  if (!e.rule) return;
  if (e.why === 'compact' && held.lastWhy !== 'compact') {
    for (const r of held.rules) held.before.add(r);
    held.rules = new Set();
  }
  held.lastWhy = e.why ?? '';
  held.rules.add(e.rule);
}

/** The rules this session holds since its last compaction, and those it held before it; `key` names project and session. */
export function heldNow(projectDir: string, session: string | undefined, key: string): Held {
  if (!session) return empty();
  const path = join(projectDir, RULES);
  let size = 0;
  try { size = statSync(path).size; } catch { /* no log yet */ }
  let held = heldBySession.get(key);
  if (!held || size < held.offset) held = empty();
  if (size > held.offset) {
    const buf = Buffer.alloc(size - held.offset);
    const fd = openSync(path, 'r');
    try { readSync(fd, buf, 0, buf.length, held.offset); } finally { closeSync(fd); }
    const whole = buf.subarray(0, buf.lastIndexOf(0x0a) + 1);
    for (const l of whole.toString('utf8').split('\n')) {
      const e = parseJson<{ session?: string; rule?: string; why?: string }>(l);
      if (e?.session === session) take(held, e);
    }
    held.offset += whole.length;
  }
  heldBySession.set(key, held);
  return held;
}

/** A rule's law alone: its `<constraints>` blocks, or the whole body when it has none. */
export function lawOf(body: string): string {
  const blocks = body.match(/<constraints>[\s\S]*?<\/constraints>/g);
  return blocks ? blocks.join('\n\n') : body;
}
