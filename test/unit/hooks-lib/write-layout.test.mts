// write-layout.mts: the layout that governs a written file; the project's own unless a worktree of it carries one.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { layoutOfWrite } from '../../../packs/base/hooks/lib/write-layout.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import type { HookContext, Layout } from '../../../packs/base/hooks/lib/types.d.mts';

const layout: Layout = { folders: {}, concepts: {} };
const ctx = (dir: string): HookContext => ({ projectDir: dir, cwd: dir, env: {}, sessionPid: 0, now: 0, layout, log: () => undefined });

test('a file of the project itself is judged by the context\'s layout', () => {
  const dir = scratchDir('wlayout-');
  put(join(dir, '.claude/layout.json'), '{"folders":{"x":{"path":"x","purpose":"p"}},"concepts":{}}');
  assert.equal(layoutOfWrite(ctx(dir), join(dir, 'src/a.ts')), layout);
});

test('a planted file outside any worktree, or no file, still gets the project\'s layout', () => {
  const dir = scratchDir('wlayout-');
  assert.equal(layoutOfWrite(ctx(dir), join(dir, '.claude/worktrees/not-a-worktree/a.ts')), layout, 'a plain folder is not a worktree');
  assert.equal(layoutOfWrite(ctx(dir), ''), layout);
});
