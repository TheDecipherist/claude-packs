// kit-fresh: a session start says when the install in the project is older than the kit. The hook's contract (its selftest, its
// worktree case, the emitted verdict equal to the source's), then the refusals that sat in the old root test files.
import { join } from 'node:path';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { readJson, toJson } from '../../../packs/base/hooks/lib/json.mts';
import { KIT } from '../../kit-cli.mts';
import { assert } from '../../kit-cli.mts';
import { fireAs } from '../../worktree-rig.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';
import type { Checkouts } from '../hook-rig.mts';

/** npm's answer, kept for the day in a folder of this test (never the user's cache): npm's newest is this kit's own version. */
function keptAnswer(): Record<string, string> {
  const dir = scratchDir('kit-fresh-cache-');
  const version = readJson<{ version: string }>(join(KIT, 'package.json'))?.version ?? '0.0.0';
  put(join(dir, 'kit-fresh.json'), toJson({ version, at: Date.now() }));
  return { CLAUDE_PACKS_CACHE_DIR: dir, CLAUDE_PACKS_UNATTENDED: '' };   // someone is there: the notice is said, not a refusal ('0' reads as unattended here: reported)
}

function worktree({ here, wt }: Checkouts): void {
  // a session in the worktree reads the worktree's own install: its lock older than npm's, and nothing installed there is newer;
  // the main checkout's install of this kit is the newest and says nothing
  put(join(wt, '.claude/claude-packs.lock.json'), toJson({ kit: '0.0.1' }));
  const env = keptAnswer();
  const start = (cwd: string) => fireAs(here, 'kit-fresh.mjs', { hook_event_name: 'SessionStart', cwd }, env);
  assert.match(start(wt).stdout, /runs the kit 0\.0\.1/);
  assert.equal(start(here).stdout, '');
}

holdsTheContract({
  hook: 'kit-fresh.mjs',
  dir: () => fixture('base'),
  same: (project) => ({ payload: { hook_event_name: 'SessionStart', cwd: project }, env: keptAnswer(), status: 0 }),
  worktree,
});
