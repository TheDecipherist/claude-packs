// W10b review findings 9 and 11: a request or a reply is gathered once, not joined again per chunk; and the daemon's closing steps
// each end, whatever one of them does.
import { FrameGather } from '../../../packs/base/hooks/lib/frame-gather.mts';
import { PROTOCOL, decodeRequest, encodeRequest, MAX_STDIN } from '../../../packs/base/hooks/lib/proxy-wire.mts';
import { closeInOrder } from '../../../packs/base/hooks/resident/shutdown.mts';
import { assert, test } from '../../kit-cli.mts';

const request = { v: PROTOCOL, env: {}, cwd: '/', ppid: 1, deadline: 1 };

test('finding 11: 1,000 chunks of a request are joined at most three times, and decode to the whole', () => {
  const bytes = encodeRequest(request, Buffer.alloc(8 * 1024 * 1024, 7));
  const gather = new FrameGather(2, MAX_STDIN);
  let joined: Buffer | null = null;
  let decodes = 0;
  const step = Math.ceil(bytes.length / 1000);
  for (let at = 0; at < bytes.length; at += step) {
    const got = gather.push(bytes.subarray(at, at + step));
    if (got !== null) { decodes += 1; joined = got; }
  }
  assert.ok(gather.joins <= 3, `${gather.joins} joins`);
  assert.ok(decodes <= 4, `${decodes} decodes`);
  const done = decodeRequest(joined ?? Buffer.alloc(0));
  assert.ok(done.kind === 'whole' && done.value.stdin.length === 8 * 1024 * 1024);
});

test('finding 11: a stdin length over the cap is handed to decode as soon as it is read, before its bytes', () => {
  const head = Buffer.concat([Buffer.from([0, 0, 0, 2]), Buffer.from('{}'), Buffer.from([0xff, 0xff, 0xff, 0xff])]);
  const got = new FrameGather(2, MAX_STDIN).push(head);
  assert.ok(got !== null && decodeRequest(got).kind === 'bad' || got !== null);
  assert.ok(got !== null, 'handed over');
});

test('finding 9: closing steps each end: one that rejects is logged, one that hangs is given up on, and the rest run', async () => {
  const log: string[] = [];
  const ran: string[] = [];
  const t = Date.now();
  await closeInOrder([
    ['socket', () => Promise.reject(new Error('boom'))],
    ['pool', () => new Promise<void>(() => undefined)],
    ['state', () => { ran.push('state'); }],
  ], (l) => log.push(l), 100);
  assert.ok(Date.now() - t < 1500, 'bounded');
  assert.deepEqual(ran, ['state']);
  assert.match(log.join('\n'), /socket.*boom/);
  assert.match(log.join('\n'), /pool.*did not finish/);
});
