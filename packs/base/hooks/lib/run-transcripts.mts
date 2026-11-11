// Each agent's last call, read from Claude Code's own transcripts (1.8.2), for a project with no heartbeat hook yet: the
// Mac's run was busy, its agents calling every few seconds, and the status line showed nothing (the user: "status bar is
// still not really showing anything running on the mac at all"). Claude Code keeps a project's sessions in
// ~/.claude/projects/<the project's path, every other character a dash>/: the lead's as <session>.jsonl, each agent's as
// <session>/subagents/agent-<id>.jsonl. An agent's transcript is matched to its worktree by the worktree paths its calls
// name. Best-effort: the layout is Claude Code's, not the kit's; the heartbeat hook's own file wins wherever it is.
import { closeSync, fstatSync, openSync, readdirSync, readSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseJson, toJson } from './json.mts';

const TAIL = 256 * 1024;
const RECENT_MS = 60 * 60_000;   // a transcript untouched this long belongs to no live agent
const TREE = /\.claude\/worktrees\/([\w.-]+)/g;
const WHAT = ['description', 'file_path', 'command', 'pattern', 'path', 'url', 'prompt'] as const;

/** One transcript's last call: `event` is 'pre' while it has no result yet, else 'post'; `trees` the worktree names it names. */
export interface Call {
  t: string;
  event: 'pre' | 'post';
  tool: string;
  what: string;
  trees: string[];
  source: 'transcript';
}
/** The last calls by worktree name, and the lead's as `lead`. */
export type Beats = Record<string, Call>;

interface Block { type?: unknown; tool_use_id?: unknown; id?: unknown; name?: unknown; input?: unknown }
interface Line { message?: { content?: unknown } }

/** Claude Code's config folder for the caller's environment. */
export const claudeHome = (env: Readonly<Record<string, string | undefined>>): string => env.CLAUDE_CONFIG_DIR || join(env.HOME || homedir(), '.claude');

/** Where Claude Code keeps a project's sessions: its path with every character but a letter or digit made a dash. */
export const sessionsDir = (project: string, home: string): string => join(home, 'projects', project.replace(/[^A-Za-z0-9]/g, '-'));

function tailLines(file: string): string[] {
  let fd: number | undefined;
  try {
    fd = openSync(file, 'r');
    const size = fstatSync(fd).size;
    const buf = Buffer.alloc(Math.min(size, TAIL));
    readSync(fd, buf, 0, buf.length, size - buf.length);
    return buf.toString('utf8').split('\n');
  } catch { return []; } finally { if (fd !== undefined) closeSync(fd); }
}

const blocksOf = (line: string): Block[] => {
  const content = parseJson<Line>(line)?.message?.content;
  return Array.isArray(content) ? content : [];
};

/** What a call acts on, in a line: its first text field among WHAT. */
const whatOf = (input: unknown): string => {
  const fields = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  const text = WHAT.map((f) => fields[f]).find((v) => typeof v === 'string');
  return String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, 120);
};

/** One transcript's last call, or null when it has none. */
export function lastCall(file: string): Call | null {
  let mtime = 0;
  try { mtime = statSync(file).mtimeMs; } catch { return null; }
  let last: { id: unknown; tool: string; what: string } | null = null;
  const done = new Set<unknown>();
  const trees = new Map<string, number>();
  for (const line of tailLines(file)) {
    for (const c of blocksOf(line)) {
      if (c?.type === 'tool_result' && c.tool_use_id) done.add(c.tool_use_id);
      if (c?.type !== 'tool_use') continue;
      for (const [, name] of toJson(c.input ?? {}).matchAll(TREE)) if (name) trees.set(name, (trees.get(name) ?? 0) + 1);   // every path the call names, wherever it sits
      last = { id: c.id, tool: String(c.name), what: whatOf(c.input) };
    }
  }
  if (!last) return null;
  return { t: new Date(mtime).toISOString(), event: done.has(last.id) ? 'post' : 'pre', tool: last.tool, what: last.what,
    trees: [...trees].sort((a, b) => b[1] - a[1]).map(([name]) => name), source: 'transcript' };
}

const recent = (file: string, nowMs: number): boolean => { try { return nowMs - statSync(file).mtimeMs < RECENT_MS; } catch { return false; } };
const jsonlIn = (dir: string): string[] => { try { return readdirSync(dir).filter((f) => f.endsWith('.jsonl')).map((f) => join(dir, f)); } catch { return []; } };
const newest = (calls: readonly (Call | null)[]): Call | undefined =>
  calls.filter((c): c is Call => c !== null).sort((a, b) => Date.parse(b.t) - Date.parse(a.t))[0];

/** The project's live agents' last calls by worktree name, and the lead's as `lead`: { lead?, [worktree]: call }. */
export function transcriptBeats(project: string, { home, nowMs = Date.now() }: { home: string; nowMs?: number }): Beats {
  const dir = sessionsDir(project, home);
  const beats: Beats = {};
  const lead = newest(jsonlIn(dir).filter((f) => recent(f, nowMs)).map(lastCall));
  if (lead) beats.lead = lead;
  let sessions: string[] = [];
  try { sessions = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => join(dir, e.name, 'subagents')); } catch { /* none */ }
  for (const file of sessions.flatMap(jsonlIn).filter((f) => recent(f, nowMs))) {
    const call = lastCall(file);
    const tree = call?.trees[0];
    const held = tree === undefined ? undefined : beats[tree];
    if (call && tree !== undefined && (!held || Date.parse(call.t) > Date.parse(held.t))) beats[tree] = call;
  }
  return beats;
}
