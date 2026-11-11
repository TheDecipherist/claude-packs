#!/usr/bin/env node
// `npm run release`: one release, made the same way every time, from the version in package.json and its section of CHANGELOG.md:
// the npm package, the git tag and the GitHub release whose notes are that section. Each step is skipped when it is already done,
// so a release stopped half-way is finished by running it again. The landing gate (`npm run test:changed -- --base origin/main`)
// comes before, on the branch; this runs on main, after the landing.
//   node scripts/release.mjs [--dry-run]
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readText } from '../packs/base/hooks/lib/files.mts';
import { gitOut } from '../packs/base/hooks/lib/git-run.mts';
import { isMain } from '../packs/base/hooks/lib/hook-log.mts';
import { parseJson } from '../packs/base/hooks/lib/json.mts';
import type { Env } from '../packs/base/hooks/lib/types.d.mts';

const KIT = fileURLToPath(new URL('..', import.meta.url));

/** The release notes: the CHANGELOG's "## <version>" section, up to the next "## " heading. */
export function notesFor(changelog: string, version: string): string {
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
export function githubRemote(originUrl: string): string {
  const m = /github\.com[:/]([^/\s]+\/[^/\s]+?)(?:\.git)?\/?$/.exec(String(originUrl).trim());
  if (!m) throw new Error(`origin (${originUrl}) is not a GitHub remote`);
  return `https://github.com/${m[1]}.git`;
}

/** A git command that authenticates with $GH_TOKEN, by name. */
export const gitWithToken = (...args: string[]): string[] =>
  ['-c', 'credential.helper=', '-c', `credential.helper=!f() { echo username=x-access-token; echo "password=$${TOKEN}"; }; f`, ...args];

/** What the repo, npm and GitHub say about a release. */
export interface ReleaseState {
  github: string;
  token: boolean;
  name: string;
  version: string;
  branch: string;
  dirty: boolean;
  local: string;
  remote: string;
  published: boolean;
  tagged: boolean;
  released: boolean;
}

/** Why the repo is not ready to release, one line per reason; an empty list means it is. */
export function refusals({ branch, dirty, local, remote, token }: Pick<ReleaseState, 'branch' | 'dirty' | 'local' | 'remote' | 'token'>): string[] {
  return [
    !token && `${TOKEN} is not set: the release reaches GitHub over HTTPS with it (\`${TOKEN}=$YOUR_TOKEN_VARIABLE npm run release\`)`,
    branch !== 'main' && `on ${branch}: a release is made from main, after the landing`,
    dirty && 'the tree has uncommitted changes',
    local !== remote && `main (${local.slice(0, 7)}) is not GitHub's main (${(remote || 'none').slice(0, 7)}): land and push first`,
  ].filter((reason): reason is string => typeof reason === 'string');
}

/** One step of a release and whether it is already done; `act` names what runs it. */
export interface ReleaseStep { step: string; done: boolean; act: 'publish' | 'tag' | 'release' }

/** The steps, in order, each with whether it is already done. */
export function plan({ name, version, published, tagged, released }: Pick<ReleaseState, 'name' | 'version' | 'published' | 'tagged' | 'released'>): ReleaseStep[] {
  const tag = `v${version}`;
  return [
    { step: `npm publish ${name}@${version}`, done: published, act: 'publish' },
    { step: `tag ${tag} on GitHub`, done: tagged, act: 'tag' },
    { step: `GitHub release ${tag}`, done: released, act: 'release' },
  ];
}

const sh = (cmd: string, args: readonly string[], env: Env, stdio?: 'inherit') => spawnSync(cmd, args, { cwd: KIT, encoding: 'utf8', env: { ...env }, ...(stdio ? { stdio } : {}) });
const out = (cmd: string, args: readonly string[], env: Env): string => { const r = sh(cmd, args, env); return r.status === 0 ? r.stdout.trim() : ''; };
const git = (args: readonly string[], env: Env): string => gitOut(args, { cwd: KIT, env }) ?? '';

/** What the repo, npm and GitHub say now. */
function state(env: Env): ReleaseState {
  const pkg = parseJson<{ name: string; version: string }>(readText(join(KIT, 'package.json')));
  if (!pkg) throw new Error('package.json is missing or is not JSON');
  const tag = `v${pkg.version}`;
  const github = githubRemote(git(['remote', 'get-url', 'origin'], env));
  return {
    github,
    token: Boolean(env[TOKEN]),
    name: pkg.name,
    version: pkg.version,
    branch: git(['rev-parse', '--abbrev-ref', 'HEAD'], env),
    dirty: git(['status', '--porcelain', '--untracked-files=no'], env) !== '',
    local: git(['rev-parse', 'HEAD'], env),
    remote: git(gitWithToken('ls-remote', github, 'refs/heads/main'), env).split(/\s/)[0] ?? '',
    published: out('npm', ['view', `${pkg.name}@${pkg.version}`, 'version'], env) === pkg.version,
    tagged: git(gitWithToken('ls-remote', '--tags', github, `refs/tags/${tag}`), env) !== '',
    released: sh('gh', ['release', 'view', tag], env).status === 0,
  };
}

function run(cmd: string, args: readonly string[], env: Env): void {
  const r = sh(cmd, args, env, 'inherit');   // its output reaches the person who ran the release
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed (exit ${r.status}): run the release again once it is fixed; the steps already done are skipped`);
}

// What each step does, by its name in the plan.
const ACTS: Record<ReleaseStep['act'], (s: ReleaseState, notes: string, env: Env) => void> = {
  publish: (_s, _notes, env) => run('npm', ['publish'], env),
  tag: ({ name, version, github }, _notes, env) => { run('git', ['tag', '-a', `v${version}`, '-m', `${name} ${version}`], env); run('git', gitWithToken('push', github, `v${version}`), env); },
  release: ({ version }, notes, env) => run('gh', ['release', 'create', `v${version}`, '--title', version, '--notes', notes, '--latest'], env),
};

/** The release: 0 done or finished, 2 refused (the reasons are logged to `error`). */
export function release(dryRun: boolean, env: Env, log: (line: string) => void, error: (line: string) => void): number {
  const s = state(env);
  const notes = notesFor(readText(join(KIT, 'CHANGELOG.md')) ?? '', s.version);
  const steps = plan(s);
  if (steps.every((x) => x.done)) { log(`v${s.version} is already released on npm and GitHub: bump the version for the next one`); return 0; }
  const why = refusals(s);
  if (why.length) { error(`release refused:\n${why.map((w) => `  - ${w}`).join('\n')}`); return 2; }
  for (const { step, done, act } of steps) {
    log(`${done ? 'done already' : dryRun ? 'would run' : 'running'}: ${step}`);
    if (!done && !dryRun) ACTS[act](s, notes, env);
  }
  return 0;
}

if (isMain(import.meta.url)) {
  try { process.exit(release(process.argv.includes('--dry-run'), process.env, console.log, console.error)); } catch (e) { console.error(e instanceof Error ? e.message : String(e)); process.exit(1); }
}
