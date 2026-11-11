// run-hooks: the runner settings.json runs one entry's node hooks through, in one process (KWB-24). It exports no worktreeCase: the
// case is the one test/worktrees.test.mjs kept as a function. The hook's contract, then its refusals.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { assert } from '../../kit-cli.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';
import type { Checkouts } from '../hook-rig.mts';

const entry = (project: string, file: string, content = '// new\n') => ({ hook_event_name: 'PreToolUse', tool_name: 'Write', tool_input: { file_path: file, content }, cwd: project });
const HOOKS = ['.claude/hooks/folder-law.mjs', '.claude/hooks/file-size-guard.mjs'];

holdsTheContract({
  hook: 'run-hooks.mjs',
  dir: () => fixture('audio-core'),
  same: (project) => ({ payload: entry(project, join(project, 'stray/Svf.cpp')), status: 0 }),
  worktree: ({ here, wt }: Checkouts) => {
    // the hooks it names judge a worktree file against the worktree; the timing lines go to the main checkout's log
    const rows: readonly (readonly [string, string, number])[] = [
      ['src/core/Svf.cpp', '// new\n', 0], ['stray/Svf.cpp', '// new\n', 2], ['src/core/Huge.cpp', 'x\n'.repeat(400), 2],
    ];
    for (const [rel, content, want] of rows) {
      const r = spawnSync('node', [join(here, '.claude/hooks/run-hooks.mjs'), ...HOOKS],
        { input: JSON.stringify(entry(here, join(wt, rel), content)), env: { ...process.env, CLAUDE_PROJECT_DIR: here }, encoding: 'utf8' });
      assert.equal(r.status, want, rel);
    }
    assert.match(readFileSync(join(here, '.claude/hooks.log'), 'utf8'), /\tfolder-law\t\d+\t2\tWrite/);
  },
});
