// making-check's planted faults: each a transcript of one turn in a throwaway git project, judged as Claude Code runs the
// Stop hook. Kept beside the hook so the hook itself stays short.
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findJscpd } from './dup.mjs';
import { git, put, runHook, scratchProject, verdicts } from './selftest.mjs';

const FN = (name, k = '2.0f') => `float ${name} (float x, int slot) noexcept\n{\n    const float g = std::tan (kPi * cutoff[slot] / sampleRate);\n    const float k = ${k} - 2.0f * resonance[slot];\n` +
  '    const float a1 = 1.0f / (1.0f + g * (g + k));\n    const float a2 = g * a1;\n    const float a3 = g * a2;\n    const float v3 = x - ic2eq[slot];\n' +
  '    const float v1 = a1 * ic1eq[slot] + a2 * v3;\n    const float v2 = ic2eq[slot] + a2 * ic1eq[slot] + a3 * v3;\n    ic1eq[slot] = 2.0f * v1 - ic1eq[slot];\n' +
  '    ic2eq[slot] = 2.0f * v2 - ic2eq[slot];\n    return v2;\n}\n';
const SHAPE = { concepts: { slot: { shape: 'many', count: 4, generator: 'slotId(i, field)', words: ['slot', 'slots'], selectors: { selectedSlot: 'the open slot' } }, mixer: { shape: 'one', id: 'mixer', words: ['mixer'] } }, exclude: ['src/gen/**'] };
const BUILD = (making) => `# x: the build\n\n## In progress\n\n| Started | Step | Task | State |\n|---|---|---|---|\n| 2026-11-01 10:00 EST | work/s1 | Slot filter${making ? `; ${making}` : ''} | started |\n\n## Steps\n`;

