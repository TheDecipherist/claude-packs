import { readText } from './files.mts';
import type { ToolInput } from './types.d.mts';

/** A file's text before an edit and after it. */
export interface EditResult {
  before: string;
  after: string;
}

// Given a PreToolUse payload for Write/Edit/MultiEdit, returns { before, after } file text,
// or null when the result can't be computed (the hook then lets the edit through).
export function computeEdit(toolName: string, input: ToolInput): EditResult | null {
  const path = input.file_path;
  const before = (path ? readText(path) : null) ?? '';

  if (toolName === 'Write') return { before, after: input.content ?? '' };

  const edits = toolName === 'MultiEdit' ? input.edits ?? [] : [input];
  let after = before;
  for (const e of edits) {
    const { old_string: oldText, new_string: newText } = e;
    if (typeof oldText !== 'string' || !after.includes(oldText)) return null;
    after = e.replace_all
      ? after.split(oldText).join(newText ?? '')
      : after.replace(oldText, () => newText ?? '');
  }
  return { before, after };
}
