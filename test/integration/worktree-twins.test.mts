// KWB-155: a session that works in two worktrees of one repo writes the same file in both (stacked branches). Each write is
// judged against its own checkout; a file is never a copy of itself in another checkout.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { toJson } from '../../packs/base/hooks/lib/json.mts';
import { git } from '../kit-cli.mts';
import { fireAs, project, put } from '../worktree-rig.mts';

const SVF = 'float Svf::process (float x) noexcept\n{\n    const float g = std::tan (kPi * cutoff / sampleRate);\n    const float k = 2.0f - 2.0f * resonance;\n' +
  '    const float a1 = 1.0f / (1.0f + g * (g + k));\n    const float a2 = g * a1;\n    const float a3 = g * a2;\n    const float v3 = x - ic2eq;\n' +
  '    const float v1 = a1 * ic1eq + a2 * v3;\n    const float v2 = ic2eq + a2 * ic1eq + a3 * v3;\n    ic1eq = 2.0f * v1 - ic1eq;\n    ic2eq = 2.0f * v2 - ic2eq;\n    return v2;\n}\n';
const SHAPE = { concepts: {}, exclude: [] };
const BUILD = '# x\n\n## In progress\n\n- the filter; making: the state-variable filter; concepts: none; reuse: Svf::process in src/dsp/Svf.cpp\n\n## Steps\n';

test('making-check judges each worktree\'s writes against its own checkout: the same file in two worktrees is no copy (KWB-155)', () => {
  const { here, wt } = project(['audio-core']);
  put(join(wt, 'design/shape.json'), toJson(SHAPE));
  put(join(wt, 'build.md'), BUILD);
  git(wt, 'add', 'design/shape.json', 'build.md');
  git(wt, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'manifest');
  git(here, 'worktree', 'add', '-q', '.claude/worktrees/agent-y', '-b', 'work/y', 'work/x');
  const wt2 = join(here, '.claude/worktrees/agent-y');
  const bashWrite = (id: string, file: string): unknown => ({ type: 'tool_use', id, name: 'Bash', input: { command: `cat > ${file} <<'EOF'\n${SVF}EOF` } });
  const turn: unknown[] = [];
  for (const [i, dir] of [wt, wt2].entries()) {
    const file = join(dir, 'src/dsp/Svf.cpp');
    put(file, SVF);
    turn.push({ type: 'assistant', cwd: wt, message: { content: [bashWrite(`w${i}`, file)] } });
  }
  const t = join(wt, 'transcript.jsonl');
  writeFileSync(t, [{ type: 'user', message: { content: 'go' } }, ...turn].map((e) => toJson(e)).join('\n'));
  const r = fireAs(here, 'making-check.mjs', { hook_event_name: 'Stop', transcript_path: t, cwd: wt, session_id: `twins-${process.pid}` });
  assert.doesNotMatch(r.stderr, /did not pass once-only/, r.stderr);
  assert.equal(r.status, 0, r.stderr);
  // the law still holds inside one checkout: the same function twice in one worktree is a copy
  const copy = join(wt2, 'src/dsp/SvfAgain.cpp');
  put(copy, SVF.replace('Svf::', 'SvfAgain::'));
  writeFileSync(t, [{ type: 'user', message: { content: 'go' } }, { type: 'assistant', cwd: wt2, message: { content: [bashWrite('w9', copy)] } }]
    .map((e) => toJson(e)).join('\n'));
  const again = fireAs(here, 'making-check.mjs', { hook_event_name: 'Stop', transcript_path: t, cwd: wt2, session_id: `twins-b-${process.pid}` });
  assert.match(again.stderr, /did not pass once-only/, 'a copy inside one worktree is still refused');
});
