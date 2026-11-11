// secrets-guard (PreToolUse, Write|Edit|MultiEdit|NotebookEdit|Bash): a secret never lands in git (KWB-33; STEP 3: ".env
// never committed"). Refused, by every write route (lib/writes.mts) and on `git add`:
//   1. staging a secret file: `git add` (with -f too) of a .env (.env.example, .sample, .template and .dist are fine), a key
//      file (*.pem, *.key, *.p12, *.pfx, *.jks, *.keystore, id_rsa and its kin) or credentials.json; and `git add -A` / `.` /
//      `--all` / a folder while such a file in the checkout is not ignored;
//   2. a write that ADDS a literal secret to any file but an ignored .env: a GitHub, Anthropic, OpenAI, AWS, Slack or Stripe
//      key, a private key block, a connection string carrying its password (a ${VAR} or $VAR in its place is fine);
//   3. writing a .env that git does not ignore (add `.env` to .gitignore first).
// A token is named on the command that uses it ($PERSONAL_GITHUB_TOKEN), never written. Another project's files are not judged.
//   node secrets-guard.mjs --selftest
// A judge on the hook contract (typescript order W4). The CLI's scan reads SECRETS and isSecretFile from here (re-exported;
// the file-name test lives with the patterns, lib/secret-patterns.mts).
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { readText } from './lib/files.mts';
import { gitAdds } from './lib/git-adds.mts';
import { gitLines, gitRun } from './lib/git-run.mts';
import { isMain, runAsHook } from './lib/hook-log.mts';
import { checkoutRoot } from './lib/project.mts';
import { SECRETS, isEnvFile, isSecretFile } from './lib/secret-patterns.mts';
import { bashOf, git, put, runHook, scratchProject, snapshot, verdicts, writeOf, writtenSince } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { FileWrite, Hook, HookContext } from './lib/types.d.mts';
import { judgeVerdict } from './lib/writes.mts';
import { fileURLToPath } from 'node:url';

export { SECRETS, isSecretFile };
const count = (text: string, re: RegExp): number => (text.match(re) ?? []).length;
/** The name of the kind of secret a write adds to a file (more of it after than before), or null. */
export const addedSecret = (before: string | null, after: string): string | null => SECRETS.find(([, re]) => count(after, re) > count(before ?? '', re))?.[0] ?? null;

const IGNORES_ENV = /^\/?(\.env\*?|\.env\.\*|\*\.env|\.env\/?)\s*$/;
function ignored(root: string, path: string, env: HookContext['env']): boolean {
  const r = gitRun(['check-ignore', '-q', relative(root, path)], { cwd: root, env });
  if (r.status === 0 || r.status === 1) return r.status === 0;
  const gi = join(root, '.gitignore');   // not a git repo: read .gitignore
  return existsSync(gi) && (readText(gi) ?? '').split('\n').some((l) => IGNORES_ENV.test(l.trim()));
}

function judgeWrite(w: FileWrite, ctx: HookContext): string | null {
  const root = checkoutRoot(ctx.projectDir, w.path, ctx.cwd);
  if (isEnvFile(w.path)) return ignored(root, w.path, ctx.env) ? null : `${relative(root, w.path)} is a .env file git does not ignore. Add \`.env\` (and \`.env.*\`, with !.env.example) to .gitignore first; a .env is never committed.`;
  if (w.after === null) return null;
  const what = addedSecret(w.before, w.after);
  if (!what) return null;
  return `this write puts ${what} into ${relative(root, w.path)}. ` +
    "A secret lives in an ignored .env (or the machine's own store) and is read at run time; code reads it by name (process.env.X), a command names it ($X). Take the value out.";
}

// `git add` of a secret file by name, or a sweep (-A, ., --all, a folder) while one is not ignored.
function stagedSecretFault(command: string, cwd: string, ctx: HookContext): string | null {
  for (const { dir, args: raw } of gitAdds(command, cwd)) {
    const args = raw.filter((a) => !a.startsWith('-') || ['-A', '--all'].includes(a));
    const named = args.find((a) => isSecretFile(a));
    if (named) return `\`git add ${named}\`: a secret file is never staged (.env, keys, credentials). Keep it ignored; commit a .env.example with the names and no values.`;
    if (args.some((a) => ['-A', '--all', '.', '*'].includes(a) || a.endsWith('/'))) {
      const loose = gitLines(['ls-files', '--others', '--exclude-standard'], { cwd: dir, env: ctx.env }).filter((f) => isSecretFile(f));
      if (loose.length) return `this \`git add\` would stage ${loose.join(', ')}, a secret file git does not ignore. Add it to .gitignore first, then stage by path.`;
    }
  }
  return null;
}

