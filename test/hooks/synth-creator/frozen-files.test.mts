// frozen-files: a frozen test or golden is refused every route. The hook's contract, then the refusals that sat in the old root test
// files.
import { join } from 'node:path';
import { put, execFileSync, assert, hookRun, spawnSync, test } from '../../kit-cli.mts';
import type { Spawned } from '../../kit-cli.mts';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';
import { write } from '../../fixtures/installs.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';
import { routeProject, unrefused } from '../routes.mts';

holdsTheContract({
  hook: 'frozen-files.mjs',
  dir: () => fixture('synth-creator'),
  same: (project) => {
    put(join(project, '.claude/state/frozen.json'), toJson({ files: ['tests/**'], reason: 'bug 7' }));
    return { payload: write(join(project, 'tests/svf_test.cpp')), status: 2 };
  },
});

test('frozen-files refuses a frozen file by every route', () => {
  const dir = routeProject();
  execFileSync('node', [join(dir, '.claude/tools/freeze.mjs'), 'on', 'bug 7', 'tests/**'], { env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, stdio: 'ignore' });
  assert.deepEqual(unrefused(dir, 'frozen-files.mjs', 'tests/bug_7_test.cpp', 'PLACEHOLDER\n', 'EXPECT (true);'), []);
});

test('freeze, red gate and frozen-files work together', () => {
  const dir = fixture('audio-core');
  const tool = (name: string, ...args: string[]): Spawned => spawnSync('node', [join(dir, '.claude/tools', `${name}.mjs`), ...args], { env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, encoding: 'utf8' });
  const edit = (rel: string): number | null => hookRun(dir, 'frozen-files.mjs', { tool_name: 'Edit', tool_input: { file_path: join(dir, rel) } }).status;
  tool('freeze', 'on', 'bug 7', 'tests/bug_7*');
  assert.equal(edit('tests/bug_7_test.cpp'), 2);
  assert.equal(edit('src/dsp/Svf.cpp'), 0);
  const red = tool('test-verdict', '--red', 'bug_7', '--', 'printf "50%% tests passed, 1 tests failed out of 2\\n\\nThe following tests FAILED:\\n\\t  2 - bug_7 (Failed)\\n"');
  assert.equal(red.status, 0);
  assert.match(red.stdout, /RED_CONFIRMED/);
  tool('freeze', 'off');
  assert.equal(edit('tests/bug_7_test.cpp'), 0);
});
