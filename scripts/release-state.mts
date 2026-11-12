// What a release reads before it acts (typescript order W9): the repo, the registry and GitHub's answers, and the reasons the repo is
// not ready. A rehearsal (`--registry`) reads and writes a scratch remote and a local registry only.
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { readText } from '../packs/base/hooks/lib/files.mts';
import { gitOut, gitRun } from '../packs/base/hooks/lib/git-run.mts';
import { parseJson } from '../packs/base/hooks/lib/json.mts';
import type { Env } from '../packs/base/hooks/lib/types.d.mts';
import { bump, datedChangelog, scratchProblems, type Kind } from './release-version.mts';

// GitHub over HTTPS with the token from the environment (KWB-143: origin in the main checkout is the SSH URL, and port 22 timed
// out while the token sat unused). git gets the token from a credential helper that reads the variable when it runs, so the
// token is never on a command line, in the process list or in an error message.
export const TOKEN = 'GH_TOKEN';

/** The HTTPS address of a GitHub remote, from origin's URL in either form. */
export function githubRemote(originUrl: string): string {
  const m = /github\.com[:/]([^/\s]+\/[^/\s]+?)(?:\.git)?\/?$/.exec(String(originUrl).trim());
  if (!m) throw new Error(`origin (${originUrl}) is not a GitHub remote`);
  return `https://github.com/${m[1]}.git`;
}

/** A git command that authenticates with $GH_TOKEN, by name. */
export const gitWithToken = (...args: string[]): string[] =>
  ['-c', 'credential.helper=', '-c', `credential.helper=!f() { echo username=x-access-token; echo "password=$${TOKEN}"; }; f`, ...args];

/** What a release is asked: the kind, whether it only plans, and where a rehearsal publishes and lands. */
export interface ReleaseOptions {
  root: string;
  kind: Kind;
  dryRun: boolean;
  /** A local registry: publish goes there, and landing, tag and push go to the scratch remote, never GitHub. */
  registry?: string;
  /** The scratch remote's name (the clone's own `origin` by default). */
  remote?: string;
  /** Today, YYYY-MM-DD. */
  date: string;
  /** The gate's command, where a test plants its own. */
  gate?: readonly string[];
  /** Run after the named step, where a test plants a fault between two steps. */
  after?: Readonly<Record<string, () => void>>;
}

/** The release's context: the options and how git reaches the remote. */
export interface Ctx extends ReleaseOptions {
  env: Env;
  scratch: boolean;
  remoteName: string;
  /** What git pushes to and fetches from: the scratch remote's name, or GitHub's HTTPS address (with the token). */
  target: string;
  github: string;
}

/** What the repo, npm and GitHub say about this release. */
export interface Facts {
  name: string;
  current: string;
  base: string;
  target: string;
  branch: string;
  dirty: boolean;
  landed: boolean;
  published: boolean;
  tagged: boolean;
  released: boolean;
  token: boolean;
  /** The CHANGELOG's own problem with this release (no section, an empty one), or ''. */
  changelog: string;
  remoteMain: string;
  /** The head the remote itself reports for its main (ls-remote), or '' when it has none or cannot be asked. */
  remoteHead: string;
  scratchProblems: string[];
}

export const git = (ctx: Pick<Ctx, 'root' | 'env'>, args: readonly string[]): string => gitOut(args, { cwd: ctx.root, env: ctx.env }) ?? '';
/** git with its whole output, for a step that must say why it failed. */
export function gitDo(ctx: Pick<Ctx, 'root' | 'env'>, args: readonly string[]): { ok: boolean; text: string } {
  const r = gitRun(args, { cwd: ctx.root, env: ctx.env, timeoutMs: 300_000 });
  return { ok: r.ok, text: (r.stdout + r.stderr).trim() };
}

/** The context of a release: scratch when a registry is named. */
export function releaseContext(options: ReleaseOptions, env: Env): Ctx {
  const scratch = options.registry !== undefined;
  const remoteName = options.remote ?? 'origin';
  const github = scratch ? '' : githubRemote(git({ root: options.root, env }, ['remote', 'get-url', remoteName]));
  return { ...options, env, scratch, remoteName, github, target: scratch ? remoteName : github };
}

