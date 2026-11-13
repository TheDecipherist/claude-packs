// The worktree case for the resident runner (W8.2): it is not a hook, but the install carries it and worktrees.test.mts holds every
// installed .mjs to a case. A daemon serves the project (`here`) for an agent working in a worktree (`wt`): the event's cwd is the
// worktree and CLAUDE_PROJECT_DIR the main checkout, and the install's hooks judge the worktree's file by the worktree's layout.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { readText } from '../packs/base/hooks/lib/files.mts';
import { toJson } from '../packs/base/hooks/lib/json.mts';
import { real } from '../packs/base/hooks/lib/project.mts';
import { askDaemon, startDaemon } from '../packs/base/hooks/lib/proxy-client.mts';
import { PROTOCOL, daemonFiles, daemonKey } from '../packs/base/hooks/lib/proxy-wire.mts';
import type { Checkouts } from './worktree-rig.mts';

export const RESIDENT_CASE: Record<string, (checkouts: Checkouts) => Promise<void>> = {
  'resident.mjs': async ({ here, wt }) => {
    const cache = mkdtempSync('/tmp/cp-');
    const uid = process.getuid?.() ?? 0;
    const files = daemonFiles(cache, daemonKey(uid, real(here), readText(join(here, '.claude/claude-packs.lock.json')) ?? '', process.execPath), uid);
    const env = { HOME: here, PATH: process.env.PATH, CLAUDE_PACKS_CACHE: cache };
    const up = await startDaemon({ node: process.execPath, script: join(here, '.claude/hooks/resident.mjs'), args: ['--serve', here, '--pool', '2'], env });
    try {
      assert.equal(up.kind, 'ready');
      const verdict = async (file: string, content = '// new\n'): Promise<number> => {
        const stdin = toJson({ hook_event_name: 'PreToolUse', tool_name: 'Write', cwd: wt, tool_input: { file_path: file, content } });
        const answer = await askDaemon(files.socket, { v: PROTOCOL, env: { CLAUDE_PROJECT_DIR: here, PATH: process.env.PATH ?? '' }, cwd: wt, ppid: process.pid, deadline: Date.now() + 20_000 }, stdin);
        assert.equal(answer.kind, 'reply');
        if (answer.kind !== 'reply') return -1;
        if (answer.reply.fallback === undefined) return answer.reply.code;
        // the daemon handed the event on (a refusal's grace left a judge unanswered, KWB-216): the client runs the TypeScript runner on the same stdin, as the Go proxy does
        const env = { ...process.env, CLAUDE_PROJECT_DIR: here };
        return spawnSync(process.execPath, [join(here, '.claude/hooks/run-hooks.mjs')], { cwd: wt, env, input: stdin, encoding: 'utf8' }).status ?? -1;
      };
      assert.equal(await verdict(join(wt, 'src/core/Svf.cpp')), 0, 'a file in a src folder is let through');
      assert.equal(await verdict(join(wt, 'stray/Svf.cpp')), 2, 'folder-law refuses a file outside every folder');
      assert.equal(await verdict(join(wt, 'src/core/Huge.cpp'), 'x\n'.repeat(400)), 2, 'file-size-guard refuses 400 lines');
      assert.match(readText(join(here, '.claude/hooks.log')) ?? '', /\tfolder-law\t\d+\t2\tWrite/);
    } finally {
      if (up.kind === 'ready') process.kill(up.pid, 'SIGTERM');
      await new Promise((done) => setTimeout(done, 500));
      rmSync(cache, { recursive: true, force: true });
    }
  },
};
