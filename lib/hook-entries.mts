// The shapes of a settings.json hook entry and the facts the kit reads off one: what is a kit node hook, whether the runner can
// run a hook file, what a project's settings never get from a pack.json row. Shared by settings.mts (the merge) and hook-fold.mts
// (the one runner entry per event and the table it reads).
import { join } from 'node:path';
import { readText } from '../packs/base/hooks/lib/files.mts';

/** One hook entry of settings.json as the project holds it (user data: every field may be missing). The kit's own `role` and
 *  `order` come from a pack.json row and never reach a project's settings. */
export interface HookEntry { type?: string; command?: string; timeout?: number; async?: boolean; asyncRewake?: boolean; role?: string; order?: number }
/** One matcher group of settings.json. */
export interface HookGroup { matcher?: string; hooks?: HookEntry[] }
/** One matcher group once it has been read: its hooks are always a list. */
export type ReadGroup = { matcher?: string; hooks: HookEntry[] };

export const RUNNER = 'run-hooks.mjs';
/** The `sh` picker of the Go proxy, the one runner command a settings entry may run instead of the TypeScript runner (W8.2, d-13). */
export const PICKER = '.claude/hooks/bin/hook-proxy';
export const NODE_HOOK = /^node "\$CLAUDE_PROJECT_DIR\/\.claude\/hooks\/([\w-]+\.mjs)"$/;
// Only a hook written for the runner (it exports hook: `hook(text)`, or `hook(event, ctx)` on the new contract) is run by it; any
// other node hook keeps its own entry: the kit repo's own kit-lock was folded in, failed there as exit 1 and never refused (KWB-26).
export const HOOK_EXPORT = /export\s+(?:const|let|function|async\s+function)\s+hook\b|export\s*\{[^}]*\bhook\b[^}]*\}/;

/** Whether the installed hook file of this name exports `hook`, so the runner can run it. */
export const runnable = (claudeDir: string) => (name: string): boolean => HOOK_EXPORT.test(readText(join(claudeDir, 'hooks', name)) ?? '');

/** The script a kit node hook entry runs (`a.mjs`), or undefined for any other command. */
export const nodeScript = (h: HookEntry): string | undefined => NODE_HOOK.exec(h.command ?? '')?.[1];

// What only the kit reads in a pack.json hook row (its role, its order: W4, W8.1) never reaches a project's settings.json.
const KIT_ONLY = new Set(['role', 'order']);
/** A hook entry as settings.json holds it: without the keys only the kit reads. */
export const forSettings = (h: HookEntry): HookEntry => Object.fromEntries(Object.entries(h).filter(([k]) => !KIT_ONLY.has(k)));
