// making-check: a turn ends only when what it wrote is what it said it was making (claude-packs 0.9.0 item 7; KWB-1).
// A Stop hook. It reads the turn from the transcript (lib/turn.mjs: every file written by Write, Edit, MultiEdit,
// NotebookEdit or the shell, refused calls left out) and sends the turn back (exit 2) naming what is missing when:
//   - the turn wrote code or docs that touch a concept of design/shape.json and build.md's In progress entry for this
//     step has no `making:` line, or the line does not name that concept;
//   - the making line names a concept that has no row in design/shape.json, or the turn wrote source with no manifest;
//   - a source file the turn wrote repeats code the repo already has (once-only's detector, lib/dup.mjs, on the lines
//     the working tree adds against HEAD);
//   - THE OVERRIDE RULE: the turn's text says it did something other than what it was told, and cites no law. Told X
//     and a law file (design/shape.json, docs/*-spec.md, docs/laws.md) says Y: do Y, log the brief as the bug, cite the
//     line. No law covers it: ask; overnight, decide and write it under Decisions, and cite that entry. There is no
//     third case where Claude's own judgement overrides an instruction.
// After three send-backs with the same findings the turn ends and the findings go to the user (no endless loop).
// A judge on the hook contract (W4): it writes nothing. The send-back counter it once kept as it judged is the recorder
// making-check-count's; this hook only reads it (lib/send-backs.mts). What it finds is lib/making-check-turn.mts.
//   node making-check.mjs --selftest
import { isMain, runAsHook } from './lib/hook-log.mjs';
import { check } from './lib/making-check-turn.mjs';
import { selftest as selftestOf } from './lib/making-check-selftest.mjs';
import { MAX_SENDS, endsTheTurn, sendBackFile } from './lib/send-backs.mjs';
import { pass, refuse, say } from './lib/verdict.mjs';
export const hook = (event, ctx) => {
    if (event.hook_event_name && !['Stop', 'SubagentStop'].includes(event.hook_event_name))
        return pass;
    const problems = check(event, ctx);
    if (!problems.length)
        return pass;
    if (endsTheTurn(sendBackFile(ctx.env, event.session_id), problems)) {
        return say({ systemMessage: `making-check sent this turn back ${MAX_SENDS} times with the same findings; it ends here for you to decide:\n- ${problems.join('\n- ')}` });
    }
    return refuse(`making-check sent this turn back:\n- ${problems.join('\n- ')}`);
};
const SHAPE = JSON.stringify({ concepts: { slot: { shape: 'many', count: 4, generator: 'slotId(i, field)', words: ['slot', 'slots'] } }, exclude: [] });
const MAKING = '# x\n\n## In progress\n\n| when | work/x | the gain; making: one gain per slot; concepts: slot (many, 4); reuse: slotGain in src/dsp/Gain.cpp | started |\n\n## Steps\n';
const GAIN = 'float slotGain (int slot) { return gains[slot]; }\n';
/** The transcript of a turn that wrote src/dsp/Gain.cpp in `into`, from a session sitting in `cwd`. */
const wrote = (cwd, into) => [
    { type: 'user', message: { content: 'go' } },
    { type: 'assistant', cwd, message: { content: [{ type: 'tool_use', id: 'w1', name: 'Write', input: { file_path: `${into}/src/dsp/Gain.cpp`, content: GAIN } }] } },
].map((e) => JSON.stringify(e)).join('\n');
const stop = (cwd, transcript, session) => ({ hook_event_name: 'Stop', transcript_path: transcript, cwd, session_id: session });
/** Each worktree's writes are judged by its own manifest and making line (KWB-155, Stellix WB-86): the worktree has both and
 *  passes; main has neither and is sent back; a write into the worktree from the main checkout is judged by the worktree's. */
export const worktreeCase = {
    files: {
        '{wt}/design/shape.json': SHAPE,
        '{wt}/build.md': MAKING,
        '{wt}/t-in-wt.jsonl': wrote('{wt}', '{wt}'),
        '{here}/t-in-here.jsonl': wrote('{here}', '{here}'),
        '{here}/t-into-wt.jsonl': wrote('{here}', '{wt}'),
    },
    steps: [
        { label: 'the worktree has its manifest and its making line', event: stop('{wt}', '{wt}/t-in-wt.jsonl', 'wtc-a'), want: 0 },
        { label: 'main has neither', event: stop('{here}', '{here}/t-in-here.jsonl', 'wtc-b'), want: 2 },
        { label: 'a write into the worktree, from the main checkout, is judged by the worktree', event: stop('{here}', '{here}/t-into-wt.jsonl', 'wtc-c'), want: 0 },
    ],
};
export const selftest = () => selftestOf(import.meta.url, new URL('./making-check-count.mjs', import.meta.url).href);
if (isMain(import.meta.url))
    await runAsHook(import.meta.url, 'making-check', hook, selftest);
