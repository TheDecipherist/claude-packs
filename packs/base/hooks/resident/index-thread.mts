// resident/index-thread: the repetition indexes on a thread of their own (KWB-next). They were kept on the daemon's main thread (review-2-go
// 2.5), so a rebuild after a write (55 ms for the repo index and 30 for the duplicate index on supernova2_monitor at rest, 100 to 180 ms
// under a task's load) held every worker's reply behind it: doctor's pool verdict read 93 ms at p95. Here the index is built once, at
// start, and again after a write may have changed files; the main thread only passes messages. A worker never holds an index, as before.
import { parentPort, workerData } from 'node:worker_threads';
import { readLayout } from '../lib/layout.mts';
import { residentIndex } from './index.mts';
import type { IndexToThread } from './index.mts';

const { root, env } = workerData as { root: string; env: Readonly<Record<string, string | undefined>> };
const index = residentIndex(root, () => readLayout(root), env);
index.candidates(['build', 'dup:build']);   // both indexes built beside the daemon's start, not on the first Write
index.stale();   // and the first ask reads the files' mtimes again, as the main thread's first query did: a file written since the start counts
parentPort?.on('message', (m: IndexToThread) => {
  if (m.type === 'stale') index.stale();
  else parentPort?.postMessage({ type: 'answer', id: m.id, files: index.candidates(m.keys) });
});
