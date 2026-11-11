// repo-litter: a screenshot, a trace or an oversize file is not added to git. The hook's contract, then its refusals.
import { join } from 'node:path';
import { put } from '../../../packs/base/hooks/lib/files.mts';
import { bash, git } from '../../fixtures/installs.mts';
import { commandCase } from '../command-case.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'repo-litter.mjs',
  dir: () => fixture('base'),
  same: (project) => {
    git(project, 'init', '-q');
    put(join(project, 'litter-shot.png'), 'x');
    return { payload: bash('git add litter-shot.png', project), status: 2 };
  },
  worktree: commandCase('repo-litter.mjs'),
});
