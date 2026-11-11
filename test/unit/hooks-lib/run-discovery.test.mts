// run-discovery.mts: runners in ps output, the work in each folder, and git through the caller's env.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { commitsAhead, mergedInto, runnersIn, workIn, worktreesOf } from '../../../packs/base/hooks/lib/run-discovery.mts';
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

test('git questions about a folder that is no repo answer nothing, never throw', () => {
  const dir = scratchDir('rd-');
  const env = { PATH: process.env.PATH };
  assert.deepEqual(worktreesOf(dir, env), []);
  assert.equal(commitsAhead(dir, 'a', 'b', env), null);
  assert.equal(mergedInto(dir, 'a', 'b', env), false);
});
