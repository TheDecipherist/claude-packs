// protect-vendor: vendored code and a copy tree are refused every route. The hook's contract, then the refusals that sat in the old root
// test files.
import { join } from 'node:path';
import { withLayout, write } from '../../fixtures/installs.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

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
