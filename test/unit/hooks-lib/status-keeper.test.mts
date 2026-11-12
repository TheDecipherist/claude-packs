// resident/status (W8.6): the status line the daemon draws from what it holds, on a planted clock and planted outside calls: the agent
// rows with their ticking clocks, `quiet 2m`, the red dot on an older install and none on a `work/` version ahead of npm, and a network
// outage (npm hanging or failing) that leaves the render under 15 ms.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';
import { StatusKeeper, type Bar } from '../../../packs/base/hooks/resident/status.mts';
import type { Usage } from '../../../packs/base/hooks/resident/usage.mts';
import type { HookEvent } from '../../../packs/base/hooks/lib/types.d.mts';

const T0 = 1_000_000_000_000;
const MIN = 60_000;
const SESSION = toJson({ model: { display_name: 'Opus' }, session_id: 's1', workspace: { current_dir: '/nowhere' } });
const NO_PROCS = (): Usage | null => null;

function keeperFor(kit: string, over: Partial<ConstructorParameters<typeof StatusKeeper>[0]> = {}): { keeper: StatusKeeper; project: string; env: Record<string, string> } {
  const project = scratchDir('status-keeper-');
  put(join(project, '.claude', 'claude-packs.lock.json'), toJson({ kit, packs: [], files: {} }));
  const env = { NO_COLOR: '1', HOME: project, CLAUDE_PACKS_CACHE_DIR: join(project, 'cache'), CLAUDE_PROJECT_DIR: project };
  const keeper = new StatusKeeper({
    project, env, log: () => undefined, usageOf: NO_PROCS, refreshRuns: false, askGit: () => Promise.resolve(null),
    load: () => import('../../../packs/base/tools/statusline-live.mts') as Promise<Bar>, ...over,
  });
  return { keeper, project, env };
}
const pre = (project: string, agent: string): HookEvent => ({ hook_event_name: 'PreToolUse', session_id: 's1', agent_id: agent, agent_type: agent, tool_name: 'Bash', tool_input: { command: 'sleep 600' }, cwd: join(project, '.claude', 'worktrees', agent) });

test('the drawn line lists a planted agent with a clock that differs a second later, goes quiet at two minutes, and is gone at five', async () => {
  const { keeper, project, env } = keeperFor('2.0.0');
  keeper.note(pre(project, 'a1'), 100, T0);
  const first = await keeper.render(SESSION, env, T0 + 42_000);
  const second = await keeper.render(SESSION, env, T0 + 43_000);
  assert.match(first, /claude-packs 2\.0\.0/);
  assert.match(first, /a1\s+> Bash 0:42/);
  assert.match(second, /a1\s+> Bash 0:43/);
  assert.notEqual(first, second);
  assert.match(await keeper.render(SESSION, env, T0 + 2 * MIN), /quiet 2m/);
  assert.doesNotMatch(await keeper.render(SESSION, env, T0 + 5 * MIN), /a1/);
  keeper.note(pre(project, 'a1'), 100, T0 + 5 * MIN + 1000);
  assert.match(await keeper.render(SESSION, env, T0 + 5 * MIN + 2000), /a1\s+> Bash 0:01/);
  keeper.note({ hook_event_name: 'SessionStart', session_id: 's2', source: 'startup', cwd: project }, 200, T0 + 6 * MIN);
  assert.doesNotMatch(await keeper.render(SESSION, env, T0 + 6 * MIN + 1000), /a1/);
});

test('the lead\'s last tool and shell command come from its events, not from a transcript', async () => {
  const { keeper, project, env } = keeperFor('2.0.0');
  keeper.note({ hook_event_name: 'PreToolUse', session_id: 's1', tool_name: 'Bash', tool_input: { command: 'npm run check' }, cwd: project }, 100, T0);
  keeper.note({ hook_event_name: 'PostToolUse', session_id: 's1', tool_name: 'Edit', tool_input: { file_path: '/p/src/a.ts' }, cwd: project }, 100, T0 + 1000);
  const line = await keeper.render(SESSION, env, T0 + 2000);
  assert.match(line, /Edit .*src\/a\.ts/);
  assert.match(line, /\$ npm run check/);
});

test('the red dot shows when npm has a newer kit than the project runs, and not on a work/ version ahead of npm', async () => {
  const older = keeperFor('1.0.0', { askNpm: () => Promise.resolve('2.0.0') });
  await older.keeper.refreshNewest(T0);
  assert.match(await older.keeper.render(SESSION, older.env, T0), /claude-packs 1\.0\.0 ●/);
  const ahead = keeperFor('2.1.0', { askNpm: () => Promise.resolve('2.0.0') });
  await ahead.keeper.refreshNewest(T0);
  const line = await ahead.keeper.render(SESSION, ahead.env, T0);
  assert.match(line, /claude-packs 2\.1\.0/);
  assert.doesNotMatch(line, /●/);
  const same = keeperFor('2.0.0', { askNpm: () => Promise.resolve('2.0.0') });
  await same.keeper.refreshNewest(T0);
  assert.doesNotMatch(await same.keeper.render(SESSION, same.env, T0), /●/);
});

test('npm is asked at most hourly and a failed ask keeps the last answer', async () => {
  let asked = 0;
  let answer: string | null = '2.0.0';
  const { keeper, env } = keeperFor('1.0.0', { askNpm: () => { asked += 1; return answer === null ? Promise.reject(new Error('offline')) : Promise.resolve(answer); } });
  await keeper.refreshNewest(T0);
  await keeper.refreshNewest(T0 + 59 * MIN);
  assert.equal(asked, 1);
  answer = null;
  await keeper.refreshNewest(T0 + 61 * MIN);
  assert.equal(asked, 2);
  assert.equal(keeper.newest, '2.0.0', 'the outage left the last answer');
  assert.match(await keeper.render(SESSION, env, T0 + 62 * MIN), /●/);
});

test('a network outage (npm that never answers) leaves the render under 15 ms at the median over 100 renders', async () => {
  const { keeper, project, env } = keeperFor('1.0.0', { askNpm: () => new Promise<string | null>(() => undefined) });
  void keeper.refreshNewest(T0);   // hangs for good: no render may wait on it
  keeper.note(pre(project, 'a1'), 100, T0);
  await keeper.render(SESSION, env, T0);   // the first render loads the drawing module
  const times: number[] = [];
  for (let i = 0; i < 100; i += 1) {
    const began = performance.now();
    await keeper.render(SESSION, env, T0 + i * 1000);
    times.push(performance.now() - began);
  }
  times.sort((a, b) => a - b);
  const p50 = times[50] ?? Infinity;
  assert.ok(p50 < 15, `p50 ${p50.toFixed(2)} ms`);
});
