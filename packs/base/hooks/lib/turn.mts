// turn: what the session did since the user's last prompt, read from the session's transcript (a JSONL file: one entry
// per line; an assistant entry's content holds text and tool_use blocks, a user entry's holds the prompt or tool results).
//   lastTurn(path) -> { text, uses: [{ name, input, cwd }] }   uses: every tool call of the turn that was not refused
//   writesOfTurn(turn, cwd, env) -> [{ path, text, tool }]      every file a call wrote and the text it put there
//       (Write's content, Edit's and MultiEdit's new strings, NotebookEdit's source, the shell's known content; null
//       when it cannot be known, e.g. a sed -i), by the shared write reader for the shell.
// A prompt starts a turn; tool results, hook feedback, task notifications and the system's own lines do not, so a turn
// sent back by a Stop hook is judged again with everything it wrote before.
import { closeSync, fstatSync, openSync, readSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseJson } from './json.mts';
import { shellWrites } from './shell-writes.mts';
import type { Env } from './shell-writes.mts';
import type { ToolInput } from './types.d.mts';

/** One block of a transcript entry's content: text, a tool call (id, name, input) or a tool result (tool_use_id, is_error). */
interface Block {
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

const NOT_A_PROMPT = /^\s*(?:<|\[|Stop hook feedback|SubagentStop hook feedback|making-check|Caveat:|This session is being continued)/;

const blocksOf = (e: TranscriptEntry): readonly (Block | null)[] => (Array.isArray(e.message?.content) ? e.message.content : []);

function promptText(e: TranscriptEntry): string | null {
  if (e.type !== 'user' || e.isMeta || e.isSidechain) return null;
  const c = e.message?.content;
  if (typeof c === 'string') return c;
  if (!Array.isArray(c) || c.some((b: Block | null) => b?.type === 'tool_result')) return null;
  const t = c.filter((b: Block | null) => b?.type === 'text').map((b: Block | null) => b?.text ?? '').join('\n');
  return t || null;
}

// The transcript's last entries, read from its end: the last TAIL bytes, quadrupled until they hold the turn's prompt (KWB-24: a
// long session's transcript is hundreds of MB, and reading all of it at every Stop took seconds). -> { entries, start }
const TAIL = 1 << 20;

interface Tail {
  entries: TranscriptEntry[];
  start: number;
}

function parseEntries(lines: readonly string[]): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [];
  for (const l of lines) {
    if (!l.trim()) continue;
    const e = parseJson<TranscriptEntry>(l);   // a torn last line is null
    if (e) entries.push(e);
  }
  return entries;
}

function tailEntries(path: string): Tail {
  let fd: number;
  try { fd = openSync(path, 'r'); } catch { return { entries: [], start: 0 }; }
  try {
    const size = fstatSync(fd).size;
    for (let want = TAIL; ; want *= 4) {
      const from = Math.max(0, size - want);
      const buf = Buffer.alloc(size - from);
      readSync(fd, buf, 0, buf.length, from);
      const lines = buf.toString('utf8').split('\n');
      if (from > 0) lines.shift(); // a line cut by the start of the window
      const entries = parseEntries(lines);
      for (let i = entries.length - 1; i >= 0; i -= 1) {
        const t = promptText(entries[i] ?? {});
        if (t !== null && !NOT_A_PROMPT.test(t)) return { entries, start: i + 1 };
      }
      if (from === 0) return { entries, start: 0 };
    }
  } finally {
    closeSync(fd);
  }
}

/** The user's own words that started the current turn, or '' (no transcript, or no prompt in it). */
export function lastPrompt(path: string): string {
  const { entries, start } = tailEntries(path);
  const prompt = entries[start - 1];   // tailEntries starts the turn just after its prompt
  return (start > 0 && prompt && promptText(prompt)) || '';
}

export function lastTurn(path: string): Turn {
  const { entries, start } = tailEntries(path);
  const refused = new Set<string>();
  const uses: ToolUse[] = [];
  const text: string[] = [];
  for (const e of entries.slice(start)) {
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
