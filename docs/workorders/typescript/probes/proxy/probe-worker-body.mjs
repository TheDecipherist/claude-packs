// One worker: imports the hooks it is given and says how long that took.
import { parentPort, workerData } from 'node:worker_threads';
const t = performance.now();
let failed = [];
if (workerData.load) for (const f of workerData.files) { try { await import(f); } catch (e) { failed.push(`${f.split('/').pop()}: ${e.code ?? e.message}`); } }
let chdir = 'ok'; try { process.chdir('/tmp'); } catch (e) { chdir = e.code; }
parentPort.postMessage({ ms: performance.now() - t, failed, chdir, envCopy: process.env.PROBE_X });
