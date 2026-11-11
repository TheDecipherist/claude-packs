// stop-verdict.mts: what git-guard says at Stop; the lag of the main checkout's trunk is a refusal, and three equal refusals end the session.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_SENDS, stopVerdict } from '../../../packs/base/hooks/lib/stop-verdict.mts';
import { scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { parseJson } from '../../../packs/base/hooks/lib/json.mts';
import type { LagVerdict } from '../../../packs/base/hooks/lib/trunk-lag.mts';

const lagging = (v: LagVerdict) => (): LagVerdict => v;

test('a folder that is no repo with nothing lagging lets the session end, once', () => {
  const dir = scratchDir('stop-');
  const said = stopVerdict(dir, {}, {}, 's1', { stateDir: scratchDir('stop-state-') });
  assert.equal(said.code, 0);
});

test('a lag the session can fix refuses the end, and the refusal is the lag\'s own words', () => {
  const dir = scratchDir('stop-');
  const state = scratchDir('stop-state-');
  const said = stopVerdict(dir, {}, {}, 's1', { lag: lagging({ refuse: 'merge --ff-only now' }), stateDir: state });
  assert.equal(said.code, 2);
  assert.match(said.stderr ?? '', /merge --ff-only now/);
});

test('the same refusal three times ends the session with the list going to the user', () => {
  const dir = scratchDir('stop-');
  const state = scratchDir('stop-state-');
  const run = (): ReturnType<typeof stopVerdict> => stopVerdict(dir, {}, {}, 's2', { lag: lagging({ refuse: 'same' }), stateDir: state });
  for (let i = 0; i < MAX_SENDS; i += 1) assert.equal(run().code, 2, `send ${i + 1}`);
  const last = run();
  assert.equal(last.code, 0);
  assert.match(parseJson<{ systemMessage?: string }>(last.stdout)?.systemMessage ?? '', /refused the end of this session 3 times/);
});

test('a lag only the user can act on is a message, never a refusal; a failed look is said too', () => {
  const dir = scratchDir('stop-');
  const warn = stopVerdict(dir, {}, {}, 's3', { lag: lagging({ warn: 'bring it up to date' }), stateDir: scratchDir('stop-state-') });
  assert.equal(warn.code, 0);
  assert.match(parseJson<{ systemMessage?: string }>(warn.stdout)?.systemMessage ?? '', /bring it up to date/);
  const err = stopVerdict(dir, {}, {}, 's4', { lag: lagging({ error: 'offline' }), stateDir: scratchDir('stop-state-') });
  assert.equal(err.code, 0);
  assert.match(err.stdout ?? '', /offline/);
});
