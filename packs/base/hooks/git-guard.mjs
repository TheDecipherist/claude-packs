#!/usr/bin/env node
// PreToolUse (Bash): a token never lands in git config. `git push -u <url-with-token>` records that
// URL verbatim as the branch's upstream remote, and `remote add/set-url`, `clone` and `config` store
// it as a remote; the token then sits in .git/config in plain text (Sub37 WB-3: a push -u wrote
// TheDecipherist's token into synthkit's config). Pushing to a token URL WITHOUT -u stores nothing
// and is allowed; so is a credential helper that reads the token from the environment.
// Every git call is judged, in any folder: a token in a sibling repo's config is just as stored.
// Exit 2 refuses the command. `--selftest` proves it.
import { readFileSync } from 'node:fs';

// A URL whose user part carries a secret: user:secret@, a $VARIABLE, or a GitHub token on its own.
const URL_USER = /\b[a-z][\w+.-]*:\/\/([^\s/@'"]+)@/gi;
const SECRET_USER = /:|\$|^(gh[pousr]_|github_pat_|glpat-|x-access-token|oauth2)/i;

export const tokenUrls = (text) => [...text.matchAll(URL_USER)].filter((m) => SECRET_USER.test(m[1])).map((m) => m[0]);
export const mask = (url) => url.replace(/:\/\/[^@]+@/, '://***@');

export function problem(command) {
  for (const raw of command.split(/&&|\|\||;|\||\n/)) {
    const m = raw.trim().match(/^(?:\w+=\S*\s+)*git((?:\s+(?:-C|-c)\s+\S+)*)\s+([\w-]+)(.*)$/);
    if (!m) continue;
    const [, , sub, args] = m;
    const urls = tokenUrls(args);
    if (!urls.length) continue;
    const where = mask(urls[0]);
    if (sub === 'push' && /(^|\s)(--set-upstream|-[a-zA-Z]*u[a-zA-Z]*)(\s|$)/.test(args)) {
      return `push -u with ${where} would write the token into .git/config as the branch's upstream`;
    }
    if (sub === 'remote' && /^\s*(add|set-url)\b/.test(args)) return `remote ${args.trim().split(/\s+/)[0]} would store ${where} in .git/config`;
    if (sub === 'clone') return `clone would store ${where} as origin in the new repo's .git/config`;
    if (sub === 'submodule') return `submodule would store ${where} in .gitmodules and .git/config`;
    if (sub === 'config') return `config would store ${where} in git config`;
  }
  return null;
}

function main() {
  let payload;
  try { payload = JSON.parse(readFileSync(0, 'utf8')); } catch { return 0; }
  const why = problem(payload.tool_input?.command ?? '');
  if (!why) return 0;
  process.stderr.write(
    `BLOCKED by git-guard: ${why}.\nA token is used, never stored. Push with a one-shot credential helper that reads it from the environment:\n` +
      "  git -c credential.helper='!f() { echo username=x-access-token; echo password=$TOKEN; }; f' push -u origin <branch>\n" +
      'or push to the token URL without -u, then set the upstream by name:\n' +
      '  git config branch.<branch>.remote origin && git config branch.<branch>.merge refs/heads/<branch>\n',
  );
  return 2;
}

function selftest() {
  const cases = [
    ['git push -u https://x-access-token:abc@github.com/a/b.git work/x', true],
    ['git push --set-upstream https://me:$TOKEN@github.com/a/b.git main', true],
    ['cd ../b && git -C ../b push origin x -u https://u:p@github.com/a/b.git', true],
    ['git remote set-url origin https://ghp_abc@github.com/a/b.git', true],
    ['git remote add o https://u:${T}@github.com/a/b.git', true],
    ['git clone https://x-access-token:abc@github.com/a/b.git', true],
    ['git config remote.origin.url https://u:t@github.com/a/b.git', true],
    ['git push https://x-access-token:$T@github.com/a/b.git work/x', false],
    ['git push -u origin work/x', false],
    ['git remote set-url origin https://github.com/a/b.git', false],
    ['git remote add o git@github-decipherist:TheDecipherist/b.git', false],
    ['git clone https://me@github.com/a/b.git', false],
    ['echo https://u:p@x.com/y', false],
  ];
  const bad = cases.filter(([cmd, block]) => (problem(cmd) !== null) !== block);
  for (const [cmd] of bad) console.error(`git-guard selftest FAILED: ${cmd}`);
  if (problem('git push -u https://u:SECRET@h/x.git b')?.includes('SECRET')) bad.push(['the refusal prints the token']);
  if (!bad.length) console.log(`git-guard selftest: OK (${cases.length + 1} cases)`);
  return bad.length ? 1 : 0;
}

process.exit(process.argv.includes('--selftest') ? selftest() : main());
