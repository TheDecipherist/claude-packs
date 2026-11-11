// The resident runner under load: 10,000 events through one daemon keep its memory flat within 50 MB after the first thousand
// (W8.2). Too long for the daemon's selftest, so it is here.
import { readText } from '../../packs/base/hooks/lib/files.mts';
import { assert, test } from '../kit-cli.mts';
import { PLANTS } from '../../packs/base/hooks/resident/selftest-plants.mts';
import { client, eventText, filesOf, makeRig, start, stopAll } from '../../packs/base/hooks/resident/selftest-rig.mts';
import { readState } from '../../packs/base/hooks/resident/state.mts';

const POOL = 4;

async function events(rig: ReturnType<typeof makeRig>, n: number): Promise<void> {
  // as many at once as the pool has workers: a burst wider than that grows the pool (by design), and memory with it
  for (let done = 0; done < n; done += POOL) {
    const batch = await Promise.all(Array.from({ length: Math.min(POOL, n - done) }, () => client(rig, eventText(rig, 'Fast'))));
    const odd = batch.filter((j) => j.path !== 'daemon' || j.reply.code !== 0);
    assert.deepEqual(odd.map((j) => `${j.path} ${j.reply.code} ${j.reply.stderr.slice(0, 120)}`), [], `after ${done} events`);
  }
}

test('10,000 events: the daemon\'s resident set after the first 1,000 and after the last differ by under 50 MB', { timeout: 300_000 }, async () => {
  const rig = makeRig(PLANTS, {}, 'resident-load-');
  try {
    const up = await start(rig, ['--pool', String(POOL), '--state-ms', '1']);
    assert.equal(up.kind, 'ready');
    await events(rig, 1000);
    await new Promise((d) => setTimeout(d, 50));
    const early = readState(filesOf(rig).pid)?.rss ?? 0;
    await events(rig, 9000);
    await new Promise((d) => setTimeout(d, 50));
    const late = readState(filesOf(rig).pid);
    assert.equal(late?.events, 10_000);
    assert.ok(early > 0 && (late?.rss ?? 0) - early < 50 * 1048576, `rss ${Math.round(early / 1048576)} MB then ${Math.round((late?.rss ?? 0) / 1048576)} MB`);
  } catch (e) {
    throw new Error(`${e instanceof Error ? e.message : String(e)}\ndaemon log:\n${(readText(filesOf(rig).log) ?? '(none)').split('\n').slice(-12).join('\n')}`);
  } finally { await stopAll(rig); }
});
