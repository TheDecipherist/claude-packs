// What the ab-* scripts share (W11.0): a command-line flag's value, and git run in a repository without throwing.
import { execFileSync } from 'node:child_process';

/** The value after a flag, or null when the flag is absent or last. */
export function flag(name: string, argv: string[] = process.argv): string | null {
  const at = argv.indexOf(name);
  return at === -1 ? null : (argv[at + 1] ?? null);
}

/** Git's stdout in a repository, trimmed at the end; '' when git fails (a missing ref is an answer, not a crash). */
export function git(repo: string, args: string[]): string {
  try { return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trimEnd(); } catch { return ''; }
}

/** Whether git exits 0 for these arguments. */
export function gitOk(repo: string, args: string[]): boolean {
  try { execFileSync('git', ['-C', repo, ...args], { stdio: 'ignore' }); return true; } catch { return false; }
}
