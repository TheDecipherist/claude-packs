// turn: what the session did since the user's last prompt, read from the session's transcript (a JSONL file: one entry
// per line; an assistant entry's content holds text and tool_use blocks, a user entry's holds the prompt or tool results).
//   lastTurn(path) -> { text, uses: [{ name, input, cwd }] }   uses: every tool call of the turn that was not refused
//   writesOfTurn(turn) -> [{ path, text, tool }]                  every file a call wrote and the text it put there
//       (Write's content, Edit's and MultiEdit's new strings, NotebookEdit's source, the shell's known content; null
//       when it cannot be known, e.g. a sed -i), by the shared write reader for the shell.
// A prompt starts a turn; tool results, hook feedback, task notifications and the system's own lines do not, so a turn
// sent back by a Stop hook is judged again with everything it wrote before.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { shellWrites } from './shell-writes.mjs';

const NOT_A_PROMPT = /^\s*(?:<|\[|Stop hook feedback|SubagentStop hook feedback|making-check|Caveat:|This session is being continued)/;

function promptText(e) {
  if (e.type !== 'user' || e.isMeta || e.isSidechain) return null;
  const c = e.message?.content;
  if (typeof c === 'string') return c;
  if (!Array.isArray(c) || c.some((b) => b?.type === 'tool_result')) return null;
  const t = c.filter((b) => b?.type === 'text').map((b) => b.text ?? '').join('\n');
  return t || null;
}

export function lastTurn(path) {
  let lines = [];
  try { lines = readFileSync(path, 'utf8').split('\n'); } catch { return { text: '', uses: [] }; }
  const entries = [];
  for (const l of lines) { if (!l.trim()) continue; try { entries.push(JSON.parse(l)); } catch { /* a torn last line */ } }
  let start = 0;
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const t = promptText(entries[i]);
    if (t !== null && !NOT_A_PROMPT.test(t)) { start = i + 1; break; }
  }
  const refused = new Set();
  const uses = [];
  const text = [];
  for (const e of entries.slice(start)) {
    if (e.isSidechain) continue;
    const content = Array.isArray(e.message?.content) ? e.message.content : [];
    if (e.type === 'user') for (const b of content) if (b?.type === 'tool_result' && b.is_error) refused.add(b.tool_use_id);
    if (e.type !== 'assistant') continue;
    for (const b of content) {
      if (b?.type === 'text' && b.text) text.push(b.text);
      if (b?.type === 'tool_use') uses.push({ id: b.id, name: b.name, input: b.input ?? {}, cwd: e.cwd });
    }
  }
  return { text: text.join('\n'), uses: uses.filter((u) => !refused.has(u.id)) };
}

export function writesOfTurn(turn, cwd = process.cwd()) {
  const out = [];
  for (const u of turn.uses) {
    const i = u.input;
    const at = (p) => resolve(u.cwd ?? cwd, p);
    if (u.name === 'Write' && i.file_path) out.push({ path: at(i.file_path), text: i.content ?? '', tool: u.name });
    else if (u.name === 'Edit' && i.file_path) out.push({ path: at(i.file_path), text: i.new_string ?? '', tool: u.name });
    else if (u.name === 'MultiEdit' && i.file_path) out.push({ path: at(i.file_path), text: (i.edits ?? []).map((e) => e.new_string ?? '').join('\n'), tool: u.name });
    else if (u.name === 'NotebookEdit' && i.notebook_path) out.push({ path: at(i.notebook_path), text: i.new_source ?? '', tool: u.name });
    else if (u.name === 'Bash') for (const w of shellWrites(i.command ?? '', u.cwd ?? cwd)) if (w.op !== 'delete') out.push({ path: w.path, text: w.content ?? (w.sed ? w.sed.scripts.join('\n') : null), tool: 'Bash' });
  }
  return out;
}
