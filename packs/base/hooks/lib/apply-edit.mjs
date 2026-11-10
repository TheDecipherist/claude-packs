import { existsSync, readFileSync } from 'node:fs';

// Given a PreToolUse payload for Write/Edit/MultiEdit, returns { before, after } file text,
// or null when the result can't be computed (the hook then lets the edit through).
export function computeEdit(toolName, input) {
  const path = input.file_path;
  const before = path && existsSync(path) ? readFileSync(path, 'utf8') : '';

  if (toolName === 'Write') return { before, after: input.content ?? '' };

  const edits = toolName === 'MultiEdit' ? input.edits ?? [] : [input];
  let after = before;
  for (const e of edits) {
    if (typeof e.old_string !== 'string' || !after.includes(e.old_string)) return null;
    after = e.replace_all
      ? after.split(e.old_string).join(e.new_string ?? '')
      : after.replace(e.old_string, () => e.new_string ?? '');
  }
  return { before, after };
}
