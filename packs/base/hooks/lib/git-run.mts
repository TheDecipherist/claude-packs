// The one git runner (typescript order W2.5; the base-hooks and cli-lib surveys counted 22 definitions in 6 wrappers with 4
// signatures). One result type; the folder and the environment are the caller's, never the process's own, so a resident runner
// judging another session's event runs git where that event happened (review-2 8.5).
import { spawnSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { join } from 'node:path';

export interface GitResult {
  /** True when git exited 0. */
  ok: boolean;
  /** git's exit code; null when it could not start or was stopped. */
  status: number | null;
  /** What git printed, untrimmed. */
  stdout: string;
  stderr: string;
}

export interface GitIdentity { name: string; email: string }

export interface GitOptions {
  /** The folder git runs in. */
  cwd: string;
  /** The environment git runs with: the event's, never this process's by default. */
  env: Readonly<Record<string, string | undefined>>;
  /** Who commits, for a selftest's or a scratch repo's commits. */
  identity?: GitIdentity;
  /** Text on git's stdin. */
  input?: string;
  /** Stopped after this long (30 s by default). */
  timeoutMs?: number;
}

/** git with these arguments; never throws. */
export function gitRun(args: readonly string[], { cwd, env, identity, input, timeoutMs = 30_000 }: GitOptions): GitResult {
  const who = identity ? ['-c', `user.name=${identity.name}`, '-c', `user.email=${identity.email}`] : [];
  const r = spawnSync('git', [...who, ...args], { cwd, env, input, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 });
  return { ok: r.status === 0, status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? (r.error ? String(r.error.message) : '') };
}

/** git's trimmed output when it exited 0, else null. */
export function gitOut(args: readonly string[], options: GitOptions): string | null {
  const r = gitRun(args, options);
  return r.ok ? r.stdout.trim() : null;
}

/** The lines git printed, each as printed (a porcelain line's leading space kept), empty ones left out; none when it failed. */
export function gitLines(args: readonly string[], options: GitOptions): string[] {
  const r = gitRun(args, options);
  return r.ok ? r.stdout.split('\n').filter(Boolean) : [];
}

/** The text of each `<rev>:<path>` from one `git cat-file --batch`, one process for any number of files; null for one git does not
 *  hold (an untracked file, a new one). Read by bytes, so a file's multi-byte text is cut where git says it ends (KWB-next: a Stop
 *  hook paid one `git show` per file, 20 ms each). */
export function gitBlobs(specs: readonly string[], { cwd, env, timeoutMs = 30_000 }: GitOptions): Map<string, string | null> {
  const out = new Map<string, string | null>(specs.map((s) => [s, null]));
  if (!specs.length) return out;
  const input = specs.map((s) => `${s}\n`).join('');
  const r = spawnSync('git', ['cat-file', '--batch'], { cwd, env, input, timeout: timeoutMs, maxBuffer: 256 * 1024 * 1024 });
  const buf = r.stdout;
  if (r.status !== 0 || !buf) return out;
  let at = 0;
  for (const spec of specs) {
    const nl = buf.indexOf(0x0a, at);
    if (nl < 0) break;
    const head = /^\S+ (\S+) (\d+)$/.exec(buf.subarray(at, nl).toString('utf8'));
    at = nl + 1;
    if (!head) continue;   // "<spec> missing": git holds no such file
    const size = Number(head[2]);
    if (head[1] === 'blob') out.set(spec, buf.subarray(at, at + size).toString('utf8'));
    at += size + 1;
  }
  return out;
}

/** What git ignores under `root`, as `git ls-files` prints it: a folder whole with its trailing slash, a file by its path. Empty outside a
 *  repository or where git cannot run. A probe in an ignored scratch folder is no part of the project's code (supernova2_monitor WB-39, KWB-next). */
export function ignoredPaths(root: string, env: Readonly<Record<string, string | undefined>>, now = Date.now()): Set<string> {
  // kept per checkout until its .gitignore or its repository changes, or IGNORED_KEPT_MS passes: every index rebuild asked git (20 to 30 ms), and each write
  // rebuilds the index, so the next Write's hooks waited for it (KWB-next)
  const stamp = `${stampOf(join(root, '.gitignore'))}:${stampOf(join(root, '.git'))}`;
  const kept = IGNORED_KEPT.get(root);
  if (kept && kept.stamp === stamp && now - kept.at < IGNORED_KEPT_MS) return kept.set;
  const r = gitRun(['ls-files', '--others', '--ignored', '--exclude-standard', '--directory'], { cwd: root, env });
  const set = new Set(r.ok ? r.stdout.split('\n').map((l) => l.trim()).filter(Boolean) : []);
  IGNORED_KEPT.set(root, { stamp, at: now, set });
  return set;
}

/** How long a checkout's ignored list is kept when its .gitignore has not changed (a nested .gitignore's change waits this long). */
const IGNORED_KEPT_MS = 60_000;
const IGNORED_KEPT = new Map<string, { stamp: string; at: number; set: Set<string> }>();
const stampOf = (path: string): number => { try { return statSync(path).mtimeMs; } catch { return -1; } };
