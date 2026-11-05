#!/usr/bin/env node
// secrets-guard (PreToolUse, Write|Edit|MultiEdit|NotebookEdit|Bash): a secret never lands in git (KWB-33; STEP 3: ".env
// never committed"). Refused, by every write route (lib/writes.mjs) and on `git add`:
//   1. staging a secret file: `git add` (with -f too) of a .env (.env.example, .sample, .template and .dist are fine), a key
//      file (*.pem, *.key, *.p12, *.pfx, *.jks, *.keystore, id_rsa and its kin) or credentials.json; and `git add -A` / `.` /
//      `--all` / a folder while such a file in the checkout is not ignored;
//   2. a write that ADDS a literal secret to any file but an ignored .env: a GitHub, Anthropic, OpenAI, AWS, Slack or Stripe
//      key, a private key block, a connection string carrying its password (a ${VAR} or $VAR in its place is fine);
//   3. writing a .env that git does not ignore (add `.env` to .gitignore first).
// A token is named on the command that uses it ($PERSONAL_GITHUB_TOKEN), never written. Another project's files are not judged.
//   node secrets-guard.mjs --selftest
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { judgeEvent } from './lib/writes.mjs';
import { checkoutRoot } from './lib/project.mjs';
import { bashOf, git, runHook, scratchProject, verdicts, writeOf } from './lib/selftest.mjs';
import { gitAdds } from './lib/git-adds.mjs';
import { SECRETS } from './lib/secret-patterns.mjs';
import { asHook, isMain } from './lib/hook-log.mjs';

const ENV = /^\.env(\..+)?$/;
const ENV_OK = /\.(example|sample|template|dist)$/;
const KEY = /\.(pem|key|private|p12|pfx|jks|keystore)$|^id_(rsa|dsa|ecdsa|ed25519)$|^credentials\.json$/;
export const isSecretFile = (p) => { const b = basename(p); return (ENV.test(b) && !ENV_OK.test(b)) || KEY.test(b); };
const isEnv = (p) => ENV.test(basename(p)) && !ENV_OK.test(basename(p));

export { SECRETS };
const count = (text, re) => (text.match(re) ?? []).length;
export const addedSecret = (before, after) => SECRETS.find(([, re]) => count(after, re) > count(before ?? '', re))?.[0] ?? null;

function ignored(root, path) {
  const r = spawnSync('git', ['check-ignore', '-q', relative(root, path)], { cwd: root });
  if (r.status === 0 || r.status === 1) return r.status === 0;
  const gi = join(root, '.gitignore');   // not a git repo: read .gitignore
  return existsSync(gi) && readFileSync(gi, 'utf8').split('\n').some((l) => /^\/?(\.env\*?|\.env\.\*|\*\.env|\.env\/?)\s*$/.test(l.trim()) && ENV.test(basename(path)));
}

function judgeWrite(w) {
  const root = checkoutRoot(w.path);
  if (isEnv(w.path)) return ignored(root, w.path) ? null : `${relative(root, w.path)} is a .env file git does not ignore. Add \`.env\` (and \`.env.*\`, with !.env.example) to .gitignore first; a .env is never committed.`;
  if (w.after === null) return null;
  const what = addedSecret(w.before, w.after);
  return what ? `this write puts ${what} into ${relative(root, w.path)}. A secret lives in an ignored .env (or the machine's own store) and is read at run time; code reads it by name (process.env.X), a command names it ($X). Take the value out.` : null;
}

