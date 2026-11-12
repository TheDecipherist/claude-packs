// Fuzzing of lib/proxy-wire.mts and the daemon's socket (typescript order W10b item 3): truncated frames, a length over the cap, bad
// JSON, a zero length and a megabyte of garbage, mutated from a seeded generator. The short run is part of the suite; the long run is
// `FUZZ_SECONDS=600` before the usual one-file test command (FUZZ_SEED picks the seed,
// FUZZ_OUT a file for the numbers). Nothing may throw or hang, a request is whole or refused, and no connection gets exit 0 unjudged.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { connect } from 'node:net';
import { join } from 'node:path';
import { test } from 'node:test';
import { scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { MAX_STDIN, PROTOCOL, crashReply, decodeReply, decodeRequest, encodeReply, encodeRequest, type WireRequest } from '../../../packs/base/hooks/lib/proxy-wire.mts';
import { listen } from '../../../packs/base/hooks/resident/socket.mts';

const SECONDS = Number(process.env.FUZZ_SECONDS ?? 0);
const SEED = Number(process.env.FUZZ_SEED ?? 20261112);
const request: WireRequest = { v: PROTOCOL, env: { A: 'é' }, cwd: '/p', ppid: 1, deadline: 0 };

/** xorshift32: the same seed, the same inputs. */
function rng(seed: number): () => number {
  let x = seed | 0 || 1;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 2 ** 32; };
}
type Rand = () => number;
const below = (r: Rand, n: number): number => Math.floor(r() * n);
const bytes = (r: Rand, n: number): Buffer => Buffer.from(Array.from({ length: n }, () => below(r, 256)));
const u32 = (n: number): Buffer => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; };
const LENGTHS = [0, 1, 2, 3, 4, 1024 * 1024, 1024 * 1024 + 1, MAX_STDIN, MAX_STDIN + 1, 0x7fffffff, 0x80000000, 0xffffffff];

/** The seeds the order names. */
function seeds(r: Rand): Buffer[] {
  const whole = encodeRequest(request, '{"hook_event_name":"Stop"}');
  const framed = (body: string | Buffer): Buffer => Buffer.concat([u32(Buffer.byteLength(body)), Buffer.from(body)]);
  return [
    whole, whole.subarray(0, 3), whole.subarray(0, whole.length - 2), Buffer.alloc(0), Buffer.alloc(4),
    ...LENGTHS.map(u32), framed('{"v":1'), framed('[]'), framed('null'), framed('{"v":1}'), framed(''),
    Buffer.concat([framed(JSON.stringify(request)), u32(MAX_STDIN + 1)]), Buffer.concat([framed(JSON.stringify(request)), Buffer.alloc(4)]),
    bytes(r, 1024 * 1024), framed(bytes(r, 1024 * 1024)),
  ];
}

/** One mutation of an input: flipped bytes, a cut, a spliced length, a stretch of garbage, or a copy of itself. */
function mutate(r: Rand, input: Buffer): Buffer {
  const b = Buffer.from(input);
  switch (below(r, 6)) {
    case 0: for (let i = 0, n = 1 + below(r, 8); i < n && b.length > 0; i += 1) b[below(r, b.length)] = below(r, 256); return b;
    case 1: return b.subarray(0, below(r, b.length + 1));
    case 2: return Buffer.concat([u32(LENGTHS[below(r, LENGTHS.length)] ?? 0), b.subarray(below(r, b.length + 1))]);
    case 3: return Buffer.concat([b, bytes(r, below(r, 4096))]);
    case 4: return Buffer.concat([b, b]);
    default: { const at = below(r, b.length + 1); return Buffer.concat([b.subarray(0, at), u32(LENGTHS[below(r, LENGTHS.length)] ?? 0), b.subarray(at)]); }
  }
}

