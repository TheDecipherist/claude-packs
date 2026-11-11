// resident/state: the daemon's pid file, the one file `claude-packs daemon status|stop` and run-discovery read (review-2-go 3.8, 3.10).
// It is written by the main thread only, by rename (writeJson), at start, at most every two seconds while events are served, and at
// stop. `events` counts the hook events served (status-line asks are not events).
import { rmSync } from 'node:fs';
import { readJson, writeJson } from '../lib/json.mts';

export interface DaemonState {
  pid: number;
  key: string;
  project: string;
  /** The hooks folder it serves, and the node it runs on. */
  hooks: string;
  node: string;
  /** The lock's hash, as the key was made: what `doctor` compares with the project's own lock. */
  lockHash: string;
  started: number;
  /** Last event served, ms since the epoch (0 before the first): the idle clock. */
  lastEvent: number;
  events: number;
  workers: number;
  rss: number;
  /** The main thread's V8 heap in use: what separates a leak from memory the allocator keeps. */
  heap: number;
}

export interface StateFile {
  /** The state as it is now; writes the file when it is `everyMs` old (two seconds) or `force`d. */
  save: (now: DaemonState, force?: boolean) => void;
  remove: () => void;
}

export const STATE_EVERY_MS = 2000;

export function stateFile(file: string, everyMs = STATE_EVERY_MS): StateFile {
  let last = 0;
  return {
    save: (now, force = false) => {
      if (!force && Date.now() - last < everyMs) return;
      last = Date.now();
      writeJson(file, now);
    },
    remove: () => { rmSync(file, { force: true }); },
  };
}

const isState = (v: unknown): v is DaemonState => typeof v === 'object' && v !== null && typeof (v as DaemonState).pid === 'number' && typeof (v as DaemonState).key === 'string';

/** The pid file at `file`, or null when there is none or it is not one. */
export function readState(file: string): DaemonState | null {
  const state = readJson<unknown>(file);
  return isState(state) ? state : null;
}
