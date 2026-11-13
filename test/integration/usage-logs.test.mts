// L1 skill-log, L2 rule-log and `logs skills|rules`: in a scratch project with base installed, a scripted session (payloads through the
// runner, as Claude Code sends them) uses one skill and loads one rule; `logs` then prints a skill-use row, a rule-applied row and the
// installed skills and rules never used. A rotated log counts too.
import { copyInstall, fixture } from '../fixtures/installs.mts';
import { assert, hookRun, join, put, test } from '../kit-cli.mts';
import { logsCommand } from '../../lib/logs.mts';
import { toJson } from '../../packs/base/hooks/lib/json.mts';
import { readText, scratchDir } from '../../packs/base/hooks/lib/files.mts';

const RUNNER = 'run-hooks.mjs';

function session(): string {
  const dir = copyInstall(fixture('base'), scratchDir('usage-logs-'));
  put(join(dir, '.claude/skills/used-skill/SKILL.md'), '---\nname: used-skill\ndescription: Use when a test needs it\n---\n# s\n');
  put(join(dir, '.claude/skills/idle-skill/SKILL.md'), '---\nname: idle-skill\ndescription: Use when a test needs it\n---\n# s\n');
  put(join(dir, '.claude/rules/applied-rule.md'), '# r\n');
  const send = (ev: Record<string, unknown>): void => {
    const r = hookRun(dir, RUNNER, { session_id: 'sess-1', cwd: dir, ...ev });
    assert.equal(r.status, 0, r.stdout + r.stderr);
  };
  send({ hook_event_name: 'InstructionsLoaded', file_path: join(dir, '.claude/rules/applied-rule.md'), load_reason: 'path_glob_match', globs: ['src/**'], trigger_file_path: join(dir, 'src/a.ts') });
  send({ hook_event_name: 'PostToolUse', tool_name: 'Skill', tool_input: { skill: 'used-skill' } });
  return dir;
}

const said = (dir: string, ...args: string[]): string[] => { const out: string[] = []; logsCommand(dir, args, (l) => out.push(l)); return out; };

test('a session that uses a skill and loads a rule shows a skill-use row, a rule-applied row and the never-used lists', () => {
  const dir = session();
  assert.match(readText(join(dir, '.claude/logs/skills.jsonl')) ?? '', /"skill":"used-skill","via":"tool"/);
  assert.match(readText(join(dir, '.claude/logs/rules.jsonl')) ?? '', /"rule":"applied-rule".*"why":"path_glob_match"/);
  const skills = said(dir, 'skills');
  assert.ok(skills.some((l) => l.startsWith('skill-use used-skill ') && l.includes('tool 1')), skills.join('\n'));
  assert.ok(skills.some((l) => l.startsWith('never used') && l.includes('idle-skill') && !l.includes('used-skill,')), skills.join('\n'));
  const rules = said(dir, 'rules');
  assert.ok(rules.some((l) => l.startsWith('rule-applied applied-rule ') && l.includes('path_glob_match 1')), rules.join('\n'));
  assert.ok(rules.some((l) => l.startsWith('never loaded') && !l.includes('applied-rule')), rules.join('\n'));
});

test('a use in a rotated log counts, and a skill no longer installed is marked', () => {
  const dir = session();
  put(join(dir, '.claude/logs/skills-20260101-000000.jsonl'), `${toJson({ t: '2026-01-01T00:00:00Z', session: 'old', skill: 'idle-skill', via: 'prompt' })}\n${toJson({ t: '2026-01-01T00:00:01Z', skill: 'gone-skill', via: 'tool' })}\n`);
  const skills = said(dir, 'skills');
  assert.ok(skills.some((l) => l.startsWith('skill-use idle-skill ') && l.includes('prompt 1')), skills.join('\n'));
  assert.ok(skills.some((l) => l.startsWith('skill-use gone-skill ') && l.includes('[not installed]')), skills.join('\n'));
  assert.ok(skills.some((l) => l.startsWith('never used') && !l.includes('idle-skill') && !l.includes('used-skill') && !l.includes('gone-skill')), skills.join('\n'));
});
