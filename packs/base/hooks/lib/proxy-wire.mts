// proxy-wire: the protocol between the client (the Go proxy, a selftest's fake client, the TypeScript fallback) and the resident
// runner (typescript order W8.2, d-10, review-2-go sections 1 and 3). Pure: bytes in, records out, and the names of the daemon's files.
//   request  frame(header: JSON {v, env, cwd, ppid, deadline}) then frame(stdin's bytes)        frame = [u32 n, big-endian][n bytes]
//   reply    frame(JSON {code, stdout, stderr}), with `fallback: 'ts'` when the client is to run the TypeScript runner itself
// stdout travels byte for byte (plain text too: SessionStart and UserPromptSubmit add plain stdout as context). A reply that is not
// a whole record is a crash, never exit 0. A request whose stdin is over MAX_STDIN is the TypeScript path's. `deadline` is ms since
// the epoch: the entry's timeout minus 1 s, by which the daemon answers with what it has.
import { join } from 'node:path';
import { sha256 } from './hash.mts';
import { isRecord, parseJson, toJson } from './json.mts';
import { WIRE } from './proxy-wire-table.mts';
import type { Verdict } from './types.d.mts';

export const PROTOCOL: number = WIRE.protocol;
/** A request whose stdin is longer than this is judged by the TypeScript runner, not held in the daemon's memory (review-2 1.9). */
export const MAX_STDIN: number = WIRE.maxStdin;
const MAX_HEADER: number = WIRE.maxHeader;
const MAX_REPLY: number = WIRE.maxReply;
/** macOS's sun_path is 104 bytes and Linux's 108: past this the socket lives under /tmp (review-2 3.11). */
export const MAX_SOCKET_PATH: number = WIRE.maxSocketPath;

/** `load` (W8.8): the words of `hook-proxy load ...`, answered with the governor's own answer, no event. `status`: a status-line ask (W8.4), answered with the daemon's own state; it is no event, runs no hook and leaves the idle clock alone. `render` (W8.6, `hook-proxy status`): the stdin is Claude Code's session JSON and the reply's stdout the status line, drawn from what the daemon holds. */
export interface WireRequest { v: number; env: Readonly<Record<string, string>>; cwd: string; ppid: number; deadline: number; status?: boolean; render?: boolean; load?: unknown }
/** What a reply says: a verdict, and `fallback` when the daemon declined the event (another project's, a protocol it does not speak, a
 *  request too large): the client runs the TypeScript runner on the same stdin. */
export type Reply = Verdict & { fallback?: 'ts' };

/** What reading a record off a stream so far found: more bytes needed, a whole record (and how many bytes it took), or a fault. */
export type Decoded<T> =
  | { kind: 'need' }
  | { kind: 'whole'; value: T; used: number }
  | { kind: 'too-big'; size: number }
  | { kind: 'bad'; why: string };

/** One frame: its length, then its bytes. */
const frame = (body: Uint8Array): Buffer => {
  const n = Buffer.alloc(4);
  n.writeUInt32BE(body.length);
  return Buffer.concat([n, body]);
};

/** The frame that starts at `at` in `buf`, if it is whole and no longer than `max`. */
function readFrame(buf: Buffer, at: number, max: number): Decoded<Buffer> {
  if (buf.length < at + 4) return { kind: 'need' };
  const n = buf.readUInt32BE(at);
  if (n > max) return { kind: 'too-big', size: n };
  if (buf.length < at + 4 + n) return { kind: 'need' };
  return { kind: 'whole', value: buf.subarray(at + 4, at + 4 + n), used: 4 + n };
}

export const encodeRequest = (request: WireRequest, stdin: string | Uint8Array): Buffer =>
  Buffer.concat([frame(Buffer.from(toJson(request))), frame(typeof stdin === 'string' ? Buffer.from(stdin) : stdin)]);

const isHeader = (v: unknown): v is WireRequest => isRecord(v) && typeof v.v === 'number' && isRecord(v.env) && typeof v.cwd === 'string'
  && typeof v.ppid === 'number' && typeof v.deadline === 'number';

/** One request off the front of `buf`. A stdin over MAX_STDIN is `too-big` as soon as its length is read, before its bytes arrive. */
export function decodeRequest(buf: Buffer): Decoded<{ request: WireRequest; stdin: Buffer }> {
  const head = readFrame(buf, 0, MAX_HEADER);
  if (head.kind === 'need') return head;
  if (head.kind === 'too-big') return { kind: 'bad', why: `a header of ${head.size} bytes` };
  if (head.kind === 'bad') return head;
  const request = parseJson<unknown>(head.value.toString('utf8'));
  if (!isHeader(request)) return { kind: 'bad', why: 'a header that is not {v, env, cwd, ppid, deadline}' };
  const body = readFrame(buf, head.used, MAX_STDIN);
  return body.kind === 'whole' ? { kind: 'whole', value: { request, stdin: body.value }, used: head.used + body.used } : body;
}

export const encodeReply = (reply: Reply): Buffer => frame(Buffer.from(toJson(reply)));

const isReply = (v: unknown): v is Reply => isRecord(v) && Number.isInteger(v.code) && typeof v.stdout === 'string' && typeof v.stderr === 'string';

