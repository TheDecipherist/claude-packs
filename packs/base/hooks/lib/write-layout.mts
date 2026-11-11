// The layout that governs one written file: the layout of the checkout the file belongs to (a worktree with its own layout.json
// judges by it, else the project's), so a hook on the contract reads `ctx.layout` when the project's own governs and reads the
// worktree's only when that is the one that does (typescript order W4: ctx.layout is the project's, a worktree file is judged by its own).
import { resolve } from 'node:path';
import { readLayout } from './layout.mts';
import { claudeRoot } from './project.mts';
import type { HookContext, Layout } from './types.d.mts';

/** The layout for `file`: `ctx.layout` when the project's own layout governs it, else the layout of its worktree. */
export function layoutOfWrite(ctx: HookContext, file: string): Layout {
  const root = claudeRoot(ctx.projectDir, file, ctx.cwd);
  return root === resolve(ctx.projectDir) ? ctx.layout : readLayout(root);
}
