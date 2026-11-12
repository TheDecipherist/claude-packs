// resident/warm: a worker thread that builds the project's repetition indexes once, when the daemon starts (budgets: template-law's
// first Write after a start took 1,516 ms because its index was built on that call). Both builders keep their result in the system's
// temp folder (lib/repo-index.mts, lib/dup-index.mts), so the main thread's first query reads what this wrote and no event waits on
// a build. Its failure is not the daemon's: the main thread builds the index itself on the first query, as it always did.
import { parentPort, workerData } from 'node:worker_threads';
import { loadIndex } from '../lib/dup-index.mts';
import { repoIndex } from '../lib/repo-index.mts';
import { readShape } from '../lib/shape.mts';
import type { Layout } from '../lib/types.d.mts';

export interface WarmData { root: string; layout: Layout }

const { root, layout } = workerData as WarmData;
repoIndex(root, [], layout);
loadIndex(root, { layout, shape: readShape(root) });
parentPort?.postMessage('warm');
