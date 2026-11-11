// resident/socket: the daemon's folder and its socket (review-2-go 3.2, 3.11, 4.1). The folder is made at mode 700 and the daemon
// refuses to start in one that is not the user's at that mode (the file mode of a socket is not a guard on every system); the socket
// is unlinked only after a connect to it failed; a connection is one request and one reply.
import { lstatSync, mkdirSync, rmSync } from 'node:fs';
import { connect, createServer, type Server, type Socket } from 'node:net';
import { crashReply, decodeRequest, encodeReply, type Reply, type WireRequest } from '../lib/proxy-wire.mts';

/** Makes the folder (mode 700) when it is not there; the reason the daemon must not use it when it is not the user's at mode 700. */
export function prepareFolder(folder: string, uid: number): string | null {
  try {
    mkdirSync(folder, { recursive: true, mode: 0o700 });
    const st = lstatSync(folder);
    if (!st.isDirectory()) return `${folder} is not a folder`;
    if (st.uid !== uid) return `${folder} is not owned by this user`;
    const mode = st.mode & 0o777;
    return mode === 0o700 ? null : `${folder} is mode ${mode.toString(8)}, not 700: another user could reach the socket`;
  } catch (e) { return `${folder}: ${e instanceof Error ? e.message : String(e)}`; }
}

/** Whether something answers on the socket: a connect that is not refused. */
export const answers = (socket: string): Promise<boolean> => new Promise((done) => {
  const c = connect(socket);
  c.on('connect', () => { c.destroy(); done(true); });
  c.on('error', () => done(false));
});

/** One request taken off a connection: what the client sent, when the first byte arrived, and how to answer it. */
export interface Incoming { request: WireRequest; stdin: Buffer; arrival: number; reply: (reply: Reply) => void }
export interface Listening { server: Server; close: () => Promise<void> }

/** Listens on `socket` (the caller has made sure nothing answers there; a dead file left by a crash is removed first). */
export function listen(socket: string, onRequest: (incoming: Incoming) => void, log: (line: string) => void): Promise<Listening> {
  rmSync(socket, { force: true });
  const open = new Set<Socket>();
  const server = createServer((c) => {
    open.add(c);
    c.on('close', () => open.delete(c));
    const parts: Buffer[] = [];
    let arrival = 0;
    let taken = false;
    const answer = (reply: Reply): void => { if (!c.destroyed) c.end(encodeReply(reply)); };
    c.on('error', () => undefined);
    c.on('data', (d: Buffer) => {
      if (taken) return;
      if (parts.length === 0) arrival = Date.now();
      parts.push(d);
      const got = decodeRequest(Buffer.concat(parts));
      if (got.kind === 'need') return;
      taken = true;
      if (got.kind === 'whole') onRequest({ request: got.value.request, stdin: got.value.stdin, arrival, reply: answer });
      else {
        log(`a request was refused: ${got.kind === 'bad' ? got.why : `stdin of ${got.size} bytes`}`);
        answer(got.kind === 'bad' ? crashReply(got.why) : { code: 0, stdout: '', stderr: '', fallback: 'ts' });
      }
    });
  });
  return new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(socket, () => ok({ server, close: () => new Promise<void>((done) => { server.close(() => done()); for (const c of open) c.destroy(); }) }));
  });
}
