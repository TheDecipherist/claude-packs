// The status line's second line (1.8.0): the branch, its uncommitted files and how far it is ahead of or behind its
// upstream, then the session's last tool with its target and its last shell command. Those two come from the session's own
// transcript (its path is on stdin), read from the end, so no hook has to record them.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, fstatSync, openSync, readFileSync, readSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { parseJson, readJson, writeJson } from '../hooks/lib/json.mjs';

const TAIL_BYTES = 256 * 1024;

function git(args, cwd) {
  // --no-optional-locks: a status line runs every second and must never take index.lock from a commit
  try { return execFileSync('git', ['--no-optional-locks', '-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; }
}

/** `git status --porcelain=v2 --branch` read: { branch, uncommitted, ahead, behind }. */
export function parseStatusV2(text) {
  const head = text.match(/^# branch\.head (.+)$/m)?.[1];
  const ab = text.match(/^# branch\.ab \+(\d+) -(\d+)$/m);
  return { branch: head && head !== '(detached)' ? head : '', uncommitted: text.split('\n').filter((l) => l && !l.startsWith('#')).length,
    ahead: Number(ab?.[1] ?? 0), behind: Number(ab?.[2] ?? 0) };
}

/** The repo's own git folder from a working folder: `.git` itself, or the folder a worktree's `.git` file names. */
function gitDirOf(cwd) {
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

/** { branch, uncommitted, ahead, behind }, or {} outside a repo: one git call (it was three), and none while the repo's index,
 *  HEAD and fetched refs are as they were at the last call, for up to 30 s. */
export function gitState(cwd, { cacheDir = tmpdir(), nowMs = Date.now(), run = git } = {}) {
  const gitDir = gitDirOf(cwd);
  if (!gitDir) return {};
  const stamp = ['index', 'HEAD', 'FETCH_HEAD', 'logs/HEAD'].map((f) => { try { return statSync(join(gitDir, f)).mtimeMs; } catch { return 0; } }).join(':');
  const file = join(cacheDir, `claude-packs-statusline-git-${createHash('sha1').update(cwd).digest('hex').slice(0, 12)}.json`);
  const cached = readJson(file);
  if (cached?.stamp === stamp && nowMs - cached.at < CACHE_MS) return cached.state;
  const text = run(['status', '--porcelain=v2', '--branch', '--untracked-files=normal'], cwd);
  if (text === null) return {};
  const state = parseStatusV2(text);
  writeJson(file, { stamp, at: nowMs, state });
  return state;
}

function tailOf(file) {
  let fd;
  try {
    fd = openSync(file, 'r');
    const size = fstatSync(fd).size;
    const length = Math.min(size, TAIL_BYTES);
    const buf = Buffer.alloc(length);
    readSync(fd, buf, 0, length, size - length);
    return buf.toString('utf8');
  } catch { return ''; } finally { if (fd !== undefined) closeSync(fd); }
}

const oneLine = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');
const TARGET_FIELDS = ['file_path', 'notebook_path', 'path', 'url', 'pattern', 'query', 'description'];

/** The last tool call in the transcript, { tool, target, command }: command is the last shell command, wherever it was. */
export function lastActivity(transcript) {
  const found = {};
  const lines = transcript ? tailOf(transcript).split('\n') : [];
  for (let i = lines.length - 1; i >= 0 && !(found.tool && found.command); i -= 1) {
    const content = parseJson(lines[i])?.message?.content;   // the first line of a tail is cut: null, and skipped
    if (!Array.isArray(content)) continue;
    for (const c of [...content].reverse().filter((x) => x?.type === 'tool_use')) {
      const input = c.input ?? {};
      if (!found.tool) Object.assign(found, { tool: c.name, target: oneLine(TARGET_FIELDS.map((f) => input[f]).find((v) => typeof v === 'string')) });
      if (!found.command && c.name === 'Bash') found.command = oneLine(input.command);
    }
  }
  return found;
}

const shortPath = (p) => { const parts = p.split('/').filter(Boolean); return parts.length <= 5 ? p : `…/${parts.slice(-5).join('/')}`; };

export function gitSegment(g, paint, C) {
  if (!g.branch) return '';
  return `${paint('⎇', C.dim)} ${paint(g.branch, C.green)}${g.uncommitted ? ` ${paint(`✱${g.uncommitted}`, C.amber)}` : ''}` +
    (g.ahead || g.behind ? ` ${paint(`↑${g.ahead}↓${g.behind}`, C.dim)}` : '');
}

export function activitySegments(a, paint, C) {
  const out = [];
  if (a.tool) out.push(paint(a.tool, C.teal) + (a.target ? ` ${paint(shortPath(a.target), C.dim)}` : ''));
  if (a.command) out.push(`${paint('$', C.dim)} ${paint(a.command, C.orange)}`);
  return out;
}