export const hook: Hook = (event, ctx) => judgeVerdict(event, {
  name: 'secrets-guard',
  command: (command, cwd) => stagedSecretFault(command, cwd, ctx),
  write: (w) => (w.op === 'delete' ? null : judgeWrite(w, ctx)),
}, ctx);

/** A .env is judged by the checkout it is in: the worktree ignores it, main (in this case) does not, and `git -C <worktree> add` is refused. */
export const worktreeCase: WorktreeCase = {
  files: { '{wt}/.gitignore': '.env\n' },
  steps: [
    { label: 'a .env the worktree ignores', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/.env', content: 'A=1\n' } }, want: 0 },
    { label: 'a .env main does not ignore', event: { tool_name: 'Write', tool_input: { file_path: '{here}/.env', content: 'A=1\n' } }, want: 2 },
    { label: 'git -C <worktree> add of the .env', event: { tool_name: 'Bash', tool_input: { command: 'git -C {wt} add .env' } }, want: 2 },
  ],
};

export function selftest(): number {
  const hookFile = fileURLToPath(import.meta.url);
  const gh = `gh${'p'}_${'a1B2'.repeat(9)}`;   // built here, so this file holds no token
  const pem = `-----BEGIN RSA ${'PRIVATE'} KEY-----`;
  const dsn = ['mongodb+srv:', '//user:hunter22@c0.x.net/db'].join('');   // built here too: no connection string with a password in this file
  const dir = scratchProject({ '.gitignore': '.env\n', 'src/app.ts': 'export const x = 1;\n', 'src/old.ts': `const t = '${gh}';\nconst x = 1;\n` });
  git(dir, 'init', '-q');
  const open = scratchProject({ 'src/app.ts': '\n' });
  git(open, 'init', '-q');
  put(join(open, '.env'), '');   // loose in `open`, where git does not ignore it; ignored in `dir`
  put(join(dir, '.env'), '');
  const [dirBefore, openBefore] = [snapshot(dir), snapshot(open)];   // the projects as the judge finds them
  const run = (d: string, payload: unknown): number | null => runHook(hookFile, d, payload).status;
  const cases = [
    ['a GitHub token written into source', run(dir, writeOf(join(dir, 'src/app.ts'), `const t = '${gh}';\n`)), 2],
    ['a private key written into a doc', run(dir, writeOf(join(dir, 'docs/key.md'), `${pem}\n${'MIIEvQIBADANBgkqhkiG9w0BAQEFAASC'.repeat(3)}\n`)), 2],
    ['a bare header in a doc is a placeholder', run(dir, writeOf(join(dir, 'docs/format.md'), `${pem}\n...\n`)), 0],
    ['a connection string with its password', run(dir, writeOf(join(dir, 'src/db.ts'), `const u = '${dsn}';\n`)), 2],
    ['a connection string that names its password ($VAR)', run(dir, writeOf(join(dir, 'src/db.ts'), 'const u = `mongodb+srv://user:${process.env.PW}@c0.x.net/db`;\n')), 0],
    ['code that reads the token by name', run(dir, writeOf(join(dir, 'src/app.ts'), 'const t = process.env.GITHUB_TOKEN;\n')), 0],
    ['the token into an ignored .env', run(dir, writeOf(join(dir, '.env'), `GITHUB_TOKEN=${gh}\n`)), 0],
    ['a .env git does not ignore', run(open, writeOf(join(open, '.env'), 'A=1\n')), 2],
    ['a .env.example with names only', run(open, writeOf(join(open, '.env.example'), 'GITHUB_TOKEN=\n')), 0],
    ['git add .env', run(dir, bashOf('git add .env src/app.ts', dir)), 2],
    ['git add -f of a key file', run(dir, bashOf('git add -f deploy/server.pem', dir)), 2],
    ['git add by path, no secret', run(dir, bashOf('git add src/app.ts', dir)), 0],
    ['git add -A while a .env is not ignored', run(open, bashOf('git add -A', open)), 2],
    ['git add -A while the .env is ignored', run(dir, bashOf('git add -A', dir)), 0],
    ['an edit beside a token already there adds none', run(dir, { tool_name: 'Edit', tool_input: { file_path: join(dir, 'src/old.ts'), old_string: 'x = 1', new_string: 'x = 2' } }), 0],
    ['git -C <dir> add of a .env', run(dir, bashOf(`git -C ${dir} add .env`, dir)), 2],
    ['a judge writes no file (the write trap)', [...writtenSince(dir, dirBefore), ...writtenSince(open, openBefore)].join(','), ''],
  ] as const;
  return verdicts('secrets-guard', cases);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'secrets-guard', hook, selftest);
