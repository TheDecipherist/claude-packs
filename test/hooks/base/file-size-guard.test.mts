// file-size-guard: a source file may not grow past the limit. The hook's contract (its selftest, its worktree case, the emitted
// verdict equal to the source's), then the refusals that sat in the old root test files.
import { join } from 'node:path';
import { write } from '../../fixtures/installs.mts';
import { assert, hookRun, put, test } from '../../kit-cli.mts';
import type { Payload } from '../../kit-cli.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';
import { routeProject, unrefused } from '../routes.mts';

holdsTheContract({
  hook: 'file-size-guard.mjs',
  dir: () => fixture('audio-core'),
  same: (project) => ({ payload: write(join(project, 'src/core/Huge.cpp'), 'x\n'.repeat(400)), status: 2 }),
});

test('file-size-guard refuses growth past the limit by every route', () => {
  const at = `PLACEHOLDER\n${'int a;\n'.repeat(299)}`;
  assert.deepEqual(unrefused(routeProject(), 'file-size-guard.mjs', 'src/dsp/Big.cpp', at, Array.from({ length: 10 }, (_, k) => `int b${k};`).join('\n')), []);
});

test('file-size-guard refuses growth past 300 lines, allows splitting', () => {
  const dir = fixture('audio-core');
  const file = join(dir, 'src/dsp/Big.cpp');
  const fire = (payload: Payload): number | null => hookRun(dir, 'file-size-guard.mjs', payload).status;
  put(file, 'x\n'.repeat(300));
  assert.equal(fire({ tool_name: 'Edit', tool_input: { file_path: file, old_string: 'x\n', new_string: 'x\ny\n' } }), 2);
  put(file, 'x\n'.repeat(400));
  assert.equal(fire({ tool_name: 'Write', tool_input: { file_path: file, content: 'x\n'.repeat(350) } }), 0);
});
