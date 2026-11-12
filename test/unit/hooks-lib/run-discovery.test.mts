// run-discovery.mts: runners in ps output, the work in each folder, and git through the caller's env.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { test } from 'node:test';
import { commitsAhead, isDaemon, mergedInto, processesOf, runnersIn, workIn, worktreesOf } from '../../../packs/base/hooks/lib/run-discovery.mts';
import { scratchDir } from '../../../packs/base/hooks/lib/files.mts';

test('runnersIn finds bash run.sh processes and leaves a claude one out', () => {
  const ps = ['101 bash docs/workorders/alpha/run.sh', '102 claude -p docs/workorders/beta/run.sh', '103 node x.js', '104 /bin/bash /p/docs/workorders/g-1/run.sh'].join('\n');
  assert.deepEqual(runnersIn(ps), [{ pid: 101, order: 'alpha' }, { pid: 104, order: 'g-1' }]);
  assert.deepEqual(runnersIn(''), []);
});

test('workIn counts a process for the deepest folder, and is null when no process can be read', () => {
  const all = [{ pid: 1, cpu: 50, rssKb: 2048, cwd: '/p/.claude/worktrees/a/src', queued: true }, { pid: 2, cpu: 100, rssKb: 1024, cwd: '/p', queued: false }];
  assert.deepEqual(workIn(['/p', '/p/.claude/worktrees/a'], all), {
    '/p': { procs: 1, cores: 1, memMb: 1, queued: false },
    '/p/.claude/worktrees/a': { procs: 1, cores: 0.5, memMb: 2, queued: true },
  });
  assert.equal(workIn(['/p'], []), null);
});

// W8.4: the resident runner's own process works in no agent's folder: a daemon started with a project as its working folder
// (the client starts it in `/`, a hand start may not) counts for 0 processes there.
test('workIn counts 0 processes for a running daemon', async () => {
  const { PLANTS } = await import('../../../packs/base/hooks/resident/selftest-plants.mts');
  const { RESIDENT, makeRig, stopAll, waitFor } = await import('../../../packs/base/hooks/resident/selftest-rig.mts');
  const rig = makeRig(PLANTS.filter((p) => p.name === 'quick'));
  try {
    const child = spawn(process.execPath, [RESIDENT, '--serve', rig.dir, '--hooks', rig.hooks, '--pool', '1'], { cwd: rig.dir, stdio: 'ignore', detached: true, env: { HOME: rig.dir, PATH: process.env.PATH, CLAUDE_PACKS_CACHE: rig.cache } });
    child.unref();
    rig.pids.add(child.pid ?? 0);
    assert.ok(await waitFor(() => readdirSync(rig.cache).some((f) => f.endsWith('.pid'))), 'the daemon is up');
    const all = processesOf(process.env);
    assert.ok(all.length > 0, 'processes can be read on this machine');
    assert.ok(all.some((p) => p.pid === process.pid), 'the test\'s own process is read');
    assert.equal(workIn([rig.dir], all)?.[rig.dir]?.procs, 0, 'the daemon is no agent\'s work');
    assert.equal(isDaemon(`node /p/.claude/hooks/resident.mjs --serve /p --pool 16`), true);
    assert.equal(isDaemon('node build.mjs resident'), false);
  } finally { await stopAll(rig); }
});

test('git questions about a folder that is no repo answer nothing, never throw', () => {
  const dir = scratchDir('rd-');
  const env = { PATH: process.env.PATH };
  assert.deepEqual(worktreesOf(dir, env), []);
  assert.equal(commitsAhead(dir, 'a', 'b', env), null);
  assert.equal(mergedInto(dir, 'a', 'b', env), false);
});
