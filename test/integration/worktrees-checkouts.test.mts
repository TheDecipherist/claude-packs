// runs alone: red in two suites run beside other files, green alone every time; the cause is not found (KWB-219, a gap)
// The rest of the worktree flow (split from worktrees.test.mts so no file sums over 60 s): the Stellix folder and size laws, git-guard's
// Stop after a landing, and the pin guard, each judged from a real git worktree of the project.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { PIN_GUARD, fire, fireAs, landFromWorktree, project, put, stellix } from '../worktree-rig.mts';

test('folder-law allows a new file in a right folder of a worktree and refuses a wrong one', () => {
  const { here, wt } = stellix();
  assert.equal(fire(here, 'folder-law.mjs', join(wt, 'lib/app/src/host_groups.h')), 0);
  assert.equal(fire(here, 'folder-law.mjs', join(wt, 'random/stray.cpp')), 2);
  assert.equal(fire(here, 'folder-law.mjs', join(here, 'lib/app/src/fine.h')), 0);
  assert.equal(fire(here, 'folder-law.mjs', join(here, 'random/stray.cpp')), 2);
});

test('file-size-guard measures a worktree file by its own checkout', () => {
  const { here, wt } = stellix();
  assert.equal(fire(here, 'file-size-guard.mjs', join(wt, 'lib/app/src/small.h')), 0);
  assert.equal(fire(here, 'file-size-guard.mjs', join(wt, 'lib/app/src/huge.h'), 'x\n'.repeat(400)), 2);
});

test('git-guard at Stop, fired from a worktree, refuses while its landing left the main checkout behind (KWB-96)', () => {
  const p = project(['audio-core'], (dir) => {
    const lf = join(dir, '.claude/layout.json');
    writeFileSync(lf, JSON.stringify({ ...(JSON.parse(readFileSync(lf, 'utf8')) as Record<string, unknown>), guards: { git: { house: true } } }, null, 2));
  });
  const trunk = landFromWorktree(p);
  const stop = () => fireAs(p.here, 'git-guard.mjs', { hook_event_name: 'Stop', cwd: p.wt, session_id: `wt-lag-${process.pid}` });
  const s = stop();
  assert.equal(s.status, 2, s.stderr);
  assert.ok(s.stderr.includes(`git -C ${p.here} merge --ff-only origin/${trunk}`), s.stderr);
  execFileSync('git', ['-C', p.here, 'merge', '-q', '--ff-only', `origin/${trunk}`]);
  assert.equal(stop().status, 0, 'fast-forwarded, the turn ends');
});

test('version-pin-guard reads docs/versions.md from the worktree the pin is written in', () => {
  const { here, wt } = project(['audio-core'], (dir) => {
    put(join(dir, 'package.json'), '{"dependencies":{}}\n');
    put(join(dir, 'docs/versions.md'), '| name | latest | checked | source | used | decision |\n|---|---|---|---|---|---|\n');
  });
  const today = new Date().toISOString().slice(0, 10);
  writeFileSync(join(wt, 'docs/versions.md'), `${readFileSync(join(wt, 'docs/versions.md'), 'utf8')}| zod | 4.1.12 | ${today} | https://github.com/colinhacks/zod/releases | 4.1.12 | use |\n`);
  const pin = (file: string): number | null => spawnSync('node', [PIN_GUARD], {
    input: JSON.stringify({ tool_name: 'Write', tool_input: { file_path: file, content: '{"dependencies":{"zod":"4.1.12"}}\n' } }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: here },
  }).status;
  assert.equal(pin(join(wt, 'package.json')), 0, 'the worktree has the fresh row');
  assert.equal(pin(join(here, 'package.json')), 2, 'main has no row');
});
