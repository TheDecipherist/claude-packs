// unread-writes: an inline program can write a file in a way no hook can read, and every content law lets an unknown text through.
// The MPX 500's edits through a local helper passed no law, and nothing said so (KF-40). A notice was not enough: in
// supernova2_monitor six sessions in two days wrote source and orders through python heredocs, against their orders, each time
// "no hook stopped it" (WB-57, WB-63, WB-70, WB-81, WB-89; the user, 2026-11-22: "this needs to be ironclad in the harness"). So the
// write is refused: a file a content law judges is written with the Edit or Write tool. A file in a folder git ignores (a scratch
// probe, a build output) is no part of the project and is let through.
//   unreadRefusal(ev, root, env) -> '' | the refusal's text (exit 2)
import { extname, relative } from 'node:path';
import { gitRun } from './git-run.mts';
import { languageOf } from './languages.mts';
import { insideProject } from './project.mts';
import type { Env } from './shell-writes.mts';
import type { HookEvent, WriteOp } from './types.d.mts';
import { writesOf } from './writes.mts';

const INLINE = /\b(?:python[\d.]*|pypy3?|node|nodejs|bun|perl|ruby)\b[^\n|;&]*(?:\s-[A-Za-z]*[ceE]\s|\s-\s|<<)/;
const CONTENT_OPS: ReadonlySet<WriteOp> = new Set<WriteOp>(['write', 'edit', 'append']);

/** The files a content law reads beside source: orders and docs, tables, layouts and manifests. */
const JUDGED_TEXT = new Set(['.md', '.json', '.csv', '.txt', '.yaml', '.yml']);

const judged = (path: string): boolean => Boolean(languageOf(extname(path))) || JUDGED_TEXT.has(extname(path).toLowerCase());

/** The paths (from the root) git ignores, asked of git itself, so a folder not made yet is known too; none where git cannot run. */
function ignoredOf(root: string, rels: readonly string[], env: Env): Set<string> {
  const r = gitRun(['check-ignore', '--no-index', '--', ...rels], { cwd: root, env });
  return new Set(r.stdout.split('\n').map((l) => l.trim()).filter(Boolean));
}

/** The refusal of an inline program that writes, unread, a file a content law judges; '' when it writes none. */
export function unreadRefusal(ev: HookEvent, root: string, env: Env): string {
  const command = ev.tool_input?.command;
  if (ev.tool_name !== 'Bash' || ev.hook_event_name !== 'PreToolUse' || !INLINE.test(command ?? '')) return '';
  const cwd = ev.cwd ?? root;
  const unknown = writesOf(ev, cwd, env)
    .filter((w) => w.after === null && CONTENT_OPS.has(w.op) && judged(w.path) && insideProject(root, w.path, cwd));
  if (!unknown.length) return '';
  const rels = unknown.map((w) => relative(root, w.path));
  const ignored = ignoredOf(root, rels, env);
  const unread = rels.filter((rel) => !ignored.has(rel));
  if (!unread.length) return '';
  return `BLOCKED by unread-writes: this command writes ${unread.join(', ')} through an inline program, so no content law can `
    + 'read what it writes. Write it with the Edit or Write tool, where every law judges it. A probe or an output belongs in a '
    + 'folder git ignores (scratch/, build/).\n';
}
