// 0.6.0: the copy-tree law takes its folders from the layout (split from house-git.test.mts so no file sums over a minute).
import { assert, hookRun, join, readFileSync, run, test } from '../kit-cli.mts';
import type { Spawned } from '../kit-cli.mts';
import { fixture, withLayout } from '../fixtures/installs.mts';

test('a copy tree is read-only by its kind; the copy-trees rule loads there and in layout.json', () => {
  const dir = fixture('audio-core');
  assert.match(readFileSync(join(dir, '.claude/rules/copy-trees-read-only.md'), 'utf8'), /paths:\n {2}- "\.claude\/layout\.json"\n---/);
  withLayout(dir, (l) => ({
    folders: { ...(l.folders as Record<string, unknown>), engines_copy: { path: 'src/engines/tabula', kind: 'copy', purpose: 'copied' } },
    guards: { copy: { tools: ['tools/copy_in.py'] } },
  }));
  run(dir, 'update');
  assert.match(readFileSync(join(dir, '.claude/rules/copy-trees-read-only.md'), 'utf8'), /"src\/engines\/tabula\/\*\*"/);
  const w = (file_path: string): Spawned => hookRun(dir, 'protect-vendor.mjs', { tool_name: 'Write', tool_input: { file_path: join(dir, file_path) } });
  const r = w('src/engines/tabula/Voice.h');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /copy tree src\/engines\/tabula.*\n.*python3 tools\/copy_in\.py/);
  assert.equal(w('src/engines/Voice.h').status, 0);
  const b = (command: string): number | null => hookRun(dir, 'protect-vendor.mjs', { tool_name: 'Bash', tool_input: { command } }).status;
  assert.equal(b('echo x >> src/engines/tabula/Voice.h'), 2);
  assert.equal(b('python3 tools/copy_in.py src/engines/tabula/Voice.h'), 0);
  assert.equal(hookRun(dir, 'protect-vendor.mjs', { tool_name: 'NotebookEdit', tool_input: { notebook_path: join(dir, 'src/engines/tabula/a.ipynb') } }).status, 2);
  assert.match(run(dir, 'doctor'), /OK:/);
});