/** git's arguments to reach the remote: with the token for GitHub, plain for a scratch remote. */
export const remoteArgs = (ctx: Ctx, ...args: string[]): string[] => (ctx.scratch ? args : gitWithToken(...args));

/** The registry flag npm takes for a rehearsal, none for the real one. */
export const registryArgs = (ctx: Ctx): string[] => (ctx.registry === undefined ? [] : ['--registry', ctx.registry]);

const npmView = (ctx: Ctx, spec: string): string => {
  const r = spawnSync('npm', ['view', spec, 'version', ...registryArgs(ctx)], { cwd: ctx.root, encoding: 'utf8', env: { ...ctx.env } });
  return r.status === 0 ? r.stdout.trim() : '';
};

export const trunkRef = (ctx: Ctx): string => `${ctx.remoteName}/main`;

/** What the repo, npm and GitHub say now. The target version is the trunk's version bumped, or the package's own once landed. */
export function factsOf(ctx: Ctx): Facts {
  const pkg = parseJson<{ name: string; version: string }>(readText(join(ctx.root, 'package.json')));
  if (!pkg) throw new Error('package.json is missing or is not JSON');
  const trunk = trunkRef(ctx);
  const base = parseJson<{ version: string }>(git(ctx, ['show', `${trunk}:package.json`]))?.version ?? pkg.version;
  const landed = gitRun(['merge-base', '--is-ancestor', 'HEAD', trunk], { cwd: ctx.root, env: ctx.env }).ok;
  const target = landed ? pkg.version : bump(base, ctx.kind);
  const tag = `v${target}`;
  let changelog = '';
  try { datedChangelog(readText(join(ctx.root, 'CHANGELOG.md')) ?? '', target, ctx.date); } catch (e) { changelog = e instanceof Error ? e.message : String(e); }
  return {
    name: pkg.name,
    current: pkg.version,
    base,
    target,
    branch: git(ctx, ['rev-parse', '--abbrev-ref', 'HEAD']),
    dirty: git(ctx, ['status', '--porcelain', '--untracked-files=no']) !== '',
    landed,
    published: npmView(ctx, `${pkg.name}@${target}`) === target,
    tagged: git(ctx, remoteArgs(ctx, 'ls-remote', '--tags', ctx.target, `refs/tags/${tag}`)) !== '',
    released: ctx.scratch || spawnSync('gh', ['release', 'view', tag], { cwd: ctx.root, env: { ...ctx.env } }).status === 0,
    token: Boolean(ctx.env[TOKEN]),
    changelog,
    remoteMain: git(ctx, ['rev-parse', trunk]),
    remoteHead: git(ctx, remoteArgs(ctx, 'ls-remote', ctx.target, 'refs/heads/main')).split(/\s/)[0] ?? '',
    scratchProblems: ctx.scratch ? scratchProblems(ctx.registry ?? '', git(ctx, ['remote', 'get-url', ctx.remoteName])) : [],
  };
}

type Readiness = Pick<Facts, 'branch' | 'dirty' | 'token' | 'changelog' | 'remoteMain' | 'remoteHead' | 'scratchProblems' | 'landed'>;

/** Why the repo is not ready to release, one line per reason; an empty list means it is. A dry run does not need the token. */
export function refusals(f: Readiness, { dryRun = false, scratch = false } = {}): string[] {
  return [
    !f.token && !dryRun && !scratch && `${TOKEN} is not set: the release reaches GitHub over HTTPS with it (\`${TOKEN}=$YOUR_TOKEN_VARIABLE npm run release\`)`,
    f.branch === 'HEAD' && 'HEAD is detached: release from a branch',
    f.dirty && 'the tree has uncommitted changes: the gate judges committed work',
    f.remoteMain === '' && 'the trunk (origin/main) is not fetched: fetch it first',
    f.remoteMain !== '' && f.remoteHead !== f.remoteMain && (f.remoteHead === '' ? 'the remote has no main' : `the fetched trunk (${f.remoteMain.slice(0, 7)}) is not the remote's main (${f.remoteHead.slice(0, 7)}): fetch it first`),
    f.changelog !== '' && !f.landed && f.changelog,
    ...f.scratchProblems,
  ].filter((reason): reason is string => typeof reason === 'string');
}