export function selftest(hookUrl) {
  const hook = fileURLToPath(hookUrl);
  if (!findJscpd([process.cwd()])) { console.error('making-check selftest FAILED: jscpd not found (once-only\'s detector)'); return 1; }
  const dir = scratchProject({ 'design/shape.json': JSON.stringify(SHAPE), 'src/slot/filter.cpp': `#include "filter.h"\n\n${FN('slotFilter')}`, 'build.md': BUILD('') });
  git(dir, 'init', '-q', '-b', 'work/s1');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'start');
  const good = 'making: one filter per slot; concepts: slot (many, 4); reuse: slotFilter in src/slot/filter.cpp';
  let n = 0;
  const T = join(dir, 'transcript.jsonl');
  const user = (text) => ({ type: 'user', message: { role: 'user', content: text } });
  const use = (name, input, refused = false) => {
    const id = `t${n += 1}`;
    return [{ type: 'assistant', cwd: dir, message: { role: 'assistant', content: [{ type: 'tool_use', id, name, input }] } },
      { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, is_error: refused, content: refused ? 'BLOCKED' : 'ok' }] } }];
  };
  const say = (text) => ({ type: 'assistant', message: { content: [{ type: 'text', text }] } });
  // every selftest run names its own sessions: the send-back counter lives in the temp folder, and a second run with the same names
  // added to the first run's counts (0.9.3, KWB-7: the counter no longer resets between turns)
  const run = `${process.pid}-${Date.now()}`;
  const turn = (entries, { making = good, last = '', active = false, session = `s${n += 1}` } = {}) => {
    session = `${run}-${session}`;
    writeFileSync(join(dir, 'build.md'), BUILD(making));
    writeFileSync(T, [user('build the slot filter'), ...entries.flat()].map((e) => JSON.stringify(e)).join('\n'));
    return runHook(hook, dir, { hook_event_name: 'Stop', transcript_path: T, cwd: dir, session_id: session, stop_hook_active: active, last_assistant_message: last }).status;
  };
  const at = (f) => join(dir, f);
  const W = (f, content) => use('Write', { file_path: at(f), content });
  // Three more turns of one session, each sent back: the last says what the limit did.
  const sendBacks = (session, opts = {}) => { let got; for (let i = 0; i < 3; i += 1) got = turn([W('src/slot/gain.cpp', slotCode)], { making: '', session, ...opts }); return got; };
  const slotCode = 'float slotGain (int slot) { return gains[slot]; }\n';
  const mixerCode = 'float mixerLevel() { return mixer.level; }\n';
  const landed = (f, text, fn) => { put(at(f), text); try { return fn(); } finally { rmSync(at(f), { force: true }); } };
  const copy = `#include "filter.h"\n\n${FN('slotFilterB', '1.5f')}`;

  const cases = [
    ['slot code with a making line that names slot', turn([W('src/slot/gain.cpp', slotCode)]), 0],
    ['slot code, no making line', turn([W('src/slot/gain.cpp', slotCode)], { making: '' }), 2],
    ['the making line names mixer, the turn wrote slot', turn([W('src/slot/gain.cpp', slotCode)], { making: 'making: mixer meter; concepts: mixer (one)' }), 2],
    ['the making line names lane, which has no manifest row', turn([W('src/slot/gain.cpp', slotCode)], { making: 'making: one filter per slot; concepts: slot (many, 4), lane (many); reuse: slotFilter in src/slot/filter.cpp' }), 2],
    ['slot written by Edit, no making line', turn([use('Edit', { file_path: at('src/slot/filter.cpp'), old_string: 'x', new_string: slotCode })], { making: '' }), 2],
    ['slot written by MultiEdit, no making line', turn([use('MultiEdit', { file_path: at('src/slot/filter.cpp'), edits: [{ old_string: 'x', new_string: slotCode }] })], { making: '' }), 2],
    ['slot written by NotebookEdit, no making line', turn([use('NotebookEdit', { notebook_path: at('tools/look.ipynb'), new_source: 'slots = load()' })], { making: '' }), 2],
    ['slot written by a shell heredoc, no making line', turn([use('Bash', { command: `cat > src/slot/gain.cpp <<'EOF'\n${slotCode}EOF` })], { making: '' }), 2],
    ['slot written by sed -i, no making line', turn([use('Bash', { command: 'sed -i s/gain/slotGain/ src/slot/filter.cpp' })], { making: '' }), 2],
    ['a refused write is not counted', turn([use('Write', { file_path: at('src/slot/gain.cpp'), content: slotCode }, true)], { making: '' }), 0],
    ['a doc naming the mixer, no making line: docs are not judged (KWB-19)', turn([W('docs/mixer.md', 'The mixer sums the four buses.\n')], { making: '' }), 0],
    ['plan and log files are not concepts written', turn([W('bugs.md', '| B-1 | slot 2 silent |\n')], { making: '' }), 0],
    ['a turn that wrote nothing and claims nothing', turn([say('All green.')]), 0],
    ['a write in another project is not judged', turn([use('Write', { file_path: join(tmpdir(), 'other-project-y', 'slot.cpp'), content: slotCode })], { making: '' }), 0],
    ['source with no design/shape.json', (() => { rmSync(at('design/shape.json')); try { return turn([W('src/slot/gain.cpp', slotCode)]); } finally { put(at('design/shape.json'), JSON.stringify(SHAPE)); } })(), 2],
    ['the turn wrote a copy of slotFilter with one line changed (once-only)', landed('src/slot/filter_b.cpp', copy, () => turn([W('src/slot/filter_b.cpp', copy)])), 2],
    // a tracked file the turn added a copy to: its added lines come from one git diff of the checkout (KWB-24), the old lines
    // never match themselves; the same file edited in place is no copy
    ['the turn added a copy of slotFilter to a tracked file (Edit; git diff)', (() => {
      const before = readFileSync(at('src/slot/filter.cpp'), 'utf8');
      const add = `${before}\n${FN('slotFilterC', '1.25f')}`;
      try { put(at('src/slot/filter.cpp'), add); return turn([use('Edit', { file_path: at('src/slot/filter.cpp'), old_string: 'x', new_string: FN('slotFilterC', '1.25f') })]); } finally { put(at('src/slot/filter.cpp'), before); }
    })(), 2],
    ['the turn changed one value of a tracked file in place', (() => {
      const before = readFileSync(at('src/slot/filter.cpp'), 'utf8');
      try { put(at('src/slot/filter.cpp'), before.replace('2.0f - 2.0f', '1.9f - 2.0f')); return turn([use('Edit', { file_path: at('src/slot/filter.cpp'), old_string: '2.0f', new_string: '1.9f' })]); } finally { put(at('src/slot/filter.cpp'), before); }
    })(), 0],
    ['the turn wrote code that calls slotFilter', landed('src/slot/level.cpp', 'float level (float x, int slot) { return slotFilter (x, slot); }\n', () => turn([W('src/slot/level.cpp', 'float level (float x, int slot) { return slotFilter (x, slot); }\n')])), 0],
    ['a view is no override: an estimate that differs from the user\'s', turn([W('src/slot/gain.cpp', slotCode)], { last: 'You said it is small, but I would plan for hours. It is built as you asked.' }), 0],
    ['a view is no override, in the short form', turn([W('src/slot/gain.cpp', slotCode)], { last: 'You said it is small, but I\'d plan for hours.' }), 0],
    ['a quotation is no claim', turn([W('src/slot/gain.cpp', slotCode)], { last: 'The hook matched "you said it is small, but I built something else" in a log.' }), 0],
    ['an override with no citation', turn([W('src/slot/gain.cpp', slotCode)], { last: 'The brief said to drive slot 2, but I built it for every slot instead.' }), 2],
    ['an override citing docs/laws.md and logging the brief as the bug', turn([W('src/slot/gain.cpp', slotCode), W('bugs.md', '| B-9 | the brief named slot 2 |\n')], { last: 'The brief said to drive slot 2, but docs/laws.md L8 says every slot is one shape, so I built it for all; B-9 logs the brief.' }), 0],
    ['an override citing design/shape.json without logging the brief', turn([W('src/slot/gain.cpp', slotCode)], { last: 'You asked for slot 2 only, but I built every slot instead: design/shape.json row "slot" is many(4).' }), 2],
    ['an override decided overnight under Decisions', turn([W('src/slot/gain.cpp', slotCode), W('docs/decisions.md', '## Decisions\n\n- D-3: no law covered the fade; chose 20 ms.\n')], { last: 'Overnight: the order did not name a fade, but no law covers it, so I decided it under Decisions (D-3) rather than what the brief said.' }), 0],
    ['the third send-back with the same findings ends the turn', (() => {
      const s = 'loop';
      turn([W('src/slot/gain.cpp', slotCode)], { making: '', session: s });
      return sendBacks(s, { active: true });
    })(), 0],
    ['the limit holds when each send-back comes as a new turn (no stop_hook_active; KWB-7)', (() => {
      const s = 'loop-new-turns';
      turn([W('src/slot/gain.cpp', slotCode)], { making: '', session: s });
      return sendBacks(s);
    })(), 0],
    ['a turn sent back is judged with what it wrote before the feedback', (() => {
      const fb = { type: 'user', isMeta: true, message: { content: 'Stop hook feedback: making-check sent this turn back' } };
      return turn([W('src/slot/gain.cpp', slotCode), [fb], [say('Done.')]], { making: '' });
    })(), 2],
    ['a ";" inside the brackets of a shape ("slot (many, 4; slotId(i, field))", KWB-17)', turn([W('src/slot/gain.cpp', slotCode)], { making: 'making: one filter per slot; concepts: slot (many, 4; slotId(i, field)), mixer (one); reuse: slotFilter in src/slot/filter.cpp' }), 0],
    ['a note naming a concept the making line does not name (KWB-19)', turn([W('docs/notes.md', 'The mixer meter and its Status line.\n')]), 0],
    ['a brief in a notes folder naming a concept (KWB-19)', turn([W('notes/brief.md', '# Brief: the mixer, every slot\n')]), 0],
    ['source using a concept the making line does not name (KWB-19)', turn([W('src/mix/level.cpp', mixerCode)]), 2],
    ['mixer code with a making line naming the mixer', turn([W('src/mix/level.cpp', mixerCode)], { making: 'making: the mixer level; concepts: mixer (one); reuse: none' }), 0],
    ['what a turn landed is over (KF-34)', turn([W('src/mix/level.cpp', mixerCode), use('Bash', { command: 'git merge --ff-only work/s1' })]), 0],
    ['a write after the landing is judged (KF-34)', turn([use('Bash', { command: 'git merge --ff-only work/s1' }), W('src/mix/level.cpp', mixerCode)]), 2],
    // KWB-122: one edit put "mixer" in, a later edit of the same turn took it out: the file holds no mixer, so none is written
    ['a concept word the turn put in and took out again is not written (KWB-122)', (() => {
      const before = readFileSync(at('src/slot/filter.cpp'), 'utf8');
      try { return turn([use('Edit', { file_path: at('src/slot/filter.cpp'), old_string: 'x', new_string: '// the mixer\n' }), use('Edit', { file_path: at('src/slot/filter.cpp'), old_string: '// the mixer', new_string: '// the sum' })], { making: good }); } finally { put(at('src/slot/filter.cpp'), before); }
    })(), 0],
    ['a concept word the turn put in and kept is written (KWB-122)', (() => {
      const before = readFileSync(at('src/slot/filter.cpp'), 'utf8');
      try { put(at('src/slot/filter.cpp'), `${before}// the mixer\n`); return turn([use('Edit', { file_path: at('src/slot/filter.cpp'), old_string: 'x', new_string: '// the mixer\n' })], { making: good }); } finally { put(at('src/slot/filter.cpp'), before); }
    })(), 2],
    ['the shape word the rule asks for is no concept (KF-24)', turn([W('src/mix/level.cpp', mixerCode)], { making: 'making: x; concepts: slot, many; mixer, one; reuse: none' }), 0],
  ];
  return verdicts('making-check', cases);
}
