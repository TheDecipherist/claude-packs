// The agents a session started in the background that have not returned, read from the session's transcript (KWB-199).
// Shapes, from a real `claude -p` transcript (test/fixtures/transcripts/background-agents.jsonl is an anonymised sample):
//  - a launch: an assistant line whose content holds a `tool_use` named Agent (or Task) with `input.run_in_background: true`;
//  - its acknowledgement: a user line with a `tool_result` for that id, "Async agent launched successfully" (not a return);
//  - a return: a line holding `<task-notification>` with `<tool-use-id>` of the launch (queue-operation, queued_command and the
//    lead's own turn each carry it); a launch refused comes back as a `tool_result` with `is_error`.
import { readText } from './files.mts';

export interface PendingAgent { id: string; description: string }

const NOTIFICATION = /<task-notification>[\s\S]*?<tool-use-id>(\w+)<\/tool-use-id>/;
const LAUNCHED = /^Async agent launched/;

const asRecord = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null);

// The content blocks of a transcript line's message.
function blocksOf(line: Record<string, unknown>): Record<string, unknown>[] {
  const content = asRecord(line['message'])?.['content'];
  return Array.isArray(content) ? content.map(asRecord).filter((b): b is Record<string, unknown> => b !== null) : [];
}

const textOf = (content: unknown): string => (typeof content === 'string' ? content : Array.isArray(content) ? content.map((c) => asRecord(c)?.['text'] ?? '').join('') : '');

/** Every background agent the transcript's session started that has not returned, in the order it started them. */
export function pendingAgents(transcript: string): PendingAgent[] {
  const started = new Map<string, string>();
  const returned = new Set<string>();
  for (const raw of transcript.split('\n')) {
    if (!raw.trim()) continue;
    const note = raw.includes('<task-notification>') ? NOTIFICATION.exec(raw)?.[1] : undefined;
    if (note) returned.add(note);
    let line: Record<string, unknown> | null = null;
    try { line = asRecord(JSON.parse(raw)); } catch { /* a torn last line */ }
    if (!line) continue;
    for (const b of blocksOf(line)) {
      const input = asRecord(b['input']);
      if (b['type'] === 'tool_use' && (b['name'] === 'Agent' || b['name'] === 'Task') && input?.['run_in_background'] === true && typeof b['id'] === 'string') {
        started.set(b['id'], typeof input['description'] === 'string' ? input['description'] : String(b['id']));
      } else if (b['type'] === 'tool_result' && typeof b['tool_use_id'] === 'string' && !LAUNCHED.test(textOf(b['content']))) {
        returned.add(b['tool_use_id']);   // the agent's result, or the launch refused
      }
    }
  }
  return [...started].filter(([id]) => !returned.has(id)).map(([id, description]) => ({ id, description }));
}

/** The pending agents of the transcript at `path` (none when it cannot be read). */
export function pendingIn(path: string | undefined): PendingAgent[] {
  const text = path ? readText(path) : null;
  return text ? pendingAgents(text) : [];
}
