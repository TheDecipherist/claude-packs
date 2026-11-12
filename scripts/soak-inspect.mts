// The soak's reach into a running daemon (typescript order W10b item 1): node's own inspector, opened by SIGUSR1 on the pid, so the daemon
// carries no probe code. It reads the V8 heap in use after a forced collection, takes a heap snapshot to a file, and ends one worker thread
// (the NodeWorker domain evaluates `process.exit` inside it). Never shipped: a development tool of the kit.
import { createWriteStream, readFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseJson } from '../packs/base/hooks/lib/json.mts';

const PORT = 9229;
const ATTACH_TRIES = 40;
const ATTACH_WAIT_MS = 100;
const CALL_TIMEOUT_MS = 30_000;
const FETCH_TIMEOUT_MS = 2000;

interface Reply { id?: number; result?: unknown; error?: { message: string }; method?: string; params?: Record<string, unknown> }
type Listener = (params: Record<string, unknown>) => void;

export interface Inspector {
  call: (method: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;
  on: (method: string, listener: Listener) => void;
  close: () => void;
}

/** Whether something already listens on the inspector's default port (then another process owns it and SIGUSR1 could not open ours). */
export async function portBusy(): Promise<boolean> {
  try { await fetch(`http://127.0.0.1:${PORT}/json/version`, { signal: AbortSignal.timeout(500) }); return true; } catch { return false; }
}

/** Opens the inspector of process `pid` (SIGUSR1) and connects to it; throws when the port is taken or nothing answers. */
export async function attach(pid: number): Promise<Inspector> {
  if (await portBusy()) throw new Error(`port ${PORT} is already in use: no inspector for ${pid}`);
  process.kill(pid, 'SIGUSR1');
  let url = '';
  for (let i = 0; i < ATTACH_TRIES && url === ''; i += 1) {
    await sleep(ATTACH_WAIT_MS);
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })).json() as { webSocketDebuggerUrl?: string }[];
      url = list[0]?.webSocketDebuggerUrl ?? '';
    } catch { /* not listening yet */ }
  }
  if (url === '') throw new Error(`no inspector answered for ${pid}`);
  const ws = new WebSocket(url);
  await new Promise<void>((done, fail) => {
    ws.onopen = (): void => done();
    ws.onerror = (): void => fail(new Error('inspector socket failed'));
    setTimeout(() => fail(new Error('inspector socket did not open')), CALL_TIMEOUT_MS).unref();
  });
  const waiting = new Map<number, { ok: (r: Record<string, unknown>) => void; fail: (e: Error) => void }>();
  const listeners = new Map<string, Listener[]>();
  let next = 0;
  ws.onmessage = (m): void => {
    const r = parseJson<Reply>(String(m.data));
    if (r === null) return;
    if (r.id !== undefined) {
      const w = waiting.get(r.id);
      waiting.delete(r.id);
      if (r.error !== undefined) w?.fail(new Error(r.error.message)); else w?.ok((r.result ?? {}) as Record<string, unknown>);   // the protocol's result is an object
    } else if (r.method !== undefined) for (const l of listeners.get(r.method) ?? []) l(r.params ?? {});
  };
  return {
    call: (method, params = {}) => new Promise((ok, fail) => {
      next += 1;
      waiting.set(next, { ok, fail });
      setTimeout(() => fail(new Error(`${method} timed out`)), CALL_TIMEOUT_MS).unref();
      ws.send(JSON.stringify({ id: next, method, params }));
    }),
    on: (method, listener) => { listeners.set(method, [...(listeners.get(method) ?? []), listener]); },
    close: () => ws.close(),
  };
}

/** V8 heap in use (bytes) after a forced collection. */
export async function forcedHeap(i: Inspector): Promise<number> {
  await i.call('HeapProfiler.collectGarbage');
  return Number((await i.call('Runtime.getHeapUsage'))['usedSize']);
}

/** A heap snapshot written to `file`. */
export async function takeSnapshot(i: Inspector, file: string): Promise<void> {
  const out = createWriteStream(file);
  i.on('HeapProfiler.addHeapSnapshotChunk', (p) => { out.write(String(p['chunk'])); });
  await i.call('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
  await new Promise<void>((done) => out.end(done));
}

/** Ends one worker thread of the daemon (its `process.exit` runs inside the worker); false when it has no worker to end. */
export async function killWorker(i: Inspector): Promise<boolean> {
  let session = '';
  i.on('NodeWorker.attachedToWorker', (p) => { if (session === '') session = String(p['sessionId']); });
  await i.call('NodeWorker.enable', { waitForDebuggerOnStart: false });
  await sleep(500);
  if (session === '') return false;
  const message = JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: 'process.exit(1)' } });
  await i.call('NodeWorker.sendMessageToWorker', { sessionId: session, message });
  await i.call('NodeWorker.disable');
  return true;
}

export interface Group { count: number; size: number }

/** The constructors of a heap snapshot file: instances and self size per name (strings, arrays and the engine's own are grouped). */
export function constructorsOf(file: string): Map<string, Group> {
  const snap = JSON.parse(readFileSync(file, 'utf8')) as { snapshot: { meta: { node_fields: string[]; node_types: [string[]] } }; nodes: number[]; strings: string[] };
  const fields = snap.snapshot.meta.node_fields;
  const [typeAt, nameAt, sizeAt] = [fields.indexOf('type'), fields.indexOf('name'), fields.indexOf('self_size')];
  const types = snap.snapshot.meta.node_types[0];
  const grouped = new Set(['string', 'concatenated string', 'sliced string', 'array', 'hidden', 'code', 'number', 'synthetic', 'symbol', 'bigint']);
  const out = new Map<string, Group>();
  for (let i = 0; i < snap.nodes.length; i += fields.length) {
    const type = types[snap.nodes[i + typeAt] ?? 0] ?? '?';
    const key = grouped.has(type) ? `(${type})` : `${type === 'closure' ? 'closure ' : ''}${snap.strings[snap.nodes[i + nameAt] ?? 0] ?? '?'}`;
    const g = out.get(key) ?? { count: 0, size: 0 };
    g.count += 1;
    g.size += snap.nodes[i + sizeAt] ?? 0;
    out.set(key, g);
  }
  return out;
}

/** The `top` constructors whose total size grew most from `before` to `after`. */
export function growth(before: Map<string, Group>, after: Map<string, Group>, top = 10): { name: string; count: number; dCount: number; dSize: number }[] {
  return [...after].map(([name, g]) => ({ name, count: g.count, dCount: g.count - (before.get(name)?.count ?? 0), dSize: g.size - (before.get(name)?.size ?? 0) }))
    .sort((a, b) => b.dSize - a.dSize).slice(0, top);
}
