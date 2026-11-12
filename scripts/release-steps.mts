// The steps of a release, in order (typescript order W9). Each says whether it is already done, so a stopped release is finished by
// running it again, and what it does. Nothing here reaches GitHub or the real npm in a rehearsal: `target` is the scratch remote
// and `registryArgs` the local registry.
import { spawnSync } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { put, readText } from '../packs/base/hooks/lib/files.mts';
import { gitLines, gitRun } from '../packs/base/hooks/lib/git-run.mts';
import { gitDo, git, registryArgs, remoteArgs, trunkRef, type Ctx, type Facts } from './release-state.mts';
import { datedChangelog, notesFor } from './release-version.mts';

export type StepId = 'gate' | 'bump' | 'changelog' | 'generators' | 'proxy' | 'land' | 'verify' | 'publish' | 'tag' | 'release';
export type Status = 'done' | 'todo' | 'skipped';
export interface Step {
  id: StepId;
  label: (f: Facts) => string;
  status: (ctx: Ctx, f: Facts) => Status;
  run: (ctx: Ctx, f: Facts, log: (line: string) => void) => void;
}

/** What a dry run says a step takes where no real run of this tree measured it (seconds: the medians of the W9 measurements on the
 *  Mac for a change reaching a few tests; a gate over a core lib took 400 s and one touching every pack 277 s). The GitHub release is a guess. */
export const ESTIMATED_S: Record<StepId, number> = { gate: 15, bump: 1, changelog: 1, generators: 5, proxy: 1, land: 1, verify: 1, publish: 4, tag: 1, release: 2 };

const TAIL_LINES = 40;
const SAID_LINES = 6;
const MAX_OUTPUT_BYTES = 1 << 28;

/** Runs a program in the release's folder; throws with the tail of its output when it fails, and says a short tail otherwise. */
function sh(ctx: Ctx, log: (line: string) => void, args: readonly string[]): void {
  const [cmd = 'node', ...rest] = args;
  const r = spawnSync(cmd, rest, { cwd: ctx.root, encoding: 'utf8', env: { ...ctx.env }, maxBuffer: MAX_OUTPUT_BYTES });
  const lines = `${r.stdout}${r.stderr}`.trim().split('\n');
  if (r.status !== 0) throw new Error(`${args.join(' ')} failed (exit ${r.status ?? r.signal ?? 'none'}):\n${lines.slice(-TAIL_LINES).join('\n')}`);
  for (const line of lines.slice(-SAID_LINES)) log(`  ${line}`);
}

/** Stages the paths by name and commits them as one commit. */
function commit(ctx: Ctx, message: string, paths: readonly string[]): void {
  const add = gitDo(ctx, ['add', '--', ...paths]);
  const done = add.ok ? gitDo(ctx, ['commit', '-m', message, '--', ...paths]) : add;
  if (!done.ok) throw new Error(`git commit "${message}" failed: ${done.text}`);
}

/** The gate: the tests the branch's changes reach, against the trunk, through quiet-test where the project has it. */
function gateCommand(ctx: Ctx): string[] {
  if (ctx.gate !== undefined) return [...ctx.gate];
  const picker = ['node', 'scripts/test-changed.mjs', '--base', trunkRef(ctx)];
  return existsSync(join(ctx.root, '.claude/tools/quiet-test.mjs')) ? ['node', '.claude/tools/quiet-test.mjs', ...picker] : picker;
}

/** The checkout that holds `main`, if any. */
function checkoutHoldingMain(ctx: Ctx): string | null {
  const block = git(ctx, ['worktree', 'list', '--porcelain']).split('\n\n').find((b) => b.split('\n').includes('branch refs/heads/main'));
  return block?.split('\n')[0]?.replace(/^worktree /, '') ?? null;
}

/** The landing: fetch, the trunk merged into the branch, main moved to the branch (a fast-forward), main pushed. */
function land(ctx: Ctx, log: (line: string) => void): void {
  const trunk = trunkRef(ctx);
  const fetched = gitDo(ctx, remoteArgs(ctx, 'fetch', ctx.target, `+refs/heads/main:refs/remotes/${trunk}`));
  if (!fetched.ok) throw new Error(`fetching the trunk failed: ${fetched.text}`);
  if (!gitRun(['merge-base', '--is-ancestor', trunk, 'HEAD'], { cwd: ctx.root, env: ctx.env }).ok) {
    const merged = gitDo(ctx, ['merge', '--no-edit', trunk]);
    if (!merged.ok) { gitDo(ctx, ['merge', '--abort']); throw new Error(`merging ${trunk} into the branch failed: ${merged.text}`); }
    log(`  merged ${trunk} into the branch`);
  }
  const sha = git(ctx, ['rev-parse', 'HEAD']);
  const there = checkoutHoldingMain(ctx);
  if (git(ctx, ['rev-parse', '--abbrev-ref', 'HEAD']) !== 'main') {
    const moved = there !== null && realpathSync(there) !== realpathSync(ctx.root)
      ? gitDo({ root: there, env: ctx.env }, ['merge', '--ff-only', sha])
      : gitDo(ctx, ['fetch', '.', `${sha}:refs/heads/main`]);
    if (!moved.ok) throw new Error(`moving main to ${sha.slice(0, 7)} failed: ${moved.text}`);
  }
  const pushed = gitDo(ctx, remoteArgs(ctx, 'push', ctx.target, `${sha}:refs/heads/main`));
  if (!pushed.ok) throw new Error(`pushing main failed: ${pushed.text}`);
  log(`  main is ${sha.slice(0, 7)} here and on ${ctx.scratch ? ctx.remoteName : 'GitHub'}`);
}

