// proxy-client: the client side of proxy-wire in TypeScript, for the selftests' fake clients and the TypeScript fallback: ask a daemon
// over its socket, and start one behind the event the way the Go proxy does (review-2-go 1.2, 1.3, 3.2, 3.7): the daemon detached
// (its own session), in `/`, with an environment cut to HOME, PATH and the cache folder, and a pipe it says `ready` on, so a
// client never retries in a loop.
import { spawn } from 'node:child_process';
import { connect } from 'node:net';
import { FrameGather } from './frame-gather.mjs';
import { MAX_STDIN, crashReply, decodeReply, encodeRequest, keepEnv } from './proxy-wire.mjs';
import { WIRE } from './proxy-wire-table.mjs';
/** One request over `socket`: the reply it gets whole, else a crash. `waitMs` bounds the wait (the request's deadline, by default). */
export function askDaemon(socket, request, stdin, waitMs = request.deadline - Date.now() + 500) {
    return new Promise((done) => {
        const conn = connect(socket);
        const gather = new FrameGather(1, MAX_STDIN); // a reply is capped at the same 64 MB
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
            const bytes = gather.push(chunk);
            if (bytes === null)
                return;
            const got = decodeReply(bytes);
            if (got.kind === 'whole')
                finish({ kind: 'reply', reply: got.value });
            else if (got.kind === 'bad' || got.kind === 'too-big')
                finish({ kind: 'cut', reply: crashReply(got.kind === 'bad' ? got.why : 'a reply too large') });
        });
        conn.on('close', () => finish({ kind: 'cut', reply: crashReply(`closed after ${gather.length} bytes`) }));
        conn.on('error', (e) => finish(gather.length === 0 && e.syscall === 'connect' ? { kind: 'none', why: e.code ?? e.message } : { kind: 'cut', reply: crashReply(e.message) }));
    });
}
/** Starts a daemon and waits for its word on the ready pipe (fd 3): `ready <pid>`, or `busy` when another daemon holds the start lock. */
export function startDaemon({ node, script, args, env, waitMs = 10_000 }) {
    return new Promise((done) => {
        const child = spawn(node, [script, ...args, WIRE.flag.readyFd, String(WIRE.readyFd)], { detached: true, cwd: '/', env: keepEnv(env, WIRE.daemonKeeps), stdio: ['ignore', 'ignore', 'ignore', 'pipe'] });
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
        // the pipe is read to its end, as the Go client reads it: a daemon that says `busy` and exits at once has exited before the pipe's
        // data is delivered, and its exit alone says nothing (W10b finding 12)
        let exited;
        const word = () => {
            const ready = /^ready (\d+)\n/.exec(said);
            if (ready)
                return { kind: 'ready', pid: Number(ready[1]) };
            if (said.startsWith('busy\n'))
                return { kind: 'busy' };
            if (said.startsWith('failed '))
                return { kind: 'failed', why: said.slice('failed '.length).trim() };
            if (said.startsWith('refused '))
                return { kind: 'failed', why: said.trim() };
            return { kind: 'failed', why: exited === undefined ? 'the ready pipe closed with no word' : `exited ${exited} before it was ready` };
        };
        child.on('error', (e) => finish({ kind: 'failed', why: e.message }));
        child.on('exit', (code) => { exited = code; });
        pipe?.on('data', (d) => {
            said += d.toString();
            if (/^ready (\d+)\n/.test(said) || said.startsWith('busy\n'))
                finish(word());
        });
        pipe?.on('close', () => finish(word()));
    });
}
