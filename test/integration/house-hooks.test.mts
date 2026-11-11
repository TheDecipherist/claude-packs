// 0.6.0: the house hooks, skills and rules moved out of Stellix into the kit (each project-neutral, its project's values in
// layout.json "guards"). This file: what installs. (The skills, the hand-registered entries and the forerunner: house-entries.test.mts;
// the hooks' selftests: house-hooks-selftests.test.mts, split so no file sums over a minute.)
import { assert, existsSync, fresh, join, readFileSync, readdirSync, run, test } from '../kit-cli.mts';
import { fixture, withLayout } from '../fixtures/installs.mts';
import { runnerHooks, settingsOf } from './house-rig.mts';

test('the house hooks install where they belong, project-neutral', () => {   // was: "the house hooks install where they belong, project-neutral, and pass their selftests" (the selftests: house-hooks-selftests.test.mts)
  const dir = fresh('cph-');
  const out = run(dir, 'init', 'audio-core', 'gpu-painter');
  assert.match(out, /held back, not switched on .*hooks\/idle-wake\.mjs, hooks\/user-asks\.mjs/, 'the opt-in hooks wait for "enable"');
  assert.ok(!existsSync(join(dir, '.claude/hooks/user-asks.mjs')) && !existsSync(join(dir, '.claude/hooks/idle-wake.mjs')));
  withLayout(dir, { enable: ['hooks/user-asks.mjs', 'hooks/idle-wake.mjs'] });
  assert.match(run(dir, 'update'), /switching on \(new to this project\): hooks\/idle-wake\.mjs, hooks\/user-asks\.mjs/);
  const hooks = readdirSync(join(dir, '.claude/hooks'));
  assert.deepEqual(hooks.filter((h) => h.endsWith('.py')), [], 'every kit hook is Node: browser-guard was ported (W4), so no installed settings.json runs python3');
  for (const h of ['git-guard.mjs', 'build-guard.mjs', 'time-guard.mjs', 'user-asks.mjs', 'idle-wake.mjs', 'browser-guard.mjs', 'protect-vendor.mjs']) {
    assert.ok(hooks.includes(h), h);
    assert.doesNotMatch(readFileSync(join(dir, '.claude/hooks', h), 'utf8'), /stellix/i, `${h} names no project`);
  }
  assert.ok(!hooks.includes('copy-tree-guard.py'), 'merged into protect-vendor');
  const audioOnly = fixture('audio-core');
  assert.ok(!existsSync(join(audioOnly, '.claude/hooks/browser-guard.mjs')), 'browser-guard comes with gpu-painter');
  const s = readFileSync(join(dir, '.claude/settings.json'), 'utf8');
  // run by node itself (idle-wake: asyncRewake) or a row of the table the runner reads, one runner entry per event (W8.1)
  const rows = runnerHooks(dir);
  for (const h of ['git-guard', 'build-guard', 'time-guard', 'user-asks']) assert.ok(rows.includes(h), `${h} is a row of hooks.json`);
  assert.match(s, /node \\"\$CLAUDE_PROJECT_DIR\/\.claude\/hooks\/idle-wake\.mjs/, 'an async hook keeps its own entry');
  assert.ok(rows.includes('browser-guard')); assert.doesNotMatch(s, /python3/, 'no python3 in a gpu-painter install (W4)');
  const settings = settingsOf(dir);
  const stop = settings.hooks.Stop?.flatMap((g) => g.hooks) ?? [];
  assert.equal(stop.find((h) => h.command.includes('idle-wake.mjs'))?.asyncRewake, true, 'idle-wake keeps its own entry, asyncRewake (W8.1)');
  assert.equal(stop.filter((h) => h.command.includes('run-hooks.mjs')).length, 1, 'Stop has the one runner entry beside it');
  const table = JSON.parse(readFileSync(join(dir, '.claude/hooks/hooks.json'), 'utf8')) as { events: string[]; matcher?: string }[];
  assert.ok(table.some((r) => r.events.includes('SessionStart') && r.matcher === 'compact'), 'a SessionStart row of the table matches compact');
  assert.ok(!existsSync(join(dir, '.claude/hooks/lib/__pycache__')), 'no byte-code cache in the project');
  for (const [pack, check] of [['gpu-painter', 'no-opengl.json'], ['gpu-painter', 'no-opengl-link.json'], ['base', 'no-code-after-midline-comment.json']]) {
    assert.ok(existsSync(join(dir, '.claude/checks', check ?? '')), `${pack}: ${check}`);
  }
  assert.ok(!existsSync(join(audioOnly, '.claude/checks/no-opengl.json')));
});
