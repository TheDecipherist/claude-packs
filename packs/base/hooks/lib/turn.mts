// turn: what the session did since the user's last prompt, read from the session's transcript (a JSONL file: one entry
// per line; an assistant entry's content holds text and tool_use blocks, a user entry's holds the prompt or tool results).
//   lastTurn(path) -> { text, uses: [{ name, input, cwd }] }   uses: every tool call of the turn that was not refused
//   writesOfTurn(turn, cwd, env) -> [{ path, text, tool }]      every file a call wrote and the text it put there
//       (Write's content, Edit's and MultiEdit's new strings, NotebookEdit's source, the shell's known content; null
//       when it cannot be known, e.g. a sed -i), by the shared write reader for the shell.
// A prompt starts a turn; tool results, hook feedback, task notifications and the system's own lines do not, so a turn
// sent back by a Stop hook is judged again with everything it wrote before.
import { closeSync, fstatSync, openSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseJson } from './json.mts';
import { eachLineBack } from './lines-back.mts';
import { promptOfBytes } from './prompt-of.mts';
import type { Block, TranscriptEntry } from './prompt-of.mts';
import { shellWrites } from './shell-writes.mts';
import type { Env } from './shell-writes.mts';
import type { ToolInput } from './types.d.mts';

export type { TranscriptEntry } from './prompt-of.mts';
export { lastPrompt } from './last-prompt.mts';

/** One tool call of a turn. */
export interface ToolUse {
  id?: string | undefined;
  name: string;
  input: ToolInput;
  cwd?: string | undefined;
}

export interface Turn {
  text: string;
  uses: readonly ToolUse[];
}

/** A file a call of the turn wrote: its absolute path, the text it put there (null when unknown) and the tool that did. This is
 *  one of the four write shapes the base hooks carry (W3 report: it differs from `FileWrite` in carrying the written text alone, with no before). */
export interface TurnWrite {
  path: string;
  text: string | null;
  tool: string;
}

const blocksOf = (e: TranscriptEntry): readonly (Block | null)[] => (Array.isArray(e.message?.content) ? e.message.content : []);

function parseEntries(lines: readonly string[]): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [];
  for (const l of lines) {
    if (!l.trim()) continue;
    const e = parseJson<TranscriptEntry>(l);   // a torn last line is null
    if (e) entries.push(e);
  }
  return entries;
}

// The turn's entries, read from the transcript's end back to its prompt by eachLineBack (KWB-24: a long session's transcript is hundreds of
// MB). Only the lines the turn is made of become strings: an assistant entry (its text and tool calls) and a refused call's result. Every
// quote inside a JSON string is escaped, so `"assistant"` and `"is_error":true` are an entry's own fields, never text inside it; a tool
// result that went well, nearly every byte of an unattended run's turn, is passed over undecoded (rss: the two Stop hooks that read the
// turn decoded and parsed all 25 MB of one, 213 MB of a worker's RSS each).
const KEPT = ['"assistant"', '"is_error":true'];

let decoded = 0;
/** Bytes of transcript lines this process made strings of, so far (a counter for tests). */
export const bytesDecoded = (): number => decoded;

function turnEntries(path: string, endsBefore: (line: Buffer) => boolean): TranscriptEntry[] {
  let fd: number;
  try { fd = openSync(path, 'r'); } catch { return []; }
  const lines: string[] = [];
  try {
    eachLineBack(fd, fstatSync(fd).size, (line) => {
      if (promptOfBytes(line) !== null || endsBefore(line)) return true;
      if (KEPT.some((k) => line.includes(k))) { decoded += line.length; lines.push(line.toString('utf8')); }
      return false;
    });
  } finally {
    closeSync(fd);
  }
  return parseEntries(lines.reverse());
}

/** The last turn: what follows the last real prompt, or the last line `endsBefore` names (a caller's own boundary; none by default). */
export function lastTurn(path: string, endsBefore: (line: Buffer) => boolean = () => false): Turn {
  const entries = turnEntries(path, endsBefore);
  const refused = new Set<string>();
  const uses: ToolUse[] = [];
  const text: string[] = [];
  for (const e of entries) {
    if (e.isSidechain) continue;
    const content = blocksOf(e);
    if (e.type === 'user') for (const b of content) if (b?.type === 'tool_result' && b.is_error && b.tool_use_id) refused.add(b.tool_use_id);
    if (e.type !== 'assistant') continue;
    for (const b of content) {
      if (b?.type === 'text' && b.text) text.push(b.text);
      if (b?.type === 'tool_use') uses.push({ id: b.id, name: b.name ?? '', input: b.input ?? {}, cwd: e.cwd });
    }
  }
  return { text: text.join('\n'), uses: uses.filter((u) => !(u.id && refused.has(u.id))) };
}

// A landing ends a step. Compaction is no prompt, so one turn can hold a whole run, and its last step's making line says nothing of the steps before: the
// MPX 500 was sent back for files written hours earlier, at a landing (KF-34). What a turn landed is over; only the writes after its last landing are judged.
const LANDING = /(?:^|[;&|\n])\s*git\s+(?:-C\s+\S+\s+)?merge\s+(?:\S+\s+)*?--ff-only\b/;
const sinceLanding = (uses: readonly ToolUse[]): readonly ToolUse[] => uses.slice(uses.findLastIndex((u) => u.name === 'Bash' && LANDING.test(u.input.command ?? '')) + 1);

/** The files the calls of a turn wrote since its last landing, with the text each put there. `cwd` is where a call that names none ran, `env` what a shell path expands from. */
export function writesOfTurn(turn: { uses: readonly ToolUse[] }, cwd: string, env: Env): TurnWrite[] {
  const out: TurnWrite[] = [];
  for (const u of sinceLanding(turn.uses)) {
    const i = u.input;
    const at = (p: string): string => resolve(u.cwd ?? cwd, p);
    if (u.name === 'Write' && i.file_path) out.push({ path: at(i.file_path), text: i.content ?? '', tool: u.name });
    else if (u.name === 'Edit' && i.file_path) out.push({ path: at(i.file_path), text: i.new_string ?? '', tool: u.name });
    else if (u.name === 'MultiEdit' && i.file_path) out.push({ path: at(i.file_path), text: (i.edits ?? []).map((e) => e.new_string ?? '').join('\n'), tool: u.name });
    else if (u.name === 'NotebookEdit' && i.notebook_path) out.push({ path: at(i.notebook_path), text: i.new_source ?? '', tool: u.name });
    else if (u.name === 'Bash') for (const w of shellWrites(i.command ?? '', u.cwd ?? cwd, env)) if (w.op !== 'delete') out.push({ path: w.path, text: w.content ?? (w.sed ? w.sed.scripts.join('\n') : null), tool: 'Bash' });
  }
  return out;
}
