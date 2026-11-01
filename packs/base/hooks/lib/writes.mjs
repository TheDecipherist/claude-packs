// writes: every file one tool call writes, whichever tool it is (WB-69: close the route, not just the
// brief). A guard that refuses a write judges these, so Write, Edit, MultiEdit, NotebookEdit and the
// shell (>, >>, tee, sed -i, cp, mv, a heredoc into a file, ...) are one route each into the same check.
//   writesOf(payload, base) -> [{ path, op, before, after }]
//     path: absolute; op: write, edit, append, copy, move, link, truncate, touch, delete (see shell-writes.mjs)
//     before: the file's text now ('' when it does not exist); after: its text once the call has run, or null
//     when that cannot be known (a perl -i, a program's output). A guard that judges paths needs only path;
//     one that judges content judges after, and lets an unknown after through.
import { resolve } from 'node:path';
import { computeEdit } from './apply-edit.mjs';
import { afterText, readText, shellWrites } from './shell-writes.mjs';

export const WRITE_TOOLS = ['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'Bash'];

export function writesOf(payload, base = process.cwd()) {
  const input = payload.tool_input ?? {};
  const tool = payload.tool_name;
  if (tool === 'Write' || tool === 'Edit' || tool === 'MultiEdit') {
    if (!input.file_path) return [];
    const path = resolve(base, input.file_path);
    const r = computeEdit(tool, { ...input, file_path: path });
    return [{ path, op: tool === 'Write' ? 'write' : 'edit', before: r?.before ?? readText(path) ?? '', after: r?.after ?? null }];
  }
  if (tool === 'NotebookEdit') {
    if (!input.notebook_path) return [];
    const path = resolve(base, input.notebook_path);
    const before = readText(path) ?? '';
    const src = input.new_source ?? '';
    const after = input.edit_mode === 'delete' ? before : `${before}${before && !before.endsWith('\n') ? '\n' : ''}${src}${src.endsWith('\n') ? '' : '\n'}`;
    return [{ path, op: 'edit', before, after }];
  }
  if (tool === 'Bash') {
    return shellWrites(input.command ?? '', payload.cwd ?? base).map((w) => ({ path: w.path, op: w.op, ...afterText(w) }));
  }
  return [];
}

export function readPayload(text) {
  try { return JSON.parse(text); } catch { return null; }
}
