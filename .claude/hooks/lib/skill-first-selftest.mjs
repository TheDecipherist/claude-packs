// skill-first's selftest, kept apart so the hook stays small: each row refused with its skill unloaded and passed once a Skill
// call or a Read of its SKILL.md loaded it; a skill named only in a command does not count; a row whose skill a project has not
// installed applies nowhere there; a project's own layout rows and circuit globs are honoured.
import { join } from 'node:path';
import { put, runHook, scratchProject, verdicts } from './selftest.mjs';

const skillFile = (skill) => ({ [`.claude/skills/${skill}/SKILL.md`]: `---\nname: ${skill}\n---\n` });

export function selftest(hook) {
  const dir = scratchProject({
    'src/a.cpp': 'x', 'sheets/board.png': 'x', 'scans/page.png': 'x',
    ...skillFile('read-a-circuit-diagram'), ...skillFile('analyse-reference-look'), ...skillFile('read-a-scan'),
  }, { guards: { circuitSkill: { sources: ['sheets/**'] }, skillFirst: [{ skill: 'read-a-scan', sources: ['scans/**'] }] } });
  const bare = scratchProject({ 'design/reference/screen.png': 'x' }); // installs no skill at all
  const sheet = join(dir, 'archive/Service Manual/tiles/03-t1.png');
  const manual = join(dir, 'archive/Juno-Service-Manual.pdf');
  const mock = join(dir, 'design/reference/edit_layer.webp');
  for (const f of [sheet, manual, mock]) put(f, 'x');
  const transcript = (name, uses) => {
    const file = join(dir, `${name}.jsonl`);
    put(file, uses.map((use) => JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', ...use }] } })).join('\n') + '\n');
    return file;
  };
  const none = transcript('none', [{ name: 'Read', input: { file_path: join(dir, 'src/a.cpp') } }]);
  const named = transcript('named', [{ name: 'Bash', input: { command: 'echo read-a-circuit-diagram/SKILL.md analyse-reference-look/SKILL.md' } }]);
  const circuit = transcript('circuit', [{ name: 'Skill', input: { skill: 'read-a-circuit-diagram' } }]);
  const look = transcript('look', [{ name: 'Read', input: { file_path: '/kit/packs/audio-core/skills/analyse-reference-look/SKILL.md' } }]);
  const scan = transcript('scan', [{ name: 'Skill', input: { skill: 'read-a-scan' } }]);
  const read = (file, t, cwd = dir) => runHook(hook, cwd, { tool_name: 'Read', tool_input: { file_path: file }, cwd, transcript_path: t });
  const bash = (command, t) => runHook(hook, dir, { tool_name: 'Bash', tool_input: { command }, cwd: dir, transcript_path: t });
  const render = `python3 -c "import pypdfium2" "${manual}"`;
  return verdicts('skill-first', [
    ['a service-manual tile read with its skill unloaded', read(sheet, none), 2],
    ['a skill path only named in a command does not count', read(sheet, named), 2],
    ['a render of a service manual with its skill unloaded', bash(render, none), 2],
    ['a sheet the layout names as circuit material', read(join(dir, 'sheets/board.png'), none), 2],
    ['the tile after a Skill call', read(sheet, circuit), 0],
    ['the render after the skill', bash(render, circuit), 0],
    ['a mock-up read with its skill unloaded', read(mock, none), 2],
    ['a mock-up with only the circuit skill loaded', read(mock, circuit), 2],
    ['the mock-up after a Read of its SKILL.md', read(mock, look), 0],
    ['a project\'s own row: its source unloaded', read(join(dir, 'scans/page.png'), none), 2],
    ['a project\'s own row: after its skill', read(join(dir, 'scans/page.png'), scan), 0],
    ['a project with the skill not installed', read(join(bare, 'design/reference/screen.png'), none, bare), 0],
    ['a plain source file', read(join(dir, 'src/a.cpp'), none), 0],
    ['a listing of the manual is not a reading', bash(`ls -la "${manual}"`, none), 0],
    ['no transcript: nothing to judge by', read(sheet, undefined), 0],
  ]);
}
