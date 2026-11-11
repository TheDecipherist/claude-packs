// 0.6.0: update takes over a file that is already the pack's own version. (The doctor fixes are in house-doctor.test.mts, the 0.5.x
// project's update in house-052.test.mts: split so no file sums over a minute.)
import { fileURLToPath } from 'node:url';
import { assert, copyFileSync, existsSync, fresh, join, mkdirSync, readFileSync, rmSync, run, test, writeFileSync } from '../kit-cli.mts';
import { fixture, lockOf } from '../fixtures/installs.mts';

const PACKS = fileURLToPath(new URL('../../packs/', import.meta.url));

// Bug (2): an installed file that is byte for byte the pack's own version (the user took the .pack-new, or
// the project's hand copy already matches) is taken over and its lock updated, never shadowed again.
test('update takes over a file that is the pack\'s own version instead of writing .pack-new again', () => {
  const dir = fixture('audio-core');
  const hook = join(dir, '.claude/hooks/git-guard.mjs');
  writeFileSync(hook, `${readFileSync(hook, 'utf8')}// my note\n`);
  run(dir, 'update');
  assert.ok(existsSync(`${hook}.pack-new`), 'an edited file keeps its edit, the new version beside it');
  copyFileSync(`${hook}.pack-new`, hook);
  rmSync(`${hook}.pack-new`);
  run(dir, 'update');
  assert.ok(!existsSync(`${hook}.pack-new`), 'the pack version is recognised');
  assert.doesNotMatch(run(dir, 'doctor'), /you edited \.claude\/hooks\/git-guard\.mjs/, 'the lock holds its hash again');

  const rule = join(dir, '.claude/rules/gpu-bloom.md');
  const r2 = join(dir, '.claude/rules/math-domain-guards.md');
  writeFileSync(r2, `${readFileSync(r2, 'utf8')}- mine\n`);
  run(dir, 'update');
  assert.ok(existsSync(`${r2}.pack-new`));
  copyFileSync(`${r2}.pack-new`, r2); // the raw pack rule, its paths not yet written
  rmSync(`${r2}.pack-new`);
  run(dir, 'update');
  assert.ok(!existsSync(`${r2}.pack-new`), 'a rule taken from .pack-new is the pack\'s');
  assert.match(readFileSync(r2, 'utf8'), /"src\/dsp\/\*\*"/, 'and gets its paths written');
  assert.ok(!existsSync(rule));

  // A file the lock does not know, already identical to the pack's (a project's hand copy before reinstall).
  const other = fresh('cph-');
  mkdirSync(join(other, '.claude/hooks'), { recursive: true });
  copyFileSync(join(PACKS, 'synth-creator/hooks/time-guard.mjs'), join(other, '.claude/hooks/time-guard.mjs'));   // synth-creator's since 0.10.0
  run(other, 'init', 'audio-core');
  assert.ok(!existsSync(join(other, '.claude/hooks/time-guard.mjs.pack-new')));
  assert.ok(lockOf(other).files?.['.claude/hooks/time-guard.mjs'], 'tracked from now on');
});
