import { readText } from './files.mjs';
// Given a PreToolUse payload for Write/Edit/MultiEdit, returns { before, after } file text,
// or null when the result can't be computed (the hook then lets the edit through).
export function computeEdit(toolName, input) {
    const path = input.file_path;
    const before = (path ? readText(path) : null) ?? '';
    if (toolName === 'Write')
        return { before, after: input.content ?? '' };
    const edits = toolName === 'MultiEdit' ? input.edits ?? [] : [input];
    let after = before;
    for (const e of edits) {
        const { old_string: oldText, new_string: newText } = e;
        if (typeof oldText !== 'string' || !after.includes(oldText))
            return null;
        after = e.replace_all
            ? after.split(oldText).join(newText ?? '')
            : after.replace(oldText, () => newText ?? '');
    }
    return { before, after };
}