const BUILD = ['node', 'scripts/build-proxy.mts'];
const behind = (f: Facts): boolean => f.landed || f.published;

const labels = (f: Facts): Record<StepId, string> => ({
  gate: 'the gate: the tests the changes reach, against the trunk',
  bump: `bump the version to ${f.target} (package.json and the lockfile)`,
  changelog: `date the CHANGELOG heading of ${f.target}`,
  generators: 'the generators (counts, README, versions, manifest)',
  proxy: 'the proxy: the four builds, in parallel (skipped when unchanged)',
  land: 'land: fetch, merge the trunk into the branch, the branch into main, push main',
  verify: 'verify the proxy binaries (present, signatures hold) before the package is made',
  publish: `npm publish ${f.name}@${f.target}`,
  tag: `tag v${f.target}`,
  release: `GitHub release v${f.target}`,
});

const step = (id: StepId, status: Step['status'], run: Step['run']): Step => ({ id, label: (f) => labels(f)[id], status, run });

export const STEPS: readonly Step[] = [
  step('gate', (_c, f) => (f.current === f.target ? 'done' : 'todo'), (ctx, _f, log) => {
    // the picker reads the emitted .mjs and the CLI tests run them: build first, as `npm test` does (pretest)
    if (ctx.gate === undefined) sh(ctx, log, ['npm', 'run', 'build']);
    sh(ctx, log, gateCommand(ctx));
  }),
  step('bump', (_c, f) => (f.current === f.target ? 'done' : 'todo'), (ctx, f) => {
    const r = spawnSync('npm', ['version', f.target, '--no-git-tag-version'], { cwd: ctx.root, encoding: 'utf8', env: { ...ctx.env } });
    if (r.status !== 0) throw new Error(`npm version ${f.target} failed: ${r.stderr.trim()}`);
    commit(ctx, `release ${f.target}: the version`, ['package.json', 'package-lock.json']);
  }),
  step('changelog', (ctx, f) => {
    try { return datedChangelog(readText(join(ctx.root, 'CHANGELOG.md')) ?? '', f.target, ctx.date).changed ? 'todo' : 'done'; } catch { return 'done'; }
  }, (ctx, f) => {
    const file = join(ctx.root, 'CHANGELOG.md');
    put(file, datedChangelog(readText(file) ?? '', f.target, ctx.date).text);
    commit(ctx, `release ${f.target}: the CHANGELOG heading dated`, ['CHANGELOG.md']);
  }),
  step('generators', (_c, f) => (behind(f) ? 'done' : 'todo'), (ctx, f, log) => {
    sh(ctx, log, ['node', 'scripts/counts.mts']);
    const changed = [...gitLines(['diff', '--name-only', 'HEAD'], { cwd: ctx.root, env: ctx.env }), ...gitLines(['ls-files', '--others', '--exclude-standard'], { cwd: ctx.root, env: ctx.env })];
    if (changed.length > 0) commit(ctx, `release ${f.target}: the generated files`, changed);
  }),
  step('proxy', (_c, f) => (behind(f) ? 'done' : 'todo'), (ctx, _f, log) => sh(ctx, log, BUILD)),
  step('land', (_c, f) => (f.landed ? 'done' : 'todo'), (ctx, _f, log) => land(ctx, log)),
  step('verify', (_c, f) => (f.published ? 'done' : 'todo'), (ctx, _f, log) => sh(ctx, log, [...BUILD, '--check'])),
  step('publish', (_c, f) => (f.published ? 'done' : 'todo'), (ctx, _f, log) => sh(ctx, log, ['npm', 'publish', ...registryArgs(ctx)])),
  step('tag', (_c, f) => (f.tagged ? 'done' : 'todo'), (ctx, f) => {
    const tag = `v${f.target}`;
    if (git(ctx, ['tag', '-l', tag]) === '') {
      const made = gitDo(ctx, ['tag', '-a', tag, '-m', `${f.name} ${f.target}`]);
      if (!made.ok) throw new Error(`git tag ${tag} failed: ${made.text}`);
    }
    const pushed = gitDo(ctx, remoteArgs(ctx, 'push', ctx.target, `refs/tags/${tag}`));
    if (!pushed.ok) throw new Error(`pushing ${tag} failed: ${pushed.text}`);
  }),
  step('release', (ctx, f) => (ctx.scratch ? 'skipped' : f.released ? 'done' : 'todo'), (ctx, f, log) => {
    const notes = notesFor(readText(join(ctx.root, 'CHANGELOG.md')) ?? '', f.target);
    sh(ctx, log, ['gh', 'release', 'create', `v${f.target}`, '--title', f.target, '--notes', notes, '--latest']);
  }),
];
