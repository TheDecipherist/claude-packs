// skill-log: one line per skill used, in .claude/logs/skills.jsonl: { t, session, branch, skill, via }. A skill is used when Claude
// calls the Skill tool (via: tool) or the user's prompt starts with /name and the project has that skill (via: prompt).
// A recorder on the hook contract: it refuses nothing.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readText } from './lib/files.mts';
import { isMain, runAsHook } from './lib/hook-log.mts';
import { runHook, scratchProject, verdicts } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { Hook } from './lib/types.d.mts';
import { SKILLS, logUsage } from './lib/usage-log.mts';
import { pass } from './lib/verdict.mts';

const SLASH = /^\s*\/([\w][\w:.-]*)/;

/** Where a skill may be installed: the project, the call's folder, and each layout folder's own `.claude/skills/` (no tree walk). */
const skillDirs = (project: string, cwd: string, folders: Record<string, { path: string }> | undefined): string[] =>
  [project, cwd, ...Object.values(folders ?? {}).map((f) => join(project, f.path))];

export const hook: Hook = (event, ctx) => {
  if (event.hook_event_name === 'PostToolUse' && event.tool_name === 'Skill') {
    const skill = event.tool_input?.['skill'];
    if (typeof skill === 'string' && skill !== '') logUsage(ctx, event, SKILLS, { skill: skill.replace(/^\//, ''), via: 'tool' });
  } else if (event.hook_event_name === 'UserPromptSubmit') {
    const name = SLASH.exec(event.prompt ?? '')?.[1];
    if (name && skillDirs(ctx.projectDir, event.cwd ?? ctx.projectDir, ctx.layout.folders).some((d) => existsSync(join(d, '.claude', 'skills', name, 'SKILL.md')))) logUsage(ctx, event, SKILLS, { skill: name, via: 'prompt' });
  }
  return pass;   // not a refusal: a usage log only records
};

/** A skill used from a worktree is logged in the main checkout, and the call passes. */
export const worktreeCase: WorktreeCase = {
  steps: [
    { label: 'a Skill call in the worktree', event: { hook_event_name: 'PostToolUse', cwd: '{wt}', tool_name: 'Skill', tool_input: { skill: 'pick-tests' } }, want: 0 },
    { label: 'a prompt in the main checkout', event: { hook_event_name: 'UserPromptSubmit', cwd: '{here}', prompt: '/pick-tests now' }, want: 0 },
  ],
};

export function selftest(): number {
  const hookFile = fileURLToPath(import.meta.url);
  const dir = scratchProject({ '.claude/skills/pick-tests/SKILL.md': '---\nname: pick-tests\n---\n' });
  const lines = (): string[] => (readText(join(dir, SKILLS)) ?? '').split('\n').filter(Boolean);
  const send = (ev: Record<string, unknown>): number | null => runHook(hookFile, dir, { session_id: 's1', cwd: dir, ...ev }).status;
  const codes = [
    send({ hook_event_name: 'PostToolUse', tool_name: 'Skill', tool_input: { skill: 'pick-tests' } }),
    send({ hook_event_name: 'UserPromptSubmit', prompt: '/pick-tests please' }),
  ];
  const afterBoth = lines();
  send({ hook_event_name: 'UserPromptSubmit', prompt: '/not-installed x' });
  send({ hook_event_name: 'PostToolUse', tool_name: 'Read', tool_input: { file_path: 'a' } });
  send({ hook_event_name: 'UserPromptSubmit', prompt: 'about /pick-tests' });
  return verdicts('skill-log', [
    ['neither call is refused', codes.join(','), '0,0'],
    ['a Skill call and a /name prompt are a line each', afterBoth.length, 2],
    ['the line names the skill, how and the session', /"skill":"pick-tests","via":"tool"/.test(afterBoth[0] ?? '') && /"session":"s1"/.test(afterBoth[0] ?? '') ? 1 : 0, 1],
    ['the prompt line says prompt', /"via":"prompt"/.test(afterBoth[1] ?? '') ? 1 : 0, 1],
    ['a skill the project lacks, another tool and prose naming one add nothing', lines().length, 2],
  ]);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'skill-log', hook, selftest);
