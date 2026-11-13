// making-check: a turn that wrote code must carry its making line, or the Stop is sent back. The hook's contract, then its refusals.
import { join } from 'node:path';
import { conceptsIn, unknownConcepts } from '../../../packs/base/hooks/lib/making-concepts.mts';
import { normaliseShape } from '../../../packs/base/hooks/lib/shape-model.mts';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';
import { writesOfTurn } from '../../../packs/base/hooks/lib/turn.mts';
import type { ToolUse } from '../../../packs/base/hooks/lib/turn.mts';
import { git } from '../../fixtures/installs.mts';
import { assert, hookRun, put, test } from '../../kit-cli.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';
import { cppFunction, workProject } from '../work-project.mts';

holdsTheContract({
  hook: 'making-check.mjs',
  dir: () => fixture('base'),
  same: (project) => ({ payload: { hook_event_name: 'Stop', cwd: project, session_id: 'same-verdict' }, status: 0 }),
});

const MANIFEST = normaliseShape({
  concepts: {
    editPage: { shape: 'many', generator: 'pagesOf(p)', words: ['editPage', 'editPages'] },
    paramSlot: { shape: 'many', generator: 'slotId(i)', words: ['paramSlot', 'paramSlots'] },
    program: { shape: 'many', generator: 'programAt(i)' },
  },
});

test('KF-19, KF-39: a making line that names a camelCase concept names it, by row or by word', () => {
  assert.deepEqual([...conceptsIn('concepts: editPage, many; paramSlot (many)', MANIFEST)].sort(), ['editPage', 'paramSlot']);
  assert.deepEqual([...conceptsIn('the editPages array', MANIFEST)], ['editPage']);
  assert.deepEqual([...conceptsIn('an edit of the page', MANIFEST)], [], 'the two words apart are not the concept');
});

test('KF-24: the shape word after a concept is no concept, and a second list after ; is read', () => {
  assert.deepEqual(unknownConcepts('making: x; concepts: editPage, many; paramSlot, many; reuse: y', MANIFEST), []);
  assert.deepEqual(unknownConcepts('making: x; concepts: program, one; widget, many; reuse: y', MANIFEST), ['widget']);
});

test('KWB-215: prose after a concepts list is no concept, a one-word item or a word and its shape is', () => {
  assert.deepEqual(unknownConcepts('making: x; concepts: program (one); never a bare literal; reuse: y', MANIFEST), []);
  assert.deepEqual(unknownConcepts('making: x; concepts: program, one; never; widget, many; reuse: y', MANIFEST), ['never', 'widget']);
});

const use = (name: string, input: ToolUse['input']): ToolUse => ({ name, input, cwd: '/p' });

test('KF-34: what a turn landed is over: only the writes after its last landing are this step\'s', () => {
  const turn = { uses: [use('Write', { file_path: '/p/tools/a.py', content: 'x' }), use('Bash', { command: 'git merge --ff-only work/x 2>&1 | tail -1' }), use('Write', { file_path: '/p/tools/b.py', content: 'y' })] };
  assert.deepEqual(writesOfTurn(turn, '/p', process.env).map((w) => w.path), ['/p/tools/b.py']);
  assert.deepEqual(writesOfTurn({ uses: turn.uses.slice(0, 2) }, '/p', process.env), []);
  assert.deepEqual(writesOfTurn({ uses: [turn.uses[0] ?? use('Write', {}), use('Bash', { command: "git commit -m 'merge --ff-only'" })] }, '/p', process.env).map((w) => w.path), ['/p/tools/a.py'], 'words about a merge land nothing');
});

const line = (o: unknown): string => `${toJson(o)}\n`;

test('KF-33: a write once-only already judged is not judged again at Stop; a shell write still is', () => {
  const dir = workProject();
  put(join(dir, 'design/shape.json'), '{"concepts":{}}\n');
  put(join(dir, 'build.md'), '# b\n\n## In progress\n\n- x (work/x). making: a; concepts: none; reuse: none\n\n## Steps\n');
  put(join(dir, 'src/a.cpp'), cppFunction('first'));
  git(dir, 'add', 'src/a.cpp', 'build.md', 'design/shape.json');
  git(dir, 'commit', '-qm', 'x');
  put(join(dir, 'src/b.cpp'), cppFunction('second'));
  const stopAfter = (name: string, input: Record<string, unknown>) => {
    const transcript = join(dir, 'turn.jsonl');
    put(transcript, line({ type: 'user', message: { role: 'user', content: 'go' } }) + line({ type: 'assistant', cwd: dir, message: { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name, input }] } }));
    return hookRun(dir, 'making-check.mjs', { hook_event_name: 'Stop', session_id: `s${Math.random()}`, cwd: dir, transcript_path: transcript }).status;
  };
  assert.equal(stopAfter('Write', { file_path: join(dir, 'src/b.cpp'), content: cppFunction('second') }), 0);
  assert.equal(stopAfter('Bash', { command: 'cp src/a.cpp src/b.cpp' }), 2);
});
