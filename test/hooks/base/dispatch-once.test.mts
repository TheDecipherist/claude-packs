// dispatch-once: one switch on a kind lives in one place. The hook's contract (its selftest, its worktree case, the emitted verdict
// equal to the source's), then the refusals that sat in the old root test files.
import { join } from 'node:path';
import { write } from '../../fixtures/installs.mts';
import { put } from '../../kit-cli.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'dispatch-once.mjs',
  dir: () => fixture('audio-core'),
  same: (project) => {
    put(join(project, 'src/core/Blend.cpp'), 'float blend (Layer& l) { switch (l.blendStyle) { default: return 0.0f; } }\n');
    return { payload: write(join(project, 'src/core/Label.cpp'), 'const char* label (Layer& l) { switch (l.blendStyle) { default: return ""; } }\n'), status: 2 };
  },
});
