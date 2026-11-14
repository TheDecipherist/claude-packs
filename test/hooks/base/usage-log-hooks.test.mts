// skill-log and rule-log: the contract of each (selftest in an install, worktree case, emitted = source). They refuse nothing.
import { fixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'skill-log.mjs',
  dir: () => fixture('base'),
  same: (project) => ({ payload: { hook_event_name: 'PostToolUse', cwd: project, session_id: 's', tool_name: 'Skill', tool_input: { skill: 'x' } }, status: 0 }),
});

holdsTheContract({
  hook: 'rule-log.mjs',
  dir: () => fixture('base'),
  same: (project) => ({ payload: { hook_event_name: 'InstructionsLoaded', cwd: project, session_id: 's', file_path: `${project}/.claude/rules/a.md`, load_reason: 'session_start' }, status: 0 }),
});

// Review fx-1 finding 14: a /name prompt for a skill nested under a layout folder's own .claude/skills is logged, as `logs skills` counts it installed.
import { assert, hookRun, join, mkdirSync, readFileSync, test, writeFileSync } from '../../kit-cli.mts';
import { withLayout } from '../../fixtures/installs.mts';

test('skill-log: a prompt for a skill nested in a layout folder is logged', () => {
  const dir = fixture('base');
  mkdirSync(join(dir, 'synth/.claude/skills/nested-one'), { recursive: true });
  writeFileSync(join(dir, 'synth/.claude/skills/nested-one/SKILL.md'), '---\nname: nested-one\n---\n');
  withLayout(dir, (layout) => ({ folders: { ...(layout['folders'] as Record<string, unknown>), synth: { path: 'synth', kind: 'source' } } }));
  const sent = hookRun(dir, 'skill-log.mjs', { hook_event_name: 'UserPromptSubmit', cwd: dir, session_id: 's', prompt: '/nested-one go' });
  assert.equal(sent.status, 0, sent.stderr);
  assert.match(readFileSync(join(dir, '.claude/logs/skills.jsonl'), 'utf8'), /"skill":"nested-one","via":"prompt"/);
});
