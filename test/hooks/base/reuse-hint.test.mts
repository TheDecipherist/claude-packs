// reuse-hint: a prompt that names what the repo already has is shown it. The hook's contract (it exports no worktreeCase: the case
// is the one test/worktrees.test.mjs kept as a function), then its refusals.
import { join } from 'node:path';
import { put } from '../../../packs/base/hooks/lib/files.mts';
import { assert } from '../../kit-cli.mts';
import { fireAs } from '../../worktree-rig.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';
import type { Checkouts } from '../hook-rig.mts';

const HELPER = 'export function formatDateRange(a, b) {\n  return a;\n}\n';
const prompt = (cwd: string) => ({ hook_event_name: 'UserPromptSubmit', prompt: 'format the date range', cwd });

holdsTheContract({
  hook: 'reuse-hint.mjs',
  dir: () => fixture('base'),
  same: (project) => {
    put(join(project, 'src/app/dates.ts'), HELPER);
    return { payload: prompt(project), status: 0 };
  },
  worktree: ({ here, wt }: Checkouts) => {
    // The worktree's branch has this helper; main does not. A prompt is judged by the checkout it was typed in.
    put(join(wt, 'src/app/dates.ts'), HELPER);
    const said = (cwd: string): string => fireAs(here, 'reuse-hint.mjs', prompt(cwd)).stdout;
    assert.match(said(wt), /formatDateRange/);
    assert.doesNotMatch(said(here), /formatDateRange/);
  },
});
