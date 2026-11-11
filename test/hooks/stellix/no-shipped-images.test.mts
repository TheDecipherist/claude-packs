// no-shipped-images: an image in the code is refused, a golden render is not. The contract, then the refusals of the old root files.
import { join } from 'node:path';
import { write } from '../../fixtures/installs.mts';
import { assert, test } from '../../kit-cli.mts';
import { extraFixture, holdsTheContract } from '../hook-rig.mts';
import { routeProject, unrefused } from '../routes.mts';

// The stellix profile switches this hook off, so the install is the packs without it (no fixture names that).
holdsTheContract({
  hook: 'no-shipped-images.mjs',
  dir: () => extraFixture('stellix', ['audio-core', 'gpu-painter', 'stellix']),
  same: (project) => ({ payload: write(join(project, 'src/painter/logo.png'), 'x'), status: 2 }),
});

test('no-shipped-images refuses an image in the code by every route', () => {
  assert.deepEqual(unrefused(routeProject(), 'no-shipped-images.mjs', 'src/painter/logo.png', 'PLACEHOLDER\n', 'PNG'), []);
});
