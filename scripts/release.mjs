#!/usr/bin/env node
// `npm run release`: one release, made the same way every time, from the version in package.json and its section of CHANGELOG.md:
// the npm package, the git tag and the GitHub release whose notes are that section. Each step is skipped when it is already done,
// so a release stopped half-way is finished by running it again. The landing gate (`npm run test:changed -- --base origin/main`)
// comes before, on the branch; this runs on main, after the landing.
//   node scripts/release.mjs [--dry-run]
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KIT = fileURLToPath(new URL('..', import.meta.url));

// The release notes: the CHANGELOG's "## <version>" section, up to the next "## " heading.
export function notesFor(changelog, version) {
  const lines = changelog.split('\n');
  const heading = new RegExp(`^## ${version.replace(/\./g, '\\.')}(\\s|$)`);
  const start = lines.findIndex((l) => heading.test(l));
  if (start === -1) throw new Error(`CHANGELOG.md has no "## ${version}" section: write it before releasing`);
  const next = lines.findIndex((l, i) => i > start && l.startsWith('## '));
  const notes = lines.slice(start + 1, next === -1 ? undefined : next).join('\n').trim();
  if (!notes) throw new Error(`CHANGELOG.md's "## ${version}" section is empty`);
  return notes;
}

// GitHub over HTTPS with the token from the environment (KWB-143: origin in the main checkout is the SSH URL, and port 22 timed
// out while the token sat unused). git gets the token from a credential helper that reads the variable when it runs, so the
// token is never on a command line, in the process list or in an error message.
const TOKEN = 'GH_TOKEN';

/** The HTTPS address of a GitHub remote, from origin's URL in either form. */
export function githubRemote(originUrl) {
  const m = /github\.com[:/]([^/\s]+\/[^/\s]+?)(?:\.git)?\/?$/.exec(String(originUrl).trim());
  if (!m) throw new Error(`origin (${originUrl}) is not a GitHub remote`);
  return `https://github.com/${m[1]}.git`;
}

/** A git command that authenticates with $GH_TOKEN, by name. */
export const gitWithToken = (...args) =>
  ['-c', 'credential.helper=', '-c', `credential.helper=!f() { echo username=x-access-token; echo "password=$${TOKEN}"; }; f`, ...args];

// Why the repo is not ready to release, one line per reason; an empty list means it is.
export function refusals({ branch, dirty, local, remote, token }) {
  return [
    !token && `${TOKEN} is not set: the release reaches GitHub over HTTPS with it (\`${TOKEN}=$YOUR_TOKEN_VARIABLE npm run release\`)`,
    branch !== 'main' && `on ${branch}: a release is made from main, after the landing`,
    dirty && 'the tree has uncommitted changes',
    local !== remote && `main (${local.slice(0, 7)}) is not GitHub's main (${(remote || 'none').slice(0, 7)}): land and push first`,
  ].filter(Boolean);
}

// The steps, in order, each with whether it is already done.
export function plan({ name, version, published, tagged, released }) {
  const tag = `v${version}`;
  return [
    { step: `npm publish ${name}@${version}`, done: published, act: 'publish' },
    { step: `tag ${tag} on GitHub`, done: tagged, act: 'tag' },
    { step: `GitHub release ${tag}`, done: released, act: 'release' },
  ];
}

const sh = (cmd, args, opts = {}) => spawnSync(cmd, args, { cwd: KIT, encoding: 'utf8', ...opts });
const out = (cmd, args) => { const r = sh(cmd, args); return r.status === 0 ? r.stdout.trim() : ''; };

// What the repo, npm and GitHub say now.
function state() {
  const pkg = JSON.parse(readFileSync(join(KIT, 'package.json'), 'utf8'));
  const tag = `v${pkg.version}`;
  const github = githubRemote(out('git', ['remote', 'get-url', 'origin']));
  return {
    github,
    token: Boolean(process.env[TOKEN]),
    name: pkg.name,
    version: pkg.version,
    branch: out('git', ['rev-parse', '--abbrev-ref', 'HEAD']),
    dirty: out('git', ['status', '--porcelain', '--untracked-files=no']) !== '',
    local: out('git', ['rev-parse', 'HEAD']),
    remote: out('git', gitWithToken('ls-remote', github, 'refs/heads/main')).split(/\s/)[0],
    published: out('npm', ['view', `${pkg.name}@${pkg.version}`, 'version']) === pkg.version,
    tagged: out('git', gitWithToken('ls-remote', '--tags', github, `refs/tags/${tag}`)) !== '',
    released: sh('gh', ['release', 'view', tag]).status === 0,
  };
}

const run = (cmd, args) => {
  const r = sh(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed (exit ${r.status}): run the release again once it is fixed; the steps already done are skipped`);
};

// What each step does, by its name in the plan.
const ACTS = {
  publish: () => run('npm', ['publish']),
  tag: ({ name, version, github }) => { run('git', ['tag', '-a', `v${version}`, '-m', `${name} ${version}`]); run('git', gitWithToken('push', github, `v${version}`)); },
  release: ({ version }, notes) => run('gh', ['release', 'create', `v${version}`, '--title', version, '--notes', notes, '--latest']),
};

function release(dryRun) {
  const s = state();
  const notes = notesFor(readFileSync(join(KIT, 'CHANGELOG.md'), 'utf8'), s.version);
  const steps = plan(s);
  if (steps.every((x) => x.done)) return console.log(`v${s.version} is already released on npm and GitHub: bump the version for the next one`), 0;
  const why = refusals(s);
  if (why.length) return console.error(`release refused:\n${why.map((w) => `  - ${w}`).join('\n')}`), 2;
  for (const { step, done, act } of steps) {
    console.log(`${done ? 'done already' : dryRun ? 'would run' : 'running'}: ${step}`);
    if (!done && !dryRun) ACTS[act](s, notes);
  }
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { process.exit(release(process.argv.includes('--dry-run'))); } catch (e) { console.error(e.message); process.exit(1); }
}
