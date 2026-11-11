// spec-lock: a locked spec is refused every route while a build runs. The hook's contract, then the refusals that sat in the old root
// test files.
import { join } from 'node:path';
import { put, execFileSync, assert, test } from '../../kit-cli.mts';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';
import { write } from '../../fixtures/installs.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';
import { routeProject, unrefused } from '../routes.mts';

holdsTheContract({
  hook: 'spec-lock.mjs',
  dir: () => fixture('synth-creator'),
  same: (project) => {
    put(join(project, '.claude/spec-lock.json'), toJson({ locked: true, globs: ['spec/**'], reason: 'build running', since: 'now' }));
    return { payload: write(join(project, 'spec/plan.md')), status: 2 };
  },
});

test('spec-lock refuses a locked spec by every route', () => {
  const dir = routeProject();
  execFileSync('node', [join(dir, '.claude/hooks/spec-lock.mjs'), 'lock', 'build running'], { env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, stdio: 'ignore' });
  assert.deepEqual(unrefused(dir, 'spec-lock.mjs', 'docs/synth-spec.md', '# Spec\nPLACEHOLDER\n', 'a new law'), []);
});
