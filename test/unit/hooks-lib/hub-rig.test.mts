// hub-rig.mts: a scratch repo whose "GitHub" is a bare repo beside it, for git-guard's selftests. It runs real git: the rig is the subject.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { readText } from '../../../packs/base/hooks/lib/files.mts';
import { hubRepo } from '../../../packs/base/hooks/lib/hub-rig.mts';
import { gitOut } from '../../../packs/base/hooks/lib/git-run.mts';

test('the rig has a repo, a bare hub beside it as origin, and a layout with the house laws on', () => {
  const rig = hubRepo('hub-rig-');
  assert.equal(rig.dir, join(rig.top, 'repo'));
  assert.ok(existsSync(join(rig.hub, 'HEAD')), 'a bare repo');
  assert.match(readText(join(rig.dir, '.claude/layout.json')) ?? '', /"house":\s*true/);
  assert.ok(rig.session.startsWith('selftest-hub-rig-'));
});

test('a commit lands in the repo and a push lands it in the hub, and not before', () => {
  const rig = hubRepo('hub-rig-');
  rig.commit('first');
  assert.equal(gitOut(['rev-parse', '--verify', '-q', 'main'], { cwd: rig.hub, env: process.env }) === gitOut(['rev-parse', 'HEAD'], { cwd: rig.dir, env: process.env }), false, 'not pushed yet');
  rig.push('main');
  assert.equal(gitOut(['rev-parse', 'main'], { cwd: rig.hub, env: process.env }), gitOut(['rev-parse', 'HEAD'], { cwd: rig.dir, env: process.env }));
});

test('a push of a ref the repo lacks fails loudly: planted wrong input', () => {
  const rig = hubRepo('hub-rig-');
  rig.commit('first');
  assert.throws(() => rig.push('no-such-branch'));
});
