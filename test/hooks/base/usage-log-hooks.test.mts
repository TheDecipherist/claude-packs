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
