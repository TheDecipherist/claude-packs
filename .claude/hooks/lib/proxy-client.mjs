// proxy-client: the client side of proxy-wire in TypeScript, for the selftests' fake clients and the TypeScript fallback: ask a daemon
// over its socket, and start one behind the event the way the Go proxy does (review-2-go 1.2, 1.3, 3.2, 3.7): the daemon detached
// (its own session), in `/`, with an environment cut to HOME, PATH and the cache folder, and a pipe it says `ready` on, so a
// client never retries in a loop.
import { spawn } from 'node:child_process';
import { connect } from 'node:net';
import { crashReply, decodeReply, encodeRequest } from './proxy-wire.mjs';
/** One request over `socket`: the reply it gets whole, else a crash. `waitMs` bounds the wait (the request's deadline, by default). */
export function askDaemon(socket, request, stdin, waitMs = request.deadline - Date.now() + 500) {
    return new Promise((done) => {
        const conn = connect(socket);
        const chunks = [];
        let settled = false;
        const finish = (answer) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            conn.destroy();
            done(answer);
        };
        const timer = setTimeout(() => finish({ kind: 'cut', reply: crashReply('no reply by the deadline') }), Math.max(waitMs, 1));
        conn.on('connect', () => conn.write(encodeRequest(request, stdin)));
        conn.on('data', (chunk) => {
            chunks.push(chunk);
            const got = decodeReply(Buffer.concat(chunks));
            if (got.kind === 'whole')
                finish({ kind: 'reply', reply: got.value });
            else if (got.kind === 'bad' || got.kind === 'too-big')
                finish({ kind: 'cut', reply: crashReply(got.kind === 'bad' ? got.why : 'a reply too large') });
        });
        conn.on('close', () => finish({ kind: 'cut', reply: crashReply(`closed after ${Buffer.concat(chunks).length} bytes`) }));
        conn.on('error', (e) => finish(chunks.length === 0 && e.syscall === 'connect' ? { kind: 'none', why: e.code ?? e.message } : { kind: 'cut', reply: crashReply(e.message) }));
    });
}
const KEEP = ['HOME', 'PATH', 'CLAUDE_PACKS_CACHE', 'XDG_RUNTIME_DIR'];
/** Starts a daemon and waits for its word on the ready pipe (fd 3): `ready <pid>`, or `busy` when another daemon holds the start lock. */
export function startDaemon({ node, script, args, env, waitMs = 10_000 }) {
    return new Promise((done) => {
        const reduced = Object.fromEntries(KEEP.flatMap((k) => (env[k] === undefined ? [] : [[k, env[k]]])));
        const child = spawn(node, [script, ...args, '--ready-fd', '3'], { detached: true, cwd: '/', env: reduced, stdio: ['ignore', 'ignore', 'ignore', 'pipe'] });
        const pipe = child.stdio[3];
        let said = '';
        let settled = false;
        const finish = (result) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            pipe?.destroy();
            child.unref();
            done(result);
        };
        const timer = setTimeout(() => finish({ kind: 'failed', why: 'no word on the ready pipe in time' }), waitMs);
        child.on('error', (e) => finish({ kind: 'failed', why: e.message }));
        child.on('exit', (code) => finish({ kind: 'failed', why: `exited ${code} before it was ready` }));
        pipe?.on('data', (d) => {
            said += d.toString();
            const ready = /^ready (\d+)\n/.exec(said);
            if (ready)
                finish({ kind: 'ready', pid: Number(ready[1]) });
            else if (said.startsWith('busy\n'))
                finish({ kind: 'busy' });
        });
    });
}
