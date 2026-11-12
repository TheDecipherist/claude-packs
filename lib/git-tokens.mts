// Doctor's token sweep (Sub37 WB-3): every git repo that belongs to the project, its nested clones
// (build/_deps, vendored repos) and the repos in its sibling folders, has its .git/config read for
// a URL that carries a secret or a bare GitHub token. The token itself is never printed.
import { existsSync, readdirSync, realpathSync } from 'node:fs';
import type { Dirent } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { isDir, readText, slash } from '../packs/base/hooks/lib/files.mts';

const SECRET_URL = /\b[a-z][\w+.-]*:\/\/([^\s/@'"]+)@\S*/gi;
const SECRET_USER = /:|^(gh[pousr]_|github_pat_|glpat-|x-access-token|oauth2)/i;
const BARE = /\b(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_\w{20,})\b/;
const SKIP = /^(node_modules|\.git|worktrees|\.claude-packs-backup)$/;

/** The config file a repo reads: its own .git/config, or the common one of a linked worktree; null when it has no .git. */
function configOf(dir: string): string | null {
  const dotGit = join(dir, '.git');
  if (isDir(dotGit)) return join(dotGit, 'config');
  const pointer = readText(dotGit)?.match(/^gitdir:\s*(.+)$/m)?.[1];
  if (pointer === undefined) return null;
  const gitdir = resolve(dir, pointer.trim());
  const common = readText(join(gitdir, 'commondir'));
  return join(common === null ? gitdir : resolve(gitdir, common.trim()), 'config');
}

/** Every folder holding a .git under `dir`, down to `depth` levels (a bounded search of folders: walk lists every file, with no limit). */
function repos(dir: string, depth: number, out: string[]): void {
  if (existsSync(join(dir, '.git'))) out.push(dir);
  if (depth === 0) return;
  let entries: Dirent[] = [];
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) if (e.isDirectory() && !SKIP.test(e.name)) repos(join(dir, e.name), depth - 1, out);
}

/** The lines of a git config that hold a secret, masked: `key = url` with the credentials hidden, or a bare token named. */
export function findings(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split('\n')) {
    const url = [...line.matchAll(SECRET_URL)].find((m) => SECRET_USER.test(m[1] ?? ''));
    if (url) out.push(`${line.trim().split(/\s*=/)[0]} = ${url[0].replace(/:\/\/[^@]+@/, '://***@')}`);
    else if (BARE.test(line)) out.push(`${line.trim().split(/\s*=/)[0]} = (a GitHub token)`);
  }
  return out;
}

/** One problem per repo of the project (nested, or in a sibling folder) whose .git/config holds a token. */
export function tokenProblems(projectDir: string, siblings: readonly string[] = []): string[] {
  const found: string[] = [];
  repos(projectDir, 4, found);
  for (const s of siblings) {
    const dir = resolve(projectDir, s);
    if (!existsSync(dir)) continue;
    if (existsSync(join(dir, '.git'))) found.push(dir);
    else repos(dir, 1, found);
  }
  const seen = new Set<string>();
  const problems: string[] = [];
  for (const dir of found) {
    const cfg = configOf(dir);
    if (!cfg || !existsSync(cfg)) continue;
    const real = realpathSync(cfg);
    if (seen.has(real)) continue;
    seen.add(real);
    const hits = findings(readText(cfg) ?? '');
    const name = slash(relative(projectDir, join(dir, '.git', 'config')));
    if (hits.length) problems.push(`${name} holds a token (${hits.join('; ')}); set the URL back to the plain one and rotate the token`);
  }
  return problems;
}
