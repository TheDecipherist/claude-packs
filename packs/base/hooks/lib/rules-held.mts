// rules-held: the rules a session holds, for rules-reach-the-shell, read from the project's rule log as it grows (only the bytes
// added since the last call are read). A rule once given is not given again in that session, a compaction included: giving it
// again after a compaction (KWB-228's second part) cost +318 % rule tokens on a session of 7 compactions, and its law alone
// (KWB-231) +285 %, for 3 laws missed of 142 refusals that their hooks refused anyway; both backed out (KWB-232, measured by
// supernova2_monitor's tools/hook-ab.mjs, its docs/token-cost.md {#verdict-231}).
import { closeSync, openSync, readSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseJson } from './json.mts';
import { RULES } from './usage-log.mts';

/** The rules a session has been given, and how far into the log they were read. */
export interface Held { rules: Set<string>; offset: number }
const heldBySession = new Map<string, Held>();

const empty = (): Held => ({ rules: new Set(), offset: 0 });

/** The rules this session holds, whatever loaded them; `key` names project and session. */
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
      const e = parseJson<{ session?: string; rule?: string }>(l);
      if (e?.session === session && e.rule) held.rules.add(e.rule);
    }
    held.offset += whole.length;
  }
  heldBySession.set(key, held);
  return held;
}
