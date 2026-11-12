// prompt-of: what a transcript entry is, and whether it is the user's own prompt (turn.mts reads a turn from it, last-prompt.mts the prompt).
// A prompt starts a turn; tool results, hook feedback, task notifications and the system's own lines do not.
import { parseJson } from './json.mts';
import type { ToolInput } from './types.d.mts';

/** One block of a transcript entry's content: text, a tool call (id, name, input) or a tool result (tool_use_id, is_error). */
export interface Block {
  type?: string;
  text?: string;
  id?: string;
  name?: string;
  input?: ToolInput;
  tool_use_id?: string;
  is_error?: boolean;
}

/** One line of the transcript. Outside data, so every field is optional. */
export interface TranscriptEntry {
  type?: string;
  isMeta?: boolean;
  isSidechain?: boolean;
  cwd?: string;
  message?: { content?: string | readonly (Block | null)[] };
}

const NOT_A_PROMPT = /^\s*(?:<|\[|Stop hook feedback|SubagentStop hook feedback|making-check|Caveat:|This session is being continued)/;

function promptText(e: TranscriptEntry): string | null {
  if (e.type !== 'user' || e.isMeta || e.isSidechain) return null;
  const c = e.message?.content;
  if (typeof c === 'string') return c;
  if (!Array.isArray(c) || c.some((b: Block | null) => b?.type === 'tool_result')) return null;
  const t = c.filter((b: Block | null) => b?.type === 'text').map((b: Block | null) => b?.text ?? '').join('\n');
  return t || null;
}

/** The entry's text when it is the user's own prompt (one that starts a turn), else null. */
export function realPrompt(e: TranscriptEntry): string | null {
  const t = promptText(e);
  return t !== null && !NOT_A_PROMPT.test(t) ? t : null;
}

/** The prompt a transcript line holds, or null. Most lines are tool calls and results, megabytes of them: a line that is no user entry or
 *  holds a tool result is passed over without being parsed. */
export function promptOfLine(line: string): string | null {
  if (!line.includes('"user"') || line.includes('"type":"tool_result"')) return null;
  const e = parseJson<TranscriptEntry>(line);   // a torn line is null
  return e ? realPrompt(e) : null;
}
