// What a tool call is aimed at, in one line: the first of the input's path, url, pattern, query or description fields. The status line
// shows it beside the tool, from a transcript's tool_use or a hook event's tool_input.
const FIELDS = ['file_path', 'notebook_path', 'path', 'url', 'pattern', 'query', 'description'];
/** The text on one line, trimmed; '' for anything that is not text. */
export const oneLine = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');
/** The target of a tool call's input; '' when it names none. */
export const targetOf = (input) => oneLine(FIELDS.map((f) => input?.[f]).find((v) => typeof v === 'string'));
