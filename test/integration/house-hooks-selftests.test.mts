// 0.6.0: the house hooks pass their selftests in an install of them (split from house-hooks.test.mts so no file sums over a minute). The
// two opt-in hooks are switched on by "enable" and an update first, as a project does it.
import { assert, join, run, spawnSync, test } from '../kit-cli.mts';
import { fixture, withLayout } from '../fixtures/installs.mts';

test('the house hooks pass their selftests', () => {   // the selftest half of "the house hooks install where they belong, project-neutral, and pass their selftests"
  const dir = fixture('audio-core+gpu-painter');
  withLayout(dir, { enable: ['hooks/user-asks.mjs', 'hooks/idle-wake.mjs'] });
  run(dir, 'update');
  for (const h of ['git-guard.mjs', 'build-guard.mjs', 'time-guard.mjs', 'user-asks.mjs', 'idle-wake.mjs', 'browser-guard.mjs', 'protect-vendor.mjs']) {
    const r = spawnSync('node', [join(dir, '.claude/hooks', h), '--selftest'], { env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, encoding: 'utf8' });
    assert.equal(r.status, 0, `${h}: ${r.stdout}${r.stderr}`);
  }
});
