// W1.5 probe: one worker of resident-probe.mjs. It imports the table's hooks once and runs one hook of one event at a time, so
// its own output capture is never shared with another event. Four probe hooks stand beside the real ones:
//   sleep-1700   holds the worker 1.7 s (git-guard's Stop median) on an event whose text says SLOW, then passes
//   print-json   prints {"additionalContext": ...} on stdout, as a SessionStart hook does
//   env-echo     refuses when the event's own env says the run is unattended, and says which env it read
//   index-query  asks the main thread for the candidate lines of its text, and says the round trip in ms
import { parentPort, workerData } from 'node:worker_threads';
import { parseJson } from '../../../../../packs/base/hooks/lib/json.mjs';

const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
let asked = 0;
const waiting = new Map();
const PROBES = {
  'sleep-1700': async (text) => { if (text.includes('SLOW')) await sleep(1700); return 0; },
  'print-json': () => { process.stdout.write('{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"probe context é ✓"}}\n'); return 0; },
  'env-echo': () => {
    const unattended = process.env.CLAUDE_PACKS_UNATTENDED === '1';
    process.stderr.write(`env-echo: CLAUDE_PACKS_UNATTENDED=${process.env.CLAUDE_PACKS_UNATTENDED ?? '(unset)'}\n`);
    return unattended ? 2 : 0;
  },
  'index-query': async (text) => {
    const lines = String(parseJson(text, {})?.tool_input?.content ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
    const t = performance.now();
    asked += 1;
    const id = asked;
    const hits = await new Promise((ok) => { waiting.set(id, ok); parentPort.postMessage({ type: 'index', id, lines }); });
    process.stderr.write(`index-query: ${lines.length} lines asked, ${hits} hits, ${(performance.now() - t).toFixed(2)} ms\n`);
    return 0;
  },
};
const hooks = {};
for (const name of workerData.table) {
  hooks[name] = PROBES[name] ?? (await import(`${workerData.dir}/${name}.mjs`)).hook;
}

// The hook's own writes are this event's output: one event at a time on this worker.
async function run(hook, text, env) {
  const out = [];
  const err = [];
  const [o, e] = [process.stdout.write, process.stderr.write];
  process.stdout.write = (chunk) => { out.push(String(chunk)); return true; };
  process.stderr.write = (chunk) => { err.push(String(chunk)); return true; };
  const keys = Object.keys(env);
  const before = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  Object.assign(process.env, env);
  let code = 0;
  try { code = Number(await hooks[hook](text)) || 0; } catch (error) { err.push(`${hook} crashed: ${error}\n`); code = 2; }
  for (const k of keys) { if (before[k] === undefined) delete process.env[k]; else process.env[k] = before[k]; }
  [process.stdout.write, process.stderr.write] = [o, e];
  return { hook, code, stdout: out.join(''), stderr: err.join('') };
}

parentPort.on('message', async (m) => {
  if (m.type === 'index') { waiting.get(m.id)?.(m.hits); waiting.delete(m.id); return; }
  parentPort.postMessage(await run(m.hook, m.text, m.env));
});
parentPort.postMessage({ type: 'ready' });
