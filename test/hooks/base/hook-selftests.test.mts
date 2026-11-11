// Every hook of every pack has a passing --selftest and doctor runs them all (Sub37's WB-4). No hook of its own: this is what doctor
// does over an install, so it is its own file (it runs every selftest once, which is most of a minute). Each hook's own file holds
// its selftest too.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readJson } from '../../../packs/base/hooks/lib/json.mts';
import { KIT, assert, doctorRunning, put, spawnSync, test } from '../../kit-cli.mts';
import { enable, extraFixture } from '../hook-rig.mts';

test('WB-4: every hook in every pack has a passing --selftest, and doctor runs them all', () => {
  // Pack hooks import the shared lib/ that base installs beside them, so they run from an install. 0.7.0: the opt-in hooks
  // (user-asks, idle-wake) install only when enabled, so this install enables them. The selftests run through doctor (one that
  // passed on the same bytes earlier in this run is kept, not run again: lib/selftest-cache.mts).
  const dir = extraFixture('wb4', ['audio-core', 'gpu-painter', 'stellix']);
  const optIn = readJson<{ optIn: string[] }>(join(KIT, 'packs/synth-creator/pack.json'))?.optIn ?? [];
  assert.ok(optIn.length > 0, 'the synth-creator pack names its opt-in hooks');
  enable(dir, ...optIn);
  const shipped = ['packs/base', 'packs/synth-creator', 'packs/audio-core', 'packs/gpu-painter', 'packs/stellix']
    .flatMap((p) => { try { return readdirSync(join(KIT, p, 'hooks')).filter((f) => f.endsWith('.mts') && !f.endsWith('.d.mts')).map((f) => f.replace(/\.mts$/, '.mjs')); } catch { return []; } }).sort();
  const installed = readdirSync(join(dir, '.claude/hooks')).filter((f) => f.endsWith('.mjs')).sort();
  assert.deepEqual(installed, shipped);
  const pin = spawnSync('node', [join(KIT, 'global/hooks/version-pin-guard.mjs'), '--selftest'], { encoding: 'utf8', input: '', timeout: 60000, env: { ...process.env, CLAUDE_PROJECT_DIR: dir } });
  assert.ok(pin.status === 0 && /selftest: OK/.test(pin.stdout), pin.stdout + pin.stderr);
  assert.equal(doctorRunning(dir).status, 0);   // run, not taken as proved by the gate (KWB-166)
  put(join(dir, '.claude/hooks/protect-vendor.mjs'), "if (process.argv.includes('--selftest')) process.exit(1);\n");
  // Not --fresh: a selftest that passed on the same bytes in this run (the per-hook tests' own, or the run just above) is not run
  // again, but the planted hook's bytes changed, so doctor runs it, it fails, and it is the only one that does
  const planted = doctorRunning(dir).stdout;
  assert.match(planted, /protect-vendor\.mjs fails its selftest/);
  assert.equal(planted.match(/fails its selftest/g)?.length, 1, 'every other hook passes its selftest');
});
