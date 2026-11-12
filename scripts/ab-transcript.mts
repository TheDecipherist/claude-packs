// A Claude Code transcript (one .jsonl) read into what a run cost: turns, tokens by usage, wall time, hook waiting, refusals and
// retries (W11.0). Used by scripts/ab-compare.mts for the new run and by the original-run records for the old one.
import { isRecord, parseJson } from '../packs/base/hooks/lib/json.mts';

export interface Tokens { input: number; output: number; cacheRead: number; cacheWrite: number }
export interface RunSummary {
  turns: number; tokens: Tokens; wallMs: number; hookMs: number; refusals: number; retries: number; model: string | null;
}

const num = (value: unknown): number => (typeof value === 'number' ? value : typeof value === 'string' && value !== '' ? Number(value) || 0 : 0);
const REFUSED = /hook error|\bblocked by\b|PreToolUse|PostToolUse/;

/** The text of a tool result's content (a string, or blocks with text). */
function resultText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((b) => (isRecord(b) && typeof b['text'] === 'string' ? b['text'] : '')).join('\n');
}

/** What one transcript cost. A message written in several blocks repeats its usage on each: one turn, counted once (the last
 *  usage seen for its id). A refusal is a tool result that is an error and came from a hook; a retry is the next call of the same
 *  tool after a refusal of it. */
export function summariseTranscript(text: string): RunSummary {
  const usageById = new Map<string, Record<string, unknown>>();
  const toolOf = new Map<string, string>();
  const refused: Set<string> = new Set();
  let first = Number.NaN; let last = Number.NaN; let hookMs = 0; let refusals = 0; let retries = 0; let model: string | null = null;
  for (const line of text.split('\n')) {
    const row = parseJson<Record<string, unknown>>(line);
    if (!row || !isRecord(row)) continue;
    const at = typeof row['timestamp'] === 'string' ? Date.parse(row['timestamp']) : Number.NaN;
    if (!Number.isNaN(at)) { if (Number.isNaN(first)) first = at; last = at; }
    const message = isRecord(row['message']) ? row['message'] : null;
    const attachment = isRecord(row['attachment']) ? row['attachment'] : null;
    if (attachment && typeof attachment['type'] === 'string' && attachment['type'].startsWith('hook_')) hookMs += num(attachment['durationMs']);
    if (row['type'] === 'assistant' && message) {
      if (typeof message['id'] === 'string' && isRecord(message['usage'])) usageById.set(message['id'], message['usage']);
      if (typeof message['model'] === 'string') model = message['model'];
      for (const block of Array.isArray(message['content']) ? message['content'] : []) {
        if (!isRecord(block) || block['type'] !== 'tool_use' || typeof block['id'] !== 'string' || typeof block['name'] !== 'string') continue;
        if (toolOf.has(block['id'])) continue;
        toolOf.set(block['id'], block['name']);
        if (refused.delete(block['name'])) retries += 1;
      }
    }
    if (row['type'] === 'user' && message && Array.isArray(message['content'])) {
      for (const block of message['content']) {
        if (!isRecord(block) || block['type'] !== 'tool_result' || block['is_error'] !== true) continue;
        if (!REFUSED.test(resultText(block['content']))) continue;
        refusals += 1;
        const name = typeof block['tool_use_id'] === 'string' ? toolOf.get(block['tool_use_id']) : undefined;
        if (name) refused.add(name);
      }
    }
  }
  const tokens: Tokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  for (const u of usageById.values()) {
    tokens.input += num(u['input_tokens']); tokens.output += num(u['output_tokens']);
    tokens.cacheRead += num(u['cache_read_input_tokens']); tokens.cacheWrite += num(u['cache_creation_input_tokens']);
  }
  return { turns: usageById.size, tokens, wallMs: Number.isNaN(first) ? 0 : last - first, hookMs, refusals, retries, model };
}
