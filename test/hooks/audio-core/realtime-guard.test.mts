// realtime-guard: realtime-unsafe code in processBlock is refused. The contract, then the refusals of the old root files.
import { join } from 'node:path';
import { write } from '../../fixtures/installs.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

const RT_BAD = 'void Voice::processBlock (juce::AudioBuffer<float>& b, juce::MidiBuffer& m) { auto* x = new float[64]; }\n';

holdsTheContract({
  hook: 'realtime-guard.mjs',
  dir: () => fixture('audio-core'),
  same: (project) => ({ payload: write(join(project, 'src/audio/Voice.cpp'), RT_BAD), status: 2 }),
});
