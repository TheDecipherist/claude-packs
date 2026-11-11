// A base hook's worktree case that is a function, not data (it judges a command or a read by the layout of the checkout it runs in):
// the one test/worktree-cases-commands.mts holds for it, named, so a hook's own test file hands it to `holdsTheContract`.
import { COMMAND_CASES } from '../worktree-cases-commands.mts';
import type { Checkouts } from '../worktree-rig.mts';

export function commandCase(hook: string): (checkouts: Checkouts) => void {
  const found = COMMAND_CASES[hook];
  if (!found) throw new Error(`test/worktree-cases-commands.mts holds no case for ${hook}`);
  return found;
}
