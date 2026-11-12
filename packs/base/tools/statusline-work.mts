// The status line's second line (1.8.0): the branch, its uncommitted files and how far it is ahead of or behind its
// upstream, then the session's last tool with its target and its last shell command. Those two come from the session's own
// transcript (its path is on stdin), read from the end, so no hook has to record them.
import { closeSync, fstatSync, openSync, readFileSync, readSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { gitOut } from '../hooks/lib/git-run.mts';
import { shortHash } from '../hooks/lib/hash.mts';
import { parseJson, readJson, writeJson } from '../hooks/lib/json.mts';
import { oneLine, targetOf } from '../hooks/lib/tool-target.mts';
import type { Colours, Paint } from './statusline-paint.mts';

const TAIL_BYTES = 256 * 1024;

/** `git status --porcelain=v2 --branch` read. */
export interface GitState { branch?: string; uncommitted?: number; ahead?: number; behind?: number }
/** What a transcript says of the session's last tool call and last shell command. */
export interface Activity { tool?: string; target?: string; command?: string }
/** Asks git, in a folder: its trimmed output, or null when it failed. */
export type GitAsk = (args: readonly string[], cwd: string) => string | null;
export interface GitStateOptions {
  cacheDir?: string;
  nowMs?: number;
  run?: GitAsk;
  /** The environment git runs with, when `run` is not given. */
  env?: Readonly<Record<string, string | undefined>>;
}

/** `git status --porcelain=v2 --branch` read: { branch, uncommitted, ahead, behind }. */
export function parseStatusV2(text: string): Required<GitState> {
  const head = text.match(/^# branch\.head (.+)$/m)?.[1];
  const ab = text.match(/^# branch\.ab \+(\d+) -(\d+)$/m);
  return { branch: head && head !== '(detached)' ? head : '', uncommitted: text.split('\n').filter((l) => l && !l.startsWith('#')).length,
    ahead: Number(ab?.[1] ?? 0), behind: Number(ab?.[2] ?? 0) };
}

/** The repo's own git folder from a working folder: `.git` itself, or the folder a worktree's `.git` file names. */
function gitDirOf(cwd: string): string | null {
  for (let d = cwd; d && d !== dirname(d); d = dirname(d)) {
    const dot = join(d, '.git');
    try {
      if (statSync(dot).isDirectory()) return dot;
      return readFileSync(dot, 'utf8').match(/^gitdir: (.+)$/m)?.[1]?.trim() ?? null;
    } catch { /* not here: the folder above */ }
  }
  return null;
}

const CACHE_MS = 30_000;   // KWB-152: the bar runs every second; on a Mac a git call costs ~0.1 s, so an unchanged repo is not asked

interface CachedState { stamp: string; at: number; state: GitState }

/** { branch, uncommitted, ahead, behind }, or {} outside a repo: one git call (it was three), and none while the repo's index,
 *  HEAD and fetched refs are as they were at the last call, for up to 30 s. --no-optional-locks: a status line runs every
 *  second and must never take index.lock from a commit. */
export function gitState(cwd: string, { cacheDir = tmpdir(), nowMs = Date.now(), env = process.env, run }: GitStateOptions = {}): GitState {
  const ask: GitAsk = run ?? ((args, where) => gitOut(['--no-optional-locks', ...args], { cwd: where, env }));
  const gitDir = gitDirOf(cwd);
  if (!gitDir) return {};
  const stamp = ['index', 'HEAD', 'FETCH_HEAD', 'logs/HEAD'].map((f) => { try { return statSync(join(gitDir, f)).mtimeMs; } catch { return 0; } }).join(':');
  const file = join(cacheDir, `claude-packs-statusline-git-${shortHash(cwd, 12)}.json`);
  const cached = readJson<CachedState>(file);
  if (cached?.stamp === stamp && nowMs - cached.at < CACHE_MS) return cached.state;
  const text = ask(['status', '--porcelain=v2', '--branch', '--untracked-files=normal'], cwd);
  if (text === null) return {};
  const state = parseStatusV2(text);
  writeJson(file, { stamp, at: nowMs, state });
  return state;
}

function tailOf(file: string): string {
  let fd: number | undefined;
  try {
    fd = openSync(file, 'r');
    const size = fstatSync(fd).size;
    const length = Math.min(size, TAIL_BYTES);
    const buf = Buffer.alloc(length);
    readSync(fd, buf, 0, length, size - length);
    return buf.toString('utf8');
  } catch { return ''; } finally { if (fd !== undefined) closeSync(fd); }
}

/** One transcript line, as far as the bar reads it. */
interface TranscriptLine { message?: { content?: unknown } }
interface ToolUse { type?: unknown; name?: unknown; input?: Record<string, unknown> | null }

/** The last tool call in the transcript, { tool, target, command }: command is the last shell command, wherever it was. */
export function lastActivity(transcript: string | undefined): Activity {
  const found: Activity = {};
  const lines = transcript ? tailOf(transcript).split('\n') : [];
  for (let i = lines.length - 1; i >= 0 && !(found.tool && found.command); i -= 1) {
    const content = parseJson<TranscriptLine>(lines[i])?.message?.content;   // the first line of a tail is cut: null, and skipped
    if (!Array.isArray(content)) continue;
    const uses = [...(content as unknown[])].reverse().filter((x): x is ToolUse => typeof x === 'object' && x !== null && (x as ToolUse).type === 'tool_use');
    for (const c of uses) {
      const input = c.input ?? {};
      const name = typeof c.name === 'string' ? c.name : undefined;
      if (!found.tool) {
        found.tool = name;
        found.target = targetOf(input);
      }
      if (!found.command && name === 'Bash') found.command = oneLine(input.command);
    }
  }
  return found;
}

const shortPath = (p: string): string => { const parts = p.split('/').filter(Boolean); return parts.length <= 5 ? p : `…/${parts.slice(-5).join('/')}`; };

export function gitSegment(g: GitState, paint: Paint, C: Colours): string {
  if (!g.branch) return '';
  return `${paint('⎇', C.dim)} ${paint(g.branch, C.green)}${g.uncommitted ? ` ${paint(`✱${g.uncommitted}`, C.amber)}` : ''}` +
    (g.ahead || g.behind ? ` ${paint(`↑${g.ahead ?? 0}↓${g.behind ?? 0}`, C.dim)}` : '');
}

export function activitySegments(a: Activity, paint: Paint, C: Colours): string[] {
  const out: string[] = [];
  if (a.tool) out.push(paint(a.tool, C.teal) + (a.target ? ` ${paint(shortPath(a.target), C.dim)}` : ''));
  if (a.command) out.push(`${paint('$', C.dim)} ${paint(a.command, C.orange)}`);
  return out;
}
