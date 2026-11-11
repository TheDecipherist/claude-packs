// PreToolUse hook (Write|Edit|MultiEdit|NotebookEdit|Bash, every route: lib/writes.mjs): blocks writes that ADD realtime-unsafe code to
// audio-thread functions in C++ files. Exit 2 = block, stderr goes back to Claude. `--selftest` proves it.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, runAsHook } from './lib/hook-log.mts';
import { readLayout } from './lib/layout.mts';
import { claudeRoot } from './lib/project.mts';
import { findViolations, violationKey } from './lib/realtime-checks.mts';
import { editOf, runHook, scratchProject, snapshot, verdicts, writeOf, writtenSince } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import { judgeSmoothing, smoothingConfig } from './lib/smoothing-checks.mts';
import type { FileWrite, Hook } from './lib/types.d.mts';
import { judgeVerdict } from './lib/writes.mts';

const CPP = /\.(cpp|cc|cxx|h|hh|hpp|mm)$/;

// What a write adds that is realtime-unsafe in an audio-thread function, as the refusal text, or null.
function judge(w: FileWrite): string | null {
  const existing = new Set(findViolations(w.before ?? '').map(violationKey));
  const added = findViolations(w.after ?? '').filter((v) => !existing.has(violationKey(v)));
  if (added.length === 0) return null;

  const lines = added.slice(0, 12).map((v) => `  line ${v.line} in ${v.func}(): ${v.why}\n      ${v.text}`);
  const more = added.length > 12 ? `\n  ...and ${added.length - 12} more` : '';
  return `BLOCKED by realtime-guard: this edit adds realtime-unsafe code to audio-thread functions in ${w.path}\n` +
      `${lines.join('\n')}${more}\n\n` +
      'Fix: pre-allocate in prepareToPlay(), cache parameter pointers in the constructor, hand data to the UI via atomics/AbstractFifo + Timer.\n' +
      'If a line is a deliberate safe exception, end it with `// rt-ok: <reason>`.\n' +
      'See .claude/rules/audio-thread-realtime-safe.md.\n';
}

// KWB-126, 1.7.2: a control smoothed outside the project's smoothing module is refused too, always (lib/smoothing-checks.mjs).
export const hook: Hook = (event, ctx) => judgeVerdict(event, {
  name: 'realtime-guard',
  write: (w, rel) => {
    if (w.after === null || !CPP.test(w.path)) return null;
    return judge(w) ?? judgeSmoothing(w, rel, smoothingConfig(readLayout(claudeRoot(ctx.projectDir, w.path, ctx.cwd))));
  },
}, ctx);

const RT_BAD = 'void Voice::processBlock (juce::AudioBuffer<float>& b, juce::MidiBuffer& m) { auto* x = new float[64]; }\n';
const RT_GOOD = 'void Voice::processBlock (juce::AudioBuffer<float>& b, juce::MidiBuffer& m) { juce::ScopedNoDenormals noDenormals; b.clear(); }\n';

