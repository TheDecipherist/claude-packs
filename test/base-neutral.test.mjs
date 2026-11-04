// 0.10.0 (Tim, STEP 3 item 2; KWB-31): base holds only universal engineering, so every configuration can install it. A synth
// word in base (sound, panel, patch, voice, DSP, synth) means a synth law or a synth example sits where a web service or a
// tool gets it too: it goes to the synth-creator pack, or the example is made neutral. The same holds for the base
// configuration's own config.json. The synth-creator pack carries what moved, and the synth-creator configuration installs it.
import { relative } from 'node:path';
import { KIT, assert, join, readdirSync, readFileSync, statSync, test } from './kit-cli.mjs';

const SYNTH_WORD = /\b(sounds?|panels?|patch(?:es)?|voices?|dsp|synths?)\b/i;

function files(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...files(p));
    else if (!/\.pyc$|^\.DS_Store$/.test(f)) out.push(p);
  }
  return out;
}

test('base and the base configuration name no synth word', () => {
  const hits = [];
  for (const f of [...files(join(KIT, 'packs/base')), join(KIT, 'configurations/base/config.json')]) {
    readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      const m = line.match(SYNTH_WORD);
      if (m) hits.push(`${relative(KIT, f)}:${i + 1}: "${m[0]}" in ${line.trim().slice(0, 90)}`);
    });
  }
  assert.deepEqual(hits, [], `synth words in base:\n${hits.join('\n')}`);
});

test('what left base is in the synth-creator pack, and only the synth-creator configuration installs that pack', () => {
  const moved = ['hooks/build-guard.mjs', 'hooks/time-guard.mjs', 'hooks/spec-lock.mjs', 'hooks/frozen-files.mjs', 'hooks/protect-vendor.mjs',
    'hooks/stage-guard.mjs', 'hooks/build-sweep.mjs', 'hooks/idle-wake.mjs', 'hooks/tims-asks.mjs', 'tools/freeze.mjs',
    'rules/debug-by-measurement.md', 'rules/done-means-fresh-evidence.md', 'rules/hooks-and-gates.md', 'rules/copy-trees-read-only.md',
    'skills/build-step/SKILL.md'];
  for (const m of moved) {
    assert.ok(statSync(join(KIT, 'packs/synth-creator', m)).isFile(), `${m} is in the synth-creator pack`);
    assert.throws(() => statSync(join(KIT, 'packs/base', m)), `${m} left base`);
  }
  assert.ok(statSync(join(KIT, 'packs/audio-core/hooks/lib/realtime-checks.mjs')).isFile(), 'the realtime checks live with realtime-guard');
  const configs = readdirSync(join(KIT, 'configurations')).map((c) => JSON.parse(readFileSync(join(KIT, 'configurations', c, 'config.json'), 'utf8')));
  const takers = configs.filter((c) => [...c.packs.always, ...c.packs.choose].includes('synth-creator')).map((c) => c.name);
  assert.deepEqual(takers, ['synth-creator']);
  for (const c of configs) assert.equal(c.packs.always[0], 'base', `${c.name} installs base first`);
});
