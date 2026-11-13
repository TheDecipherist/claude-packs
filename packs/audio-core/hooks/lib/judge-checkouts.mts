import { checkoutRoot, claudeRoot, insideProject } from './project.mts';
import type { Hook, Verdict } from './types.d.mts';
import { pass, refuse } from './verdict.mts';
import { writesOf } from './writes.mts';

/** What one checkout is asked: its root, the root its `.claude` settings live in, and the file written there (null: run by hand). */
export type CheckoutJudge = (root: string, settingsRoot: string, file: string | null) => string | null | undefined;

/** A PostToolUse hook that judges every checkout a write landed in (an agent worktree on its own), or the project when run by hand.
 *  `judgeOne` returns the words of a refusal, or null; undefined says the file is none of its business. Used by param-id-lock and release-lock. */
export const judgeEachCheckout = (judgeOne: CheckoutJudge): Hook => (event, ctx): Verdict => {
  const main = ctx.projectDir;
  const files: (string | null)[] = event.tool_name ? writesOf(event, ctx.cwd, ctx.env).map((w) => w.path).filter((f) => insideProject(main, f, ctx.cwd)) : [null];
  const seen = new Set<string>();
  for (const file of files) {
    const root = file ? checkoutRoot(main, file, ctx.cwd) : main;
    if (seen.has(root)) continue;
    const said = judgeOne(root, file ? claudeRoot(main, file, ctx.cwd) : main, file);
    if (said === undefined) continue; // not a file this hook judges
    seen.add(root);
    if (said) return refuse(said);
  }
  return pass;
};