/** A write to the worktree's audio code is judged as one in the main checkout: the allocation is refused, the clean block is not. */
export const worktreeCase: WorktreeCase = {
  steps: [
    { label: 'new in processBlock, in the worktree', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/src/audio/Voice.cpp', content: RT_BAD } }, want: 2 },
    { label: 'a clean processBlock, in the worktree', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/src/audio/Voice.cpp', content: RT_GOOD } }, want: 0 },
  ],
};

export function selftest(): number {
  const hookFile = fileURLToPath(import.meta.url);
  const block = (body: string): string => `void Voice::processBlock (juce::AudioBuffer<float>& b, juce::MidiBuffer& m)\n{\n    juce::ScopedNoDenormals nd;\n${body}\n}\n`;
  const old = block('    auto* x = new float[64]; // legacy');
  const dir = scratchProject({ 'src/audio/Old.cpp': old });
  const w = (file: string, body: string): number | null => runHook(hookFile, dir, writeOf(join(dir, file), block(body))).status;
  const cfg = { guards: { smoothing: { module: 'src/dsp/smooth/**', namespace: 'smooth', scope: ['src/audio/**', 'src/dsp/**', 'src/app/PluginProcessor*'] } } };
  const sm = scratchProject({ 'src/audio/Old.cpp': 'void Old::f()\n{\n    level += 0.1f * (target - level);\n}\n' }, cfg);
  const none = scratchProject({});
  const off = scratchProject({}, { guards: { smoothing: { off: 'a tool with no audio thread' } } });
  const projects = [dir, sm, none, off];
  const before = projects.map((d) => snapshot(d));   // each project as the judge finds it: the rows below must leave it as it is
  const s = (file: string, body: string, d: string = sm): number | null => runHook(hookFile, d, writeOf(join(d, file), `void X::f()\n{\n${body}\n}\n`)).status;
  return verdicts('realtime-guard', [
    ['smoothing: the shipped per-block gain', s('src/audio/Out.cpp', '    audio.applyGain (link.volume() * outputGain);'), 2],
    ['smoothing: applyGain on a member', s('src/audio/Out.cpp', '    b.applyGain (outputGain);'), 2],
    ['smoothing: applyGain by channel and range', s('src/audio/Out.cpp', '    b.applyGain (0, 0, n, gain);'), 2],
    ['smoothing: FloatVectorOperations::multiply by a member', s('src/audio/Out.cpp', '    juce::FloatVectorOperations::multiply (p, masterLevel, n);'), 2],
    ['smoothing: multiply with a source and a scalar', s('src/audio/Out.cpp', '    juce::FloatVectorOperations::multiply (dst, src, level, n);'), 2],
    ['smoothing: addFrom with a gain member', s('src/audio/Out.cpp', '    b.addFrom (0, 0, v, 0, 0, n, voiceGain);'), 2],
    ['smoothing: applyGainRamp by hand', s('src/audio/Out.cpp', '    b.applyGainRamp (0, n, last, gain);'), 2],
    ['smoothing: a hand-made SmoothedValue', s('src/dsp/Filter.cpp', '    juce::SmoothedValue<float> cutoff;'), 2],
    ['smoothing: a LinearSmoothedValue', s('src/dsp/Filter.cpp', '    juce::LinearSmoothedValue<float> cutoff;'), 2],
    ['smoothing: a slew with +=', s('src/dsp/Filter.cpp', '    cutoff += k * (target - cutoff);'), 2],
    ['smoothing: a slew with the difference first', s('src/dsp/Filter.cpp', '    cutoff += (target - cutoff) * k;'), 2],
    ['smoothing: a slew as x = x + k * (t - x)', s('src/dsp/Filter.cpp', '    cutoff = cutoff + k * (target - cutoff);'), 2],
    ['smoothing: a slew as x = t + (x - t) * k', s('src/dsp/Filter.cpp', '    cutoff = target + (cutoff - target) * k;'), 2],
    ['smoothing: a coefficient from exp', s('src/dsp/Filter.cpp', '    const float k = std::exp (-1.0f / (seconds * sampleRate));'), 2],
    ['smoothing: the same in the processor', s('src/app/PluginProcessor.cpp', '    b.applyGain (volume);'), 2],
    ['smoothing: a literal gain', s('src/audio/Out.cpp', '    b.applyGain (0.5f);'), 0],
    ['smoothing: multiply by a literal', s('src/audio/Out.cpp', '    juce::FloatVectorOperations::multiply (p, 0.25f, n);'), 0],
    ['smoothing: multiply of two buffers', s('src/audio/Out.cpp', '    juce::FloatVectorOperations::multiply (p, b.getReadPointer (1), n);'), 0],
    ['smoothing: addFrom without a gain', s('src/audio/Out.cpp', '    b.addFrom (0, 0, v, 0, 0, n);'), 0],
    ['smoothing: a marked line with its reason', s('src/dsp/Comp.cpp', '    env += atk * (peak - env); // smooth-ok: the compressor\'s ballistics'), 0],
    ['smoothing: a marker without a reason', s('src/dsp/Comp.cpp', '    env += atk * (peak - env); // smooth-ok:'), 2],
    ['smoothing: the module itself', s('src/dsp/smooth/Smoother.h', '    juce::SmoothedValue<float> v;\n    x += k * (t - x);'), 0],
    ['smoothing: outside the scope', s('src/ui/Meter.cpp', '    level += k * (target - level);'), 0],
    ['smoothing: a slew already there is not added', runHook(hookFile, sm, editOf(join(sm, 'src/audio/Old.cpp'), 'void Old::f()', 'void Old::g()')).status, 0],
    // 1.7.2: always on. With no guards.smoothing the module is any folder named smooth and the scope the audio code; off only with a reason
    ['smoothing: no guards.smoothing, still judged', s('src/audio/Out.cpp', '    b.applyGain (outputGain);', none), 2],
    ['smoothing: no guards.smoothing, a folder named smooth is the module', s('src/dsp/smooth/Smooth.h', '    juce::SmoothedValue<float> v;', none), 0],
    ['smoothing: no guards.smoothing, outside the audio code', s('src/ui/Meter.cpp', '    level += k * (target - level);', none), 0],
    ['smoothing: guards.smoothing cannot switch it off', s('src/audio/Out.cpp', '    b.applyGain (outputGain);', off), 2],
    ['a bypass switched in one sample', s('src/audio/Path.cpp', '    if (bypassed)\n        wet.copyFrom (0, 0, dry, 0, 0, n);', none), 2],
    ['a bypass read from a call', s('src/audio/Path.cpp', '    if (! isBypassed())\n        process (b);', none), 2],
    ['a bypass through the module', s('src/dsp/smooth/Fade.h', '    if (bypassed) target = 0.0f;', none), 0],
    ['a bypass marked with its reason', s('src/audio/Path.cpp', '    if (bypassed) return; // smooth-ok: the crossfade above has reached the dry side', none), 0],

    ['new in processBlock', w('src/audio/Voice.cpp', '    auto* x = new float[64];'), 2],
    ['a lock in processBlock', w('src/audio/Voice.cpp', '    const juce::ScopedLock sl (lock);'), 2],
    ['plain arithmetic', w('src/audio/Voice.cpp', '    b.applyGain (0.5f);'), 0],
    ['an rt-ok exception', w('src/audio/Voice.cpp', '    auto* x = new float[64]; // rt-ok: test only'), 0],
    ['a fault already there is not added', runHook(hookFile, dir, editOf(join(dir, 'src/audio/Old.cpp'), 'ScopedNoDenormals nd;', 'ScopedNoDenormals noDenormals;')).status, 0],
    ['not C++', runHook(hookFile, dir, writeOf(join(dir, 'tools/x.py'), 'x = [1]\n')).status, 0],
    ['another project is not ours', runHook(hookFile, dir, writeOf(join(dirname(dir), 'elsewhere/Voice.cpp'), block('    auto* x = new float[64];'))).status, 0],
    ['a judge writes no file (the write trap)', projects.flatMap((d, i) => writtenSince(d, before[i] ?? new Map())).join(','), ''],
  ]);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'realtime-guard', hook, selftest);
