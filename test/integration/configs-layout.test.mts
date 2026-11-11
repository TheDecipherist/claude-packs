// 0.10.0 (STEP 3 item 1): what update and doctor do with the configuration a layout names, or does not (split from configs.test.mts so no
// file sums over a minute).
import { assert, cli, join, run, test, writeFileSync } from '../kit-cli.mts';
import { readLayout } from '../../packs/base/hooks/lib/layout.mts';
import { fixture } from '../fixtures/installs.mts';

test('a layout without the key (an install before 0.10.0) gets the configuration of its packs on update', () => {
  const dir = fixture('audio-core');
  const { configuration: _gone, ...layout } = readLayout(dir);
  writeFileSync(join(dir, '.claude/layout.json'), JSON.stringify(layout, null, 2));
  assert.match(run(dir, 'update'), /configuration: synth-creator \(from its packs: base, audio-core\)/);
  assert.equal(readLayout(dir).configuration, 'synth-creator');
});

test('doctor fails on a configuration the kit does not have, and on a pack outside it', () => {
  const dir = fixture('audio-core');
  const lf = join(dir, '.claude/layout.json');
  writeFileSync(lf, JSON.stringify({ ...readLayout(dir), configuration: 'gone' }, null, 2));
  assert.match(cli(dir, 'doctor').stdout, /PROBLEM: layout\.json names configuration "gone"/);
  writeFileSync(lf, JSON.stringify({ ...readLayout(dir), configuration: 'base' }, null, 2));
  assert.match(cli(dir, 'doctor').stdout, /PROBLEM: pack audio-core is installed but configuration base does not take it/);
});
