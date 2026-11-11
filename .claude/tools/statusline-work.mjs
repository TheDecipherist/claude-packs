// The status line's second line (1.8.0): the branch, its uncommitted files and how far it is ahead of or behind its
// upstream, then the session's last tool with its target and its last shell command. Those two come from the session's own
// transcript (its path is on stdin), read from the end, so no hook has to record them.
import { execFileSync } from 'node:child_process';
import { closeSync, fstatSync, openSync, readSync } from 'node:fs';
import { parseJson } from '../hooks/lib/json.mjs';

const TAIL_BYTES = 256 * 1024;

function git(args, cwd) {
  // --no-optional-locks: a status line runs every second and must never take index.lock from a commit
  try { return execFileSync('git', ['--no-optional-locks', '-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; }
}

/** { branch, uncommitted, ahead, behind }, or {} outside a repo. */
export function gitState(cwd) {
  const branch = git(['branch', '--show-current'], cwd);
  if (branch === null) return {};
  const uncommitted = (git(['status', '--porcelain'], cwd) ?? '').split('\n').filter((l) => l.trim()).length;
  const [behind, ahead] = (git(['rev-list', '--left-right', '--count', '@{u}...HEAD'], cwd) ?? '').split(/\s+/).map(Number);
  return { branch, uncommitted, ahead: ahead || 0, behind: behind || 0 };
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
