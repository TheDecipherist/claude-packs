// unread-writes: an inline program can write a source file in a way no hook can read, and every content law lets an unknown text through.
// The MPX 500's edits through a local helper passed no law, and nothing said so (KF-40). When a command passed, this names what it wrote
// unread, where the author sees it, so a pass is never taken for a judgement.
//   unreadWrites(ev, root) -> '' | JSON for the hook's stdout
import { extname, relative } from 'node:path';
import { languageOf } from './languages.mjs';
import { insideProject } from './project.mjs';
import { writesOf } from './writes.mjs';

const INLINE = /\b(?:python[\d.]*|pypy3?|node|nodejs|bun|perl|ruby)\b[^\n|;&]*(?:\s-[A-Za-z]*[ceE]\s|\s-\s|<<)/;
const CONTENT_OPS = new Set(['write', 'edit', 'append']);

export function unreadWrites(ev, root) {
  const command = ev.tool_input?.command;
  if (ev.tool_name !== 'Bash' || ev.hook_event_name !== 'PreToolUse' || !INLINE.test(command ?? '')) return '';
  const cwd = ev.cwd ?? root;
  const unread = writesOf(ev, cwd, process.env).filter((w) => w.after === null && CONTENT_OPS.has(w.op) && languageOf(extname(w.path)) && insideProject(root, w.path, cwd)).map((w) => relative(cwd, w.path));
  if (!unread.length) return '';
  const files = unread.join(', ');
  return JSON.stringify({
    systemMessage: `not judged: this command writes ${files} in a way the hooks could not read`,
    hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: `The hooks could not read what this command writes to ${files}, so no content law judged it. Use the Edit or Write tool for source files, where every law applies.` },
  });
}