// `git add` of a secret file by name, or a sweep (-A, ., --all, a folder) while one is not ignored.
function judgeAdd(command, cwd) {
  for (const { dir, args: raw } of gitAdds(command, cwd)) {
    const args = raw.filter((a) => !a.startsWith('-') || ['-A', '--all'].includes(a));
    const named = args.find((a) => isSecretFile(a));
    if (named) return `\`git add ${named}\`: a secret file is never staged (.env, keys, credentials). Keep it ignored; commit a .env.example with the names and no values.`;
    if (args.some((a) => ['-A', '--all', '.', '*'].includes(a) || a.endsWith('/'))) {
      const r = spawnSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: dir, encoding: 'utf8' });
      const loose = (r.stdout ?? '').split('\n').filter((f) => f && isSecretFile(f));
      if (loose.length) return `this \`git add\` would stage ${loose.join(', ')}, a secret file git does not ignore. Add it to .gitignore first, then stage by path.`;
    }
  }
  return null;
}

const main = (text) => judgeEvent(text, {
  name: 'secrets-guard',
  command: judgeAdd,
  write: (w) => (w.op === 'delete' ? null : judgeWrite(w)),
});

function selftest() {
  const hook = new URL(import.meta.url).pathname;
  const gh = `gh${'p'}_${'a1B2'.repeat(9)}`;   // built here, so this file holds no token
  const pem = `-----BEGIN RSA ${'PRIVATE'} KEY-----`;
  const dir = scratchProject({ '.gitignore': '.env\n', 'src/app.ts': 'export const x = 1;\n', 'src/old.ts': `const t = '${gh}';\nconst x = 1;\n` });
  git(dir, 'init', '-q');
  const open = scratchProject({ 'src/app.ts': '\n' });
  git(open, 'init', '-q');
  const run = (d, payload) => runHook(hook, d, payload);
  const cases = [
    ['a GitHub token written into source', run(dir, writeOf(join(dir, 'src/app.ts'), `const t = '${gh}';\n`)), 2],
    ['a private key written into a doc', run(dir, writeOf(join(dir, 'docs/key.md'), `${pem}\n${'MIIEvQIBADANBgkqhkiG9w0BAQEFAASC'.repeat(3)}\n`)), 2],
    ['a bare header in a doc is a placeholder', run(dir, writeOf(join(dir, 'docs/format.md'), `${pem}\n...\n`)), 0],
    ['a connection string with its password', run(dir, writeOf(join(dir, 'src/db.ts'), "const u = 'mongodb+srv://tim:hunter22@c0.x.net/db';\n")), 2],
    ['a connection string that names its password ($VAR)', run(dir, writeOf(join(dir, 'src/db.ts'), 'const u = `mongodb+srv://tim:${process.env.PW}@c0.x.net/db`;\n')), 0],
    ['code that reads the token by name', run(dir, writeOf(join(dir, 'src/app.ts'), 'const t = process.env.GITHUB_TOKEN;\n')), 0],
    ['the token into an ignored .env', run(dir, writeOf(join(dir, '.env'), `GITHUB_TOKEN=${gh}\n`)), 0],
    ['a .env git does not ignore', run(open, writeOf(join(open, '.env'), 'A=1\n')), 2],
    ['a .env.example with names only', run(open, writeOf(join(open, '.env.example'), 'GITHUB_TOKEN=\n')), 0],
    ['git add .env', run(dir, bashOf('git add .env src/app.ts', dir)), 2],
    ['git add -f of a key file', run(dir, bashOf('git add -f deploy/server.pem', dir)), 2],
    ['git add by path, no secret', run(dir, bashOf('git add src/app.ts', dir)), 0],
    ['git add -A while a .env is not ignored', (spawnSync('touch', [join(open, '.env')]), run(open, bashOf('git add -A', open))), 2],
    ['git add -A while the .env is ignored', (spawnSync('touch', [join(dir, '.env')]), run(dir, bashOf('git add -A', dir))), 0],
    ['an edit beside a token already there adds none', run(dir, { tool_name: 'Edit', tool_input: { file_path: join(dir, 'src/old.ts'), old_string: 'x = 1', new_string: 'x = 2' } }), 0],
    ['git -C <dir> add of a .env', run(dir, bashOf(`git -C ${dir} add .env`, dir)), 2],
  ];
  return verdicts('secrets-guard', cases);
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? selftest() : await asHook('secrets-guard', main));
