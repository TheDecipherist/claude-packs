// lib/proxy-wire.mts and lib/proxy-client.mts: the protocol of the resident runner (W8.2, review-2-go 1.1, 1.2, 1.9, 3.11).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer, type Server } from 'node:net';
import { join } from 'node:path';
import { scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { askDaemon } from '../../../packs/base/hooks/lib/proxy-client.mts';
import {
  MAX_STDIN, MAX_SOCKET_PATH, PROTOCOL, cacheFolder, crashReply, daemonFiles, daemonKey, decodeReply, decodeRequest, encodeReply, encodeRequest, overTime,
  type WireRequest,
} from '../../../packs/base/hooks/lib/proxy-wire.mts';

const request: WireRequest = { v: PROTOCOL, env: { CLAUDE_PROJECT_DIR: '/p', MARK: 'é' }, cwd: '/p/wt', ppid: 4242, deadline: Date.now() + 5000 };

test('a request round-trips: the header, then stdin\'s bytes exactly, whatever they hold', () => {
  const stdin = Buffer.from([0, 255, 10, 13, 0xc3, 0x28, 123]);   // not valid UTF-8, with a newline and a NUL
  const got = decodeRequest(encodeRequest(request, stdin));
  assert.equal(got.kind, 'whole');
  if (got.kind !== 'whole') return;
  assert.deepEqual(got.value.request, request);
  assert.ok(got.value.stdin.equals(stdin));
  assert.equal(got.used, encodeRequest(request, stdin).length);
});

test('a request cut anywhere is `need`, never a request: every prefix of one asks for more', () => {
  const bytes = encodeRequest(request, '{"hook_event_name":"Stop"}');
  for (let n = 0; n < bytes.length; n += 1) assert.equal(decodeRequest(bytes.subarray(0, n)).kind, 'need', `at ${n} bytes`);
  assert.equal(decodeRequest(bytes).kind, 'whole');
});

test('two requests on one stream: the first is taken with its length, the rest left', () => {
  const a = encodeRequest(request, 'a');
  const both = Buffer.concat([a, encodeRequest(request, 'bb')]);
  const got = decodeRequest(both);
  assert.equal(got.kind === 'whole' ? got.used : -1, a.length);
});

test('a header that is not a request is bad, and a header over a megabyte is bad before its bytes come', () => {
  const junk = Buffer.from('{"v":1}');
  const framed = Buffer.concat([Buffer.from([0, 0, 0, junk.length]), junk, Buffer.from([0, 0, 0, 0])]);
  assert.equal(decodeRequest(framed).kind, 'bad');
  assert.equal(decodeRequest(Buffer.from([0x7f, 0xff, 0xff, 0xff])).kind, 'bad');
});

test('a stdin over 64 MB is `too-big` as soon as its length is read: the daemon never holds it, the TypeScript path judges it', () => {
  const head = encodeRequest(request, '').subarray(0, -4);   // the header frame and no stdin frame
  const n = Buffer.alloc(4);
  n.writeUInt32BE(MAX_STDIN + 1);
  const got = decodeRequest(Buffer.concat([head, n]));
  assert.deepEqual(got, { kind: 'too-big', size: MAX_STDIN + 1 });
  n.writeUInt32BE(MAX_STDIN);
  assert.equal(decodeRequest(Buffer.concat([head, n])).kind, 'need');
});

test('stdout is carried byte for byte: JSON, plain text, tabs, newlines, non-ASCII', () => {
  for (const stdout of ['{"systemMessage":"x"}\n', 'plain context\nwith lines\n', '\ttab\r\n', 'é ✓ 日本語 \u0000 end', '']) {
    const got = decodeReply(encodeReply({ code: 2, stdout, stderr: 'why\n' }));
    assert.deepEqual(got.kind === 'whole' ? got.value : null, { code: 2, stdout, stderr: 'why\n' });
  }
});

test('a reply that is not a whole record is never a reply: every prefix needs more, a non-record is bad', () => {
  const bytes = encodeReply({ code: 0, stdout: 'a', stderr: '' });
  for (let n = 0; n < bytes.length; n += 1) assert.equal(decodeReply(bytes.subarray(0, n)).kind, 'need', `at ${n} bytes`);
  const text = Buffer.from('{"code":"0"}');
  assert.equal(decodeReply(Buffer.concat([Buffer.from([0, 0, 0, text.length]), text])).kind, 'bad');
  assert.deepEqual([crashReply('x').code, crashReply('x').fallback], [1, 'ts']);
});

test('the over-time line names the hooks that had not answered', () => {
  assert.equal(overTime(['git-guard', 'lesson-checks']), 'not judged by git-guard, lesson-checks (over time)');
});

test('the daemon\'s key: 16 hex characters that change with the user, the project, the lock and node, and with nothing else', () => {
  const key = daemonKey(501, '/p', '{"kit":"2.0.0"}', '/usr/bin/node');
  assert.match(key, /^[0-9a-f]{16}$/);
  assert.equal(daemonKey(501, '/p', '{"kit":"2.0.0"}', '/usr/bin/node'), key);
  for (const other of [daemonKey(502, '/p', '{"kit":"2.0.0"}', '/usr/bin/node'), daemonKey(501, '/q', '{"kit":"2.0.0"}', '/usr/bin/node'),
    daemonKey(501, '/p', '{"kit":"2.0.1"}', '/usr/bin/node'), daemonKey(501, '/p', '{"kit":"2.0.0"}', '/opt/node')]) assert.notEqual(other, key);
});

test('the folder: the test\'s own, else XDG_RUNTIME_DIR, else the machine\'s cache; and a path over 100 bytes goes to /tmp/claude-packs-<uid>', () => {
  assert.equal(cacheFolder({ CLAUDE_PACKS_CACHE: '/c', XDG_RUNTIME_DIR: '/x' }, '/h', 'linux'), '/c');
  assert.equal(cacheFolder({ XDG_RUNTIME_DIR: '/x' }, '/h', 'linux'), '/x/claude-packs');
  assert.equal(cacheFolder({}, '/Users/u', 'darwin'), '/Users/u/Library/Caches/claude-packs');
  assert.equal(cacheFolder({}, '/home/u', 'linux'), '/home/u/.cache/claude-packs');
  const short = daemonFiles('/c', '0123456789abcdef', 501);
  assert.deepEqual([short.folder, short.socket, short.pid, short.lock, short.log], ['/c', '/c/0123456789abcdef.sock', '/c/0123456789abcdef.pid', '/c/0123456789abcdef.lock', '/c/daemon-0123456789abcdef.log']);
  const home = `/${'h'.repeat(90)}`;   // a planted HOME of 90 characters
  const long = daemonFiles(cacheFolder({}, home, 'linux'), '0123456789abcdef', 501);
  assert.ok(Buffer.byteLength(long.socket) <= MAX_SOCKET_PATH);
  assert.equal(long.folder, '/tmp/claude-packs-501');
  assert.equal(long.log, '/tmp/claude-packs-501/daemon-0123456789abcdef.log');
});

// ---- the client against fake daemons it starts in this process ----

async function fake(onData: (c: import('node:net').Socket, got: Buffer) => void): Promise<{ socket: string; close: () => void }> {
  const dir = scratchDir('proxy-wire-');
  const socket = join(dir, 'd.sock');
  const server: Server = createServer((c) => {
    const parts: Buffer[] = [];
    c.on('data', (d: Buffer) => { parts.push(d); const all = Buffer.concat(parts); if (decodeRequest(all).kind === 'whole') onData(c, all); });
    c.on('error', () => undefined);
  });
  await new Promise<void>((ok) => server.listen(socket, ok));
  return { socket, close: () => server.close() };
}

test('the client gets a whole reply, and a daemon that closes after 3 bytes is a crash with the TypeScript path, never exit 0', async () => {
  const good = await fake((c, got) => { const r = decodeRequest(got); c.end(encodeReply({ code: 2, stdout: '{"a":1}', stderr: `saw ${r.kind === 'whole' ? r.value.stdin.toString() : ''}` })); });
  const a = await askDaemon(good.socket, request, 'STDIN');
  assert.deepEqual(a.kind === 'reply' ? a.reply : null, { code: 2, stdout: '{"a":1}', stderr: 'saw STDIN' });
  good.close();
  const cut = await fake((c) => { c.end(encodeReply({ code: 0, stdout: '', stderr: '' }).subarray(0, 3)); });
  const b = await askDaemon(cut.socket, request, 'x');
  assert.equal(b.kind, 'cut');
  assert.ok(b.kind === 'cut' && b.reply.code !== 0 && b.reply.fallback === 'ts' && b.reply.stderr.includes('closed after 3 bytes'));
  cut.close();
});

test('a daemon that answers past the deadline is a crash at the deadline; a stale or absent socket is `none`', async () => {
  const slow = await fake(() => undefined);
  const t = Date.now();
  const a = await askDaemon(slow.socket, { ...request, deadline: Date.now() + 100 }, 'x', 150);
  assert.equal(a.kind, 'cut');
  assert.ok(Date.now() - t < 1000);
  slow.close();
  const none = await askDaemon(join(scratchDir('proxy-wire-'), 'absent.sock'), request, 'x');
  assert.deepEqual(none, { kind: 'none', why: 'ENOENT' });
});