const KINDS = ['need', 'whole', 'too-big', 'bad'];
const slowest = { ms: 0 };
/** Decoding one input: it throws never, answers one of four kinds, and takes a whole record only as far as its bytes go. */
function decodeAll(input: Buffer): void {
  const started = performance.now();
  const req = decodeRequest(input);
  const rep = decodeReply(input);
  slowest.ms = Math.max(slowest.ms, performance.now() - started);
  assert.ok(KINDS.includes(req.kind) && KINDS.includes(rep.kind));
  if (req.kind === 'whole') {
    assert.ok(req.used >= 8 && req.used <= input.length, `used ${req.used} of ${input.length}`);
    assert.equal(typeof req.value.request.cwd, 'string');
    assert.equal(decodeRequest(input.subarray(0, req.used)).kind, 'whole');
    assert.notEqual(decodeRequest(input.subarray(0, req.used - 1)).kind, 'whole');
  }
  if (rep.kind === 'whole') {
    assert.ok(rep.used >= 4 && rep.used <= input.length);
    assert.ok(Number.isInteger(rep.value.code) && typeof rep.value.stdout === 'string' && typeof rep.value.stderr === 'string');
  } else {
    // what a client makes of a reply that is not whole: a crash, judged by the TypeScript runner, never exit 0
    const crash = crashReply(rep.kind);
    assert.ok(crash.code !== 0 && crash.fallback === 'ts');
  }
}

/** Asks a live socket: the bytes sent, then the client's end; the reply bytes the daemon sent, or '' for a hang-up with none. */
function exchange(socket: string, input: Buffer, limitMs: number): Promise<Buffer> {
  return new Promise((done, fail) => {
    const conn = connect(socket);
    const chunks: Buffer[] = [];
    const timer = setTimeout(() => { conn.destroy(); fail(new Error(`no answer or hang-up in ${limitMs} ms for ${input.length} bytes`)); }, limitMs);
    conn.on('data', (d: Buffer) => chunks.push(d));
    conn.on('error', () => undefined);
    conn.on('close', () => { clearTimeout(timer); done(Buffer.concat(chunks)); });
    conn.on('connect', () => conn.end(input));
  });
}

test('the wire parser under mutated frames: no throw, no hang, a record is whole or refused', () => {
  const r = rng(SEED);
  const pool = seeds(r);
  const stop = Date.now() + SECONDS * 1000;
  let runs = 0;
  const once = (): void => { decodeAll(mutate(r, pool[below(r, pool.length)] ?? Buffer.alloc(0))); runs += 1; };
  for (const s of pool) { decodeAll(s); runs += 1; }
  if (SECONDS > 0) while (Date.now() < stop) once();
  else for (let i = 0; i < 500; i += 1) once();
  assert.ok(slowest.ms < 2000, `one input took ${slowest.ms} ms`);
  if (process.env.FUZZ_OUT) writeFileSync(process.env.FUZZ_OUT, JSON.stringify({ target: 'proxy-wire', seed: SEED, runs, slowestMs: Math.round(slowest.ms), crashes: 0, hangs: 0 }) + '\n');
});

test('the daemon\'s socket under the same bytes: answered by a refusal or the TypeScript path, hung up on, never exit 0 unjudged', async () => {
  const dir = scratchDir('wire-fuzz');
  const socket = join(dir, 's.sock');
  const taken: WireRequest[] = [];
  // a hook that judges: its answer is exit 2, so exit 0 may come only with `fallback: 'ts'`
  const server = await listen(socket, (i) => { taken.push(i.request); i.reply({ code: 2, stdout: '', stderr: 'judged', }); }, () => undefined);
  try {
    const r = rng(SEED + 1);
    const pool = seeds(r);
    const stop = Date.now() + SECONDS * 1000;
    let runs = 0;
    let answered = 0;
    const target = SECONDS > 0 ? Infinity : 150;
    while (runs < target && (SECONDS === 0 || Date.now() < stop)) {
      const input = runs < pool.length ? pool[runs] ?? Buffer.alloc(0) : mutate(r, pool[below(r, pool.length)] ?? Buffer.alloc(0));
      const out = await exchange(socket, input, 5000);
      runs += 1;
      if (out.length === 0) continue;
      answered += 1;
      const got = decodeReply(out);
      assert.equal(got.kind, 'whole', `a reply that is not whole for ${input.length} bytes`);
      if (got.kind === 'whole') assert.ok(got.value.code !== 0 || got.value.fallback === 'ts', `exit 0 unjudged for ${input.length} bytes`);
      assert.deepEqual(out, encodeReply(got.kind === 'whole' ? got.value : crashReply('x')));
    }
    assert.ok(answered > 0 && taken.length > 0, 'the whole seed is taken');
    if (process.env.FUZZ_OUT_SOCKET) writeFileSync(process.env.FUZZ_OUT_SOCKET, JSON.stringify({ target: 'socket', seed: SEED + 1, runs, answered, crashes: 0, hangs: 0 }) + '\n');
  } finally { await server.close(); }
});
