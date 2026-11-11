// The hook tier's shared rig (W5 b): what every `test/hooks/PACK/HOOK.test.mts` does the same way, once. A hook's own file holds its
// refusals; this holds the three things all of them prove: the selftest passes in an install, the worktree case holds in a real git
// worktree of a copy of an install, and the emitted `.mjs` gives the verdict the `.mts` source gives (d-4).
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scratchDir } from '../../packs/base/hooks/lib/files.mts';
import type { WorktreeCase } from '../../packs/base/hooks/lib/selftest.mts';
import { buildOnce, copyInstall, fixture, withLayout } from '../fixtures/installs.mts';
import type { FixtureName } from '../fixtures/installs.mts';
import { assert, cli, hookRun, run, selftest, test } from '../kit-cli.mts';
import type { Payload } from '../kit-cli.mts';
import { RIG_FOLDERS, caseFrom, checkoutsOf, worktreeCaseOf } from '../worktree-rig.mts';
import type { Checkouts } from '../worktree-rig.mts';

export { RIG_FOLDERS, caseFrom, checkoutsOf, fixture };
export type { Checkouts, FixtureName, Payload, WorktreeCase };

const PACKS = fileURLToPath(new URL('../../packs', import.meta.url));

/** A copy of an install no fixture names (a pack the fixtures leave out: postgres, reverse-engineering, ...): built once per run
 *  under `name` by the same build lock, then copied. `args` are what `init` is given. */
export function extraFixture(name: string, args: readonly string[]): string {
  const root = process.env.CLAUDE_PACKS_FIXTURES ?? join(tmpdir(), `claude-packs-fixtures-${process.pid}`);
  const built = buildOnce(root, `extra-${name}`, (into) => { run(into, 'init', ...args); });
  return copyInstall(built, scratchDir(`fixture-${name.replace(/\W+/g, '-')}-`));
}

/** The project's `enable` list given these hooks or checks (the opt-in ones), and the update that brings them. */
export function enable(dir: string, ...names: string[]): void {
  withLayout(dir, (layout) => ({ enable: [...new Set([...(Array.isArray(layout.enable) ? layout.enable.map(String) : []), ...names])] }));
  const r = cli(dir, 'update');
  assert.equal(r.status, 0, r.stdout + r.stderr);
}

/** `checkoutsOf` a copy of the run's install of a configuration. */
export const worktreeOf = (name: FixtureName): Checkouts => checkoutsOf(fixture(name));

/** The hook's own `worktreeCase`, read from its installed copy in the checkout's project, run in the worktree. */
export async function installedWorktreeCase(checkouts: Checkouts, hook: string): Promise<void> {
  const module: unknown = await import(`${join(checkouts.here, '.claude/hooks', hook)}?x=${Date.now()}`);
  caseFrom(hook, worktreeCaseOf(module, hook))(checkouts);
}

// The kit's hook sources laid out as an install lays them: every pack's hooks and libs merged under one `.claude/hooks`, as `.mts`.
let sourceTree: string | null = null;
function sourceHooks(): string {
  if (sourceTree) return sourceTree;
  const hooks = join(scratchDir('hook-sources-'), '.claude/hooks');
  mkdirSync(join(hooks, 'lib'), { recursive: true });
  for (const pack of ['base', ...readdirSync(PACKS).filter((p) => p !== 'base')]) {
    const from = join(PACKS, pack, 'hooks');
    if (!existsSync(from)) continue;
    cpSync(from, hooks, { recursive: true, filter: (file) => !/\.mjs$/.test(file) });
  }
  sourceTree = hooks;
  return hooks;
}

/** A hook's `.mts` source fired as its emitted copy is: node, the payload on stdin, the project in the environment. */
export function sourceRun(dir: string, hook: string, payload: Payload, env: Readonly<Record<string, string>> = {}): { status: number | null; stdout: string; stderr: string } {
  const r = spawnSync('node', [join(sourceHooks(), hook.replace(/\.mjs$/, '.mts'))], {
    input: JSON.stringify(payload), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir, ...env },
  });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

/** The three tests every hook has. `dir` makes the install the hook runs in (a fixture copy; the hook is installed there),
 *  `worktree` is the checks of its worktree case (default: the hook's own exported `worktreeCase`, run in a worktree of a copy
 *  of `dir`), and `same` is the one case the emitted `.mjs` and the `.mts` source must judge alike: a payload and what it must say. */
export interface Contract {
  hook: string;                       // the emitted name, as the settings entry runs it: 'folder-law.mjs'
  dir: () => string;                  // a fresh copy of the install the hook is in
  same: (project: string) => { payload: Payload; status: number; env?: Readonly<Record<string, string>> };
  worktree?: (checkouts: Checkouts) => void | Promise<void>;
}

export function holdsTheContract({ hook, dir, same, worktree }: Contract): void {
  const name = hook.replace(/\.(?:mjs|py)$/, '');
  test(`${name}: its selftest passes in an install`, () => {
    const r = selftest(dir(), hook);
    assert.equal(r.status, 0, r.stdout + r.stderr);
  });
  test(`${name}: judges a worktree file against the worktree, in a real git worktree`, async () => {
    const checkouts = checkoutsOf(dir());
    await (worktree ?? ((c: Checkouts) => installedWorktreeCase(c, hook)))(checkouts);
  });
  test(`${name}: the emitted .mjs gives the verdict the .mts source gives`, () => {
    const project = dir();
    const want = same(project);
    const emitted = hookRun(project, hook, want.payload, want.env);
    const source = sourceRun(project, hook, want.payload, want.env);
    assert.equal(emitted.status, want.status, emitted.stdout + emitted.stderr);
    assert.deepEqual({ status: source.status, stdout: source.stdout, stderr: source.stderr }, { status: emitted.status, stdout: emitted.stdout, stderr: emitted.stderr });
  });
}
