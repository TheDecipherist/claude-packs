// The machine-wide build queue's slots (buildq, synth-creator's tool): a slot is a folder made atomically, holding its
// owner's pid. buildq takes and frees them; the status check reads them (1.8.0), so an agent whose build waits for a slot
// shows as waiting its turn, never as stuck. One layout, here, for both.
//   BUILDQ_DIR: where the slots live (default: the machine's temp folder). BUILDQ_SLOTS: how many (default 2).
import { readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const DIR = process.env.BUILDQ_DIR ?? join(tmpdir(), 'claude-packs-buildq');
export const SLOTS = Number(process.env.BUILDQ_SLOTS ?? 2);
export const slotAt = (n) => join(DIR, `slot-${n}`);

export function ownerOf(slot) {
  try { return Number(readFileSync(join(slot, 'pid'), 'utf8')); } catch { return null; }
}

export function isLive(slot) {
  const pid = ownerOf(slot);
  if (pid === null) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM'; // another user's job holds it
  }
}

/** The pids that hold a slot now: a buildq job not among them is waiting for one. */
export function slotOwners(dir = DIR) {
  try { return new Set(readdirSync(dir).filter((n) => n.startsWith('slot-')).map((n) => ownerOf(join(dir, n))).filter((p) => p !== null)); } catch { return new Set(); }
}
