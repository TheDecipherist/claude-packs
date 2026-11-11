// 0.6.0: update takes over a file that is already the pack's own version. (The doctor fixes are in house-doctor.test.mts, the 0.5.x
// project's update in house-052.test.mts, a rule and a hand copy in house-update-rule.test.mts: split so no file sums over a minute.)
import { assert, copyFileSync, existsSync, join, readFileSync, rmSync, run, test, writeFileSync } from '../kit-cli.mts';
import { fixture } from '../fixtures/installs.mts';

// Bug (2): an installed file that is byte for byte the pack's own version (the user took the .pack-new, or
// the project's hand copy already matches) is taken over and its lock updated, never shadowed again.
test('update takes over a hook that is the pack\'s own version instead of writing .pack-new again', () => {   // was: "update takes over a file that is the pack's own version instead of writing .pack-new again" (the hook, the rule and the hand copy are three tests now)
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
});
