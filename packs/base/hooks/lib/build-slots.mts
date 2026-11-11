// The machine-wide build queue's slots (the buildq tool, where a pack ships it): a slot is a folder made atomically, holding its
// owner's pid. buildq takes and frees them; the status check reads them (1.8.0), so an agent whose build waits for a slot
// shows as waiting its turn, never as stuck. One layout, here, for both.
//   BUILDQ_DIR: where the slots live (default: the machine's temp folder). BUILDQ_SLOTS: how many (default 2).
// The environment is the caller's to pass (buildSlots), never read here.
import { readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Where the slots live and how many there are. */
export interface BuildSlots { dir: string; slots: number }

export function buildSlots(env: Readonly<Record<string, string | undefined>>, tmp: string = tmpdir()): BuildSlots {
  return { dir: env.BUILDQ_DIR ?? join(tmp, 'claude-packs-buildq'), slots: Number(env.BUILDQ_SLOTS ?? 2) };
}

export const slotAt = (dir: string, n: number): string => join(dir, `slot-${n}`);

export function ownerOf(slot: string): number | null {
  try { return Number(readFileSync(join(slot, 'pid'), 'utf8')); } catch { return null; }
}

export function isLive(slot: string): boolean {
  const pid = ownerOf(slot);
  if (pid === null) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM'; // another user's job holds it
  }
}

/** The pids that hold a slot now: a buildq job not among them is waiting for one. */
export function slotOwners(dir: string): Set<number> {
  try {
    const owners = readdirSync(dir).filter((n) => n.startsWith('slot-')).map((n) => ownerOf(join(dir, n)));
    return new Set(owners.filter((p): p is number => p !== null));
  } catch { return new Set(); }
}
