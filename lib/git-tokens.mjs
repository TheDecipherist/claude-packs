// Doctor's token sweep (Sub37 WB-3): every git repo that belongs to the project, its nested clones
// (build/_deps, vendored repos) and the repos in its sibling folders, has its .git/config read for
// a URL that carries a secret or a bare GitHub token. The token itself is never printed.
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const SECRET_URL = /\b[a-z][\w+.-]*:\/\/([^\s/@'"]+)@\S*/gi;
const SECRET_USER = /:|^(gh[pousr]_|github_pat_|glpat-|x-access-token|oauth2)/i;
const BARE = /\b(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_\w{20,})\b/;
const SKIP = /^(node_modules|\.git|worktrees|\.claude-packs-backup)$/;

function configOf(dir) {
  const dotGit = join(dir, '.git');
  try {
    if (statSync(dotGit).isDirectory()) return join(dotGit, 'config');
    const gitdir = resolve(dir, readFileSync(dotGit, 'utf8').match(/^gitdir:\s*(.+)$/m)[1].trim());
    const common = existsSync(join(gitdir, 'commondir')) ? resolve(gitdir, readFileSync(join(gitdir, 'commondir'), 'utf8').trim()) : gitdir;
    return join(common, 'config');
  } catch {
    return null;
  }
}

function repos(dir, depth, out) {
  if (existsSync(join(dir, '.git'))) out.push(dir);
  if (depth === 0) return;
  let entries = [];
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) if (e.isDirectory() && !SKIP.test(e.name)) repos(join(dir, e.name), depth - 1, out);
}

export function findings(text) {
  const out = [];
  for (const line of text.split('\n')) {
    const url = [...line.matchAll(SECRET_URL)].find((m) => SECRET_USER.test(m[1]));
    if (url) out.push(`${line.trim().split(/\s*=/)[0]} = ${url[0].replace(/:\/\/[^@]+@/, '://***@')}`);
    else if (BARE.test(line)) out.push(`${line.trim().split(/\s*=/)[0]} = (a GitHub token)`);
  }
  return out;
}

export function tokenProblems(projectDir, siblings = []) {
  const found = [];
  repos(projectDir, 4, found);
  for (const s of siblings) {
    const dir = resolve(projectDir, s);
    if (!existsSync(dir)) continue;
    if (existsSync(join(dir, '.git'))) found.push(dir);
    else repos(dir, 1, found);
  }
  const seen = new Set();
  const problems = [];
  for (const dir of found) {
    const cfg = configOf(dir);
    if (!cfg || !existsSync(cfg)) continue;
    const real = realpathSync(cfg);
    if (seen.has(real)) continue;
    seen.add(real);
    const hits = findings(readFileSync(cfg, 'utf8'));
    const name = relative(projectDir, join(dir, '.git', 'config')).replace(/\\/g, '/');
    if (hits.length) problems.push(`${name} holds a token (${hits.join('; ')}); set the URL back to the plain one and rotate the token`);
  }
  return problems;
}
