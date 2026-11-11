// 0.6.0: doctor fails a hook that fails its selftest (split from house-doctor.test.mts so no file sums over a minute). The install is cut to
// the two hooks planted and ten others (W5-h): a selftest run on all 46 took 76 s, and what is proved is that a failing one turns doctor red.
import { assert, doctorRunning, join, keepHooks, readFileSync, test, writeFileSync } from '../kit-cli.mts';
import { fixture } from '../fixtures/installs.mts';

test('doctor fails when a hook fails its selftest', () => {
  const dir = keepHooks(fixture('audio-core+gpu-painter'), ['git-guard.mjs', 'browser-guard.mjs']);
  const hook = join(dir, '.claude/hooks/git-guard.mjs');
  const text = readFileSync(hook, 'utf8');
  const law = "return 'Nothing is rebased or amended. Make a new commit.';";
  assert.ok(text.includes(law), 'the rebase law is in the emitted git-guard');
  writeFileSync(hook, text.replace(law, 'return null;'));
  const guard = join(dir, '.claude/hooks/browser-guard.mjs');
  writeFileSync(guard, readFileSync(guard, 'utf8').replace('LAUNCH_BASH.some((rx) => rx.test(seg))', 'false'));
  const r = doctorRunning(dir);   // the selftests run: the gate would take them as proved (KWB-166)
  assert.equal(r.status, 1);
  assert.match(r.stdout, /git-guard\.mjs fails its selftest/);
  assert.match(r.stdout, /browser-guard\.mjs fails its selftest/, 'the ported browser-guard too');
});