/** One reply off the front of `buf`: whole, or not yet, or a fault. Nothing short of a whole record is a reply. */
export function decodeReply(buf: Buffer): Decoded<Reply> {
  const body = readFrame(buf, 0, MAX_REPLY);
  if (body.kind !== 'whole') return body;
  const reply = parseJson<unknown>(body.value.toString('utf8'));
  return isReply(reply) ? { kind: 'whole', value: reply, used: body.used } : { kind: 'bad', why: 'a reply that is not {code, stdout, stderr}' };
}

/** What a client does with a reply that ended short or was not a record: a crash (exit 1, never 0), said on stderr, and the
 *  TypeScript runner judges the event. */
export const crashReply = (why: string): Reply => ({ code: 1, stdout: '', stderr: `claude-packs: the resident runner's reply was not whole (${why}), so this call was not judged by it\n`, fallback: 'ts' });

/** The line a reply carries for the hooks that had not answered by the client's deadline. */
export const overTime = (hooks: readonly string[]): string => `not judged by ${hooks.join(', ')} (over time)`;

/** The first 16 hex characters of the lock's hash: what a daemon says its kit is, and what doctor compares with the project's lock. */
export const lockHash = (lockText: string): string => sha256(lockText, 16);

/** The 16 hex characters that name a daemon: the user, the project's real path, the lock's hash and node's path. A kit update changes
 *  the lock, so a new lock means a new name, and another project or kit version never shares a daemon (review-2 3.4). */
export const daemonKey = (uid: number, projectReal: string, lockText: string, nodePath: string): string =>
  sha256([WIRE.name, uid, projectReal, sha256(lockText), nodePath].join('\0'), 16);

/** The folder the daemon's files live in, and that it makes at mode 700: CLAUDE_PACKS_CACHE (a test's own), else
 *  $XDG_RUNTIME_DIR/claude-packs, else ~/Library/Caches/claude-packs (macOS) or ~/.cache/claude-packs. This is the folder of sockets, pid
 *  files and logs: a runtime place (a tmpfs under XDG_RUNTIME_DIR is right for it). The built binaries live apart, see `binaryCache`. */
export function cacheFolder(env: Readonly<Record<string, string | undefined>>, home: string, platform: string): string {
  const cache = env[WIRE.env.cache];
  if (cache) return cache;
  const runtime = env[WIRE.env.runtime];
  if (runtime) return join(runtime, WIRE.name);
  return platform === 'darwin' ? join(home, 'Library', 'Caches', WIRE.name) : join(home, '.cache', WIRE.name);
}

/** The root of the built client binaries (`<root>/bin/<target>/hook-proxy`) and of the Go build cache: apart from `cacheFolder` on purpose
 *  (W10b finding 3). Binaries must outlive a reboot and a logout, which $XDG_RUNTIME_DIR does not, and `hooks/bin/hook-proxy` (a `sh`
 *  file that cannot import this) picks them from `${CLAUDE_PACKS_CACHE:-$HOME/.cache/claude-packs}`, the line this returns. A test sets
 *  CLAUDE_PACKS_CACHE, and then both roots are that one folder. Nothing moved: binaries were always here, so no migration is needed. */
export const binaryCache = (env: Readonly<Record<string, string | undefined>>, home: string): string => env[WIRE.env.cache] || join(home, '.cache', WIRE.name);

/** `/tmp/claude-packs-<uid>`: where the files go when the cache folder's socket path is too long. */
export const tmpFolder = (uid: number): string => join('/tmp', `${WIRE.tmpPrefix}${uid}`);

/** The folders a daemon of this machine may have used: its cache folder, and the /tmp one for a long path. */
export const socketFolders = (host: { env: Readonly<Record<string, string | undefined>>; home: string; platform: string; uid: number }): string[] =>
  [cacheFolder(host.env, host.home, host.platform), tmpFolder(host.uid)];

/** The socket of the daemon named `key` in `folder`. */
export const socketOf = (folder: string, key: string): string => join(folder, `${key}${WIRE.suffix.socket}`);

/** The environment a detached child keeps: `keys` of `env`, those it has (W10b finding 5). */
export const keepEnv = (env: Readonly<Record<string, string | undefined>>, keys: readonly string[]): Record<string, string> =>
  Object.fromEntries(keys.flatMap((k) => { const v = env[k]; return v === undefined ? [] : [[k, v]]; }));

export interface DaemonFiles { folder: string; socket: string; pid: string; lock: string; log: string }

/** The daemon's files for a key: all in one folder, which is /tmp/claude-packs-<uid> when the socket's path would be over the limit. */
export function daemonFiles(folder: string, key: string, uid: number): DaemonFiles {
  const at = (dir: string): DaemonFiles => ({
    folder: dir, socket: socketOf(dir, key), pid: join(dir, `${key}${WIRE.suffix.pid}`), lock: join(dir, `${key}${WIRE.suffix.lock}`), log: join(dir, `${WIRE.logPrefix}${key}${WIRE.logSuffix}`),
  });
  const first = at(folder);
  return Buffer.byteLength(first.socket) > MAX_SOCKET_PATH ? at(tmpFolder(uid)) : first;
}
