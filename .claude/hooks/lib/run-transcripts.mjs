// Each agent's last call, read from Claude Code's own transcripts (1.8.2), for a project with no heartbeat hook yet: the
// Mac's run was busy, its agents calling every few seconds, and the status line showed nothing (the user: "status bar is
// still not really showing anything running on the mac at all"). Claude Code keeps a project's sessions in
// ~/.claude/projects/<the project's path, every other character a dash>/: the lead's as <session>.jsonl, each agent's as
// <session>/subagents/agent-<id>.jsonl. An agent's transcript is matched to its worktree by the worktree paths its calls
// name. Best-effort: the layout is Claude Code's, not the kit's; the heartbeat hook's own file wins wherever it is.
import { closeSync, fstatSync, openSync, readdirSync, readSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseJson, toJson } from './json.mjs';

const TAIL = 256 * 1024;
const RECENT_MS = 60 * 60_000;   // a transcript untouched this long belongs to no live agent
const TREE = /\.claude\/worktrees\/([\w.-]+)/g;
const WHAT = ['description', 'file_path', 'command', 'pattern', 'path', 'url', 'prompt'];

export const claudeHome = (env = process.env) => env.CLAUDE_CONFIG_DIR || join(env.HOME || homedir(), '.claude');

/** Where Claude Code keeps a project's sessions: its path with every character but a letter or digit made a dash. */
export const sessionsDir = (project, home = claudeHome()) => join(home, 'projects', project.replace(/[^A-Za-z0-9]/g, '-'));

function tailLines(file) {
  let fd;
  try {
    fd = openSync(file, 'r');
    const size = fstatSync(fd).size;
    const buf = Buffer.alloc(Math.min(size, TAIL));
    readSync(fd, buf, 0, buf.length, size - buf.length);
    return buf.toString('utf8').split('\n');
  } catch { return []; } finally { if (fd !== undefined) closeSync(fd); }
}

/** One transcript's last call: { t, event: 'pre' while it has no result yet, else 'post', tool, what, trees: [worktree names] }. */
export function lastCall(file) {
  let mtime = 0;
  try { mtime = statSync(file).mtimeMs; } catch { return null; }
  let last = null;
  const done = new Set();
  const trees = new Map();
  for (const line of tailLines(file)) {
    for (const c of parseJson(line)?.message?.content ?? []) {
      if (c?.type === 'tool_result' && c.tool_use_id) done.add(c.tool_use_id);
      if (c?.type !== 'tool_use') continue;
      const input = c.input ?? {};
      for (const [, name] of toJson(input).matchAll(TREE)) trees.set(name, (trees.get(name) ?? 0) + 1);   // every path the call names, wherever it sits
      last = { id: c.id, tool: c.name, what: String(WHAT.map((f) => input[f]).find((v) => typeof v === 'string') ?? '').replace(/\s+/g, ' ').trim().slice(0, 120) };
    }
  }
  if (!last) return null;
  return { t: new Date(mtime).toISOString(), event: done.has(last.id) ? 'post' : 'pre', tool: last.tool, what: last.what,
    trees: [...trees].sort((a, b) => b[1] - a[1]).map(([name]) => name), source: 'transcript' };
}

const recent = (file, nowMs) => { try { return nowMs - statSync(file).mtimeMs < RECENT_MS; } catch { return false; } };
const jsonlIn = (dir) => { try { return readdirSync(dir).filter((f) => f.endsWith('.jsonl')).map((f) => join(dir, f)); } catch { return []; } };

/** The project's live agents' last calls by worktree name, and the lead's as `lead`: { lead?, [worktree]: call }. */
export function transcriptBeats(project, { home = claudeHome(), nowMs = Date.now() } = {}) {
  const dir = sessionsDir(project, home);
  const beats = {};
  const newest = (calls) => calls.filter(Boolean).sort((a, b) => Date.parse(b.t) - Date.parse(a.t))[0];
  beats.lead = newest(jsonlIn(dir).filter((f) => recent(f, nowMs)).map(lastCall));
  let sessions = [];
  try { sessions = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => join(dir, e.name, 'subagents')); } catch { /* none */ }
  for (const file of sessions.flatMap(jsonlIn).filter((f) => recent(f, nowMs))) {
    const call = lastCall(file);
    const tree = call?.trees[0];
    if (tree && (!beats[tree] || Date.parse(call.t) > Date.parse(beats[tree].t))) beats[tree] = call;
  }
  if (!beats.lead) delete beats.lead;
  return beats;
}
