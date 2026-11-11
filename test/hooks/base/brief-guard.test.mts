// brief-guard: a brief, a spec or a recipe names an instance of a concept only as the example. The hook's contract (its selftest,
// its worktree case, the emitted verdict equal to the source's), then the refusals that sat in the old root test files.
import { join } from 'node:path';
import { assert, put, spawnSync, test, writeFileSync } from '../../kit-cli.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';
import { routeProject, unrefused } from '../routes.mts';

const SHAPE = { concepts: { slot: { shape: 'many', count: 4, generator: 'slotId(i, field)', words: ['slot', 'slots'] } }, exclude: [] };

holdsTheContract({
  hook: 'brief-guard.mjs',
  dir: () => fixture('base'),
  same: (project) => {
    put(join(project, 'design/shape.json'), JSON.stringify(SHAPE));
    return { payload: { tool_name: 'Agent', tool_input: { description: 'build', prompt: 'Build the delay. Drive slot 2 and check it works.' } }, status: 2 };
  },
});

test('brief-guard refuses a doc that names an instance by every route, and an agent brief', () => {
  const dir = routeProject();
  writeFileSync(join(dir, 'design/shape.json'), JSON.stringify(SHAPE));
  assert.deepEqual(unrefused(dir, 'brief-guard.mjs', 'docs/brief.md', '# Brief\nPLACEHOLDER\n', 'Drive slot 2 until it sounds.'), []);
  const r = spawnSync('node', [join(dir, '.claude/hooks/brief-guard.mjs')], { input: JSON.stringify({ tool_name: 'Agent', tool_input: { prompt: 'Drive slot 2.' } }), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir } });
  assert.equal(r.status, 2);
});
