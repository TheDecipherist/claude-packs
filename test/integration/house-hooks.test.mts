// 0.6.0: the house hooks, skills and rules moved out of Stellix into the kit (each project-neutral, its project's values in
// layout.json "guards"). This file: what installs. (The skills, the hand-registered entries and the forerunner: house-entries.test.mts;
// the hooks' selftests: house-hooks-selftests.test.mts, split so no file sums over a minute.)
import { assert, existsSync, fresh, join, readFileSync, readdirSync, run, test } from '../kit-cli.mts';
import { fixture, withLayout } from '../fixtures/installs.mts';
import { settingsOf } from './house-rig.mts';

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
  // run by node itself (idle-wake: async) or named in a run-hooks.mjs command, one node process per settings entry (KWB-24)
  for (const h of ['git-guard.mjs', 'build-guard.mjs', 'time-guard.mjs', 'idle-wake.mjs', 'user-asks.mjs']) assert.match(s, new RegExp(`(?:node \\\\"\\$CLAUDE_PROJECT_DIR/|run-hooks\\.mjs\\\\"[^"]* )\\.claude/hooks/${h.replace('.', '\\.')}`));
  assert.match(s, /node \\"\$CLAUDE_PROJECT_DIR\/\.claude\/hooks\/idle-wake\.mjs/, 'an async hook keeps its own entry');
  assert.match(s, /run-hooks\.mjs\\"[^"]* \.claude\/hooks\/browser-guard\.mjs/); assert.doesNotMatch(s, /python3/, 'no python3 in a gpu-painter install (W4)');
  const settings = settingsOf(dir);
  assert.equal(settings.hooks.Stop?.[0]?.hooks[0]?.asyncRewake, true);
  assert.ok(settings.hooks.SessionStart?.some((entry) => entry.matcher === 'compact'), 'a SessionStart entry matches compact');
  assert.ok(!existsSync(join(dir, '.claude/hooks/lib/__pycache__')), 'no byte-code cache in the project');
  for (const [pack, check] of [['gpu-painter', 'no-opengl.json'], ['gpu-painter', 'no-opengl-link.json'], ['base', 'no-code-after-midline-comment.json']]) {
    assert.ok(existsSync(join(dir, '.claude/checks', check ?? '')), `${pack}: ${check}`);
  }
  assert.ok(!existsSync(join(audioOnly, '.claude/checks/no-opengl.json')));
});
