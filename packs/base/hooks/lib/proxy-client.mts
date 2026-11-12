// proxy-client: the client side of proxy-wire in TypeScript, for the selftests' fake clients and the TypeScript fallback: ask a daemon
// over its socket, and start one behind the event the way the Go proxy does (review-2-go 1.2, 1.3, 3.2, 3.7): the daemon detached
// (its own session), in `/`, with an environment cut to HOME, PATH and the cache folder, and a pipe it says `ready` on, so a
// client never retries in a loop.
import { spawn } from 'node:child_process';
import { connect } from 'node:net';
import { FrameGather } from './frame-gather.mts';
import { MAX_STDIN, crashReply, decodeReply, encodeRequest, keepEnv, type Reply, type WireRequest } from './proxy-wire.mts';
import { WIRE } from './proxy-wire-table.mts';

/** What asking a daemon came to: its whole reply, a reply that was cut or was not a record (a crash), or no daemon to ask. */
export type Answer = { kind: 'reply'; reply: Reply } | { kind: 'cut'; reply: Reply } | { kind: 'none'; why: string };

/** One request over `socket`: the reply it gets whole, else a crash. `waitMs` bounds the wait (the request's deadline, by default). */
export function askDaemon(socket: string, request: WireRequest, stdin: string | Uint8Array, waitMs = request.deadline - Date.now() + 500): Promise<Answer> {
  return new Promise((done) => {
    const conn = connect(socket);
    const gather = new FrameGather(1, MAX_STDIN);   // a reply is capped at the same 64 MB
    let settled = false;
    const finish = (answer: Answer): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      conn.destroy();
      done(answer);
    };
    const timer = setTimeout(() => finish({ kind: 'cut', reply: crashReply('no reply by the deadline') }), Math.max(waitMs, 1));
    conn.on('connect', () => conn.write(encodeRequest(request, stdin)));
    conn.on('data', (chunk: Buffer) => {
      const bytes = gather.push(chunk);
      if (bytes === null) return;
      const got = decodeReply(bytes);
      if (got.kind === 'whole') finish({ kind: 'reply', reply: got.value });
      else if (got.kind === 'bad' || got.kind === 'too-big') finish({ kind: 'cut', reply: crashReply(got.kind === 'bad' ? got.why : 'a reply too large') });
    });
    conn.on('close', () => finish({ kind: 'cut', reply: crashReply(`closed after ${gather.length} bytes`) }));
    conn.on('error', (e: NodeJS.ErrnoException) => finish(gather.length === 0 && e.syscall === 'connect' ? { kind: 'none', why: e.code ?? e.message } : { kind: 'cut', reply: crashReply(e.message) }));
  });
}

/** What starting a daemon came to: it is up (`ready`), another one won the start lock (`busy`), or it did not say (`failed`). */
export type Started = { kind: 'ready'; pid: number } | { kind: 'busy' } | { kind: 'failed'; why: string };

export interface StartOptions {
  /** The node to run, and the daemon's script (resident.mjs); `args` follow it (`--serve <project>`, ...). */
  node: string;
  script: string;
  args: readonly string[];
  /** The caller's environment: HOME, PATH and CLAUDE_PACKS_CACHE are all the daemon gets of it. */
  env: Readonly<Record<string, string | undefined>>;
  waitMs?: number;
}

/** Starts a daemon and waits for its word on the ready pipe (fd 3): `ready <pid>`, or `busy` when another daemon holds the start lock. */
export function startDaemon({ node, script, args, env, waitMs = 10_000 }: StartOptions): Promise<Started> {
  return new Promise((done) => {
    const child = spawn(node, [script, ...args, WIRE.flag.readyFd, String(WIRE.readyFd)], { detached: true, cwd: '/', env: keepEnv(env, WIRE.daemonKeeps), stdio: ['ignore', 'ignore', 'ignore', 'pipe'] });
    const pipe = child.stdio[3];
    let said = '';
    let settled = false;
    const finish = (result: Started): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      pipe?.destroy();
      child.unref();
      done(result);
    };
    const timer = setTimeout(() => finish({ kind: 'failed', why: 'no word on the ready pipe in time' }), waitMs);
    // the pipe is read to its end, as the Go client reads it: a daemon that says `busy` and exits at once has exited before the pipe's
    // data is delivered, and its exit alone says nothing (W10b finding 12)
    let exited: number | null | undefined;
    const word = (): Started => {
      const ready = /^ready (\d+)\n/.exec(said);
      if (ready) return { kind: 'ready', pid: Number(ready[1]) };
      if (said.startsWith('busy\n')) return { kind: 'busy' };
      if (said.startsWith('failed ')) return { kind: 'failed', why: said.slice('failed '.length).trim() };
      if (said.startsWith('refused ')) return { kind: 'failed', why: said.trim() };
      return { kind: 'failed', why: exited === undefined ? 'the ready pipe closed with no word' : `exited ${exited} before it was ready` };
    };
    child.on('error', (e) => finish({ kind: 'failed', why: e.message }));
    child.on('exit', (code) => { exited = code; });
    pipe?.on('data', (d: Buffer) => {
      said += d.toString();
      if (/^ready (\d+)\n/.test(said) || said.startsWith('busy\n')) finish(word());
    });
    pipe?.on('close', () => finish(word()));
  });
}
