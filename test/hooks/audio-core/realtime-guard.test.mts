// realtime-guard: realtime-unsafe code in processBlock is refused. The contract, then the refusals of the old root files.
import { join } from 'node:path';
import { write } from '../../fixtures/installs.mts';
import { assert, test } from '../../kit-cli.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';
import { routeProject, unrefused } from '../routes.mts';

const RT_BAD = 'void Voice::processBlock (juce::AudioBuffer<float>& b, juce::MidiBuffer& m) { auto* x = new float[64]; }\n';

holdsTheContract({
  hook: 'realtime-guard.mjs',
  dir: () => fixture('audio-core'),
  same: (project) => ({ payload: write(join(project, 'src/audio/Voice.cpp'), RT_BAD), status: 2 }),
});

test('realtime-guard refuses realtime-unsafe code by every route', () => {
  assert.deepEqual(unrefused(routeProject(), 'realtime-guard.mjs', 'src/audio/Voice.cpp', '// voice\nPLACEHOLDER\n', RT_BAD.trimEnd()), []);
});
