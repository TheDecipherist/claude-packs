// protect-vendor: vendored code and a copy tree are refused every route. The hook's contract, then the refusals that sat in the old root
// test files.
import { join } from 'node:path';
import { git, withLayout, write } from '../../fixtures/installs.mts';
import { assert, hookRun, put, run, test } from '../../kit-cli.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';
import { workProject, writeAt } from '../work-project.mts';
import { routeProject, unrefused } from '../routes.mts';

// the project's layout names a copy tree and the one tool that may write it, which the hook's worktree case relies on
const withCopyTree = (): string => {
  const dir = fixture('synth-creator');
  withLayout(dir, (layout) => ({
    folders: { ...(layout.folders as Record<string, unknown>), engines_copy: { path: 'src/engines/copied', kind: 'copy', purpose: 'a copy tree' } },
    guards: { copy: { tools: ['tools/copy_in.py'] } },
  }));
  return dir;
};

holdsTheContract({
  hook: 'protect-vendor.mjs',
  dir: withCopyTree,
  same: (project) => ({ payload: write(join(project, 'third_party/lib/lib.h')), status: 2 }),
});

test('protect-vendor refuses vendored code and a copy tree by every route', () => {
  const dir = routeProject();
  assert.deepEqual(unrefused(dir, 'protect-vendor.mjs', 'third_party/lib/lib.h', 'PLACEHOLDER\n', 'int x;'), []);
  assert.deepEqual(unrefused(dir, 'protect-vendor.mjs', 'src/engines/copied/Voice.h', 'PLACEHOLDER\n', 'int x;'), []);
});

test('WB-2: a nested clone under build/_deps is still judged by the project, a worktree by itself', () => {
  const dir = fixture('audio-core');
  git(dir, 'init', '-q');
  put(join(dir, 'build/_deps/juce-src/modules/juce_core/juce_core.h'), '// juce\n');
  git(join(dir, 'build/_deps/juce-src'), 'init', '-q');
  put(join(dir, 'third_party/lib/.git/HEAD'), 'ref: refs/heads/main\n');
  const edit = (file: string): number | null => hookRun(dir, 'protect-vendor.mjs', { tool_name: 'Edit', tool_input: { file_path: join(dir, file), old_string: 'a', new_string: 'b' } }).status;
  assert.equal(edit('build/_deps/juce-src/modules/juce_core/juce_core.h'), 2, 'FetchContent clone of JUCE');
  assert.equal(edit('third_party/lib/lib.h'), 2, 'a vendored repo with its own .git folder');
  assert.equal(edit('src/dsp/Svf.cpp'), 0);
});

test('KF-2: protect-vendor\'s refusal names the setting that answers it', () => {
  const dir = workProject('audio-core');
  const r = writeAt(dir, 'protect-vendor.mjs', 'build/evidence/R0/update.txt', 'x\n');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /"buildOutput"/);
  run(dir, 'doctor', '--fresh');
});
