#!/usr/bin/env node
// PreToolUse hook (Write|Edit|MultiEdit|NotebookEdit|Bash, every route: lib/writes.mjs): blocks writes that ADD realtime-unsafe code to
// audio-thread functions in C++ files. Exit 2 = block, stderr goes back to Claude. `--selftest` proves it.
import { readFileSync } from 'node:fs';
import { writesOf } from './lib/writes.mjs';
import { findViolations, violationKey } from './lib/realtime-checks.mjs';
import { checkoutRoot, claudeRoot, insideProject } from './lib/project.mjs';
import { readLayout } from './lib/layout.mjs';
import { judgeSmoothing, smoothingConfig } from './lib/smoothing-checks.mjs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { editOf, runHook, scratchProject, verdicts, writeOf } from './lib/selftest.mjs';
import { asHook, isMain } from './lib/hook-log.mjs';

const CPP = /\.(cpp|cc|cxx|h|hh|hpp|mm)$/;

function main(text) {
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    return 0;
  }
  for (const w of writesOf(payload)) {
    if (w.after === null || !CPP.test(w.path) || !insideProject(w.path)) continue;
    const code = judge(w.path, w) || judgeSmooth(w);
    if (code) return code;
  }
  return 0;
}

// KWB-126: with `guards.smoothing` in layout.json, a control smoothed outside the project's smoothing module is refused too.
function judgeSmooth(w) {
  const cfg = smoothingConfig(readLayout(claudeRoot(w.path)));
  const msg = cfg && judgeSmoothing(w, relative(checkoutRoot(w.path), w.path), cfg);
  if (!msg) return 0;
  process.stderr.write(msg);
  return 2;
}

function judge(file, result) {
  const input = { file_path: file };

  const existing = new Set(findViolations(result.before).map(violationKey));
  const added = findViolations(result.after).filter((v) => !existing.has(violationKey(v)));
  if (added.length === 0) return 0;

  const lines = added.slice(0, 12).map((v) => `  line ${v.line} in ${v.func}(): ${v.why}\n      ${v.text}`);
  const more = added.length > 12 ? `\n  ...and ${added.length - 12} more` : '';
  process.stderr.write(
    `BLOCKED by realtime-guard: this edit adds realtime-unsafe code to audio-thread functions in ${input.file_path}\n` +
      `${lines.join('\n')}${more}\n\n` +
      'Fix: pre-allocate in prepareToPlay(), cache parameter pointers in the constructor, hand data to the UI via atomics/AbstractFifo + Timer.\n' +
      'If a line is a deliberate safe exception, end it with `// rt-ok: <reason>`.\n' +
      'See .claude/rules/audio-thread-realtime-safe.md.\n',
  );
  return 2;
}

function selftest() {
  const hook = fileURLToPath(import.meta.url);
  const block = (body) => `void Voice::processBlock (juce::AudioBuffer<float>& b, juce::MidiBuffer& m)\n{\n    juce::ScopedNoDenormals nd;\n${body}\n}\n`;
  const old = block('    auto* x = new float[64]; // legacy');
  const dir = scratchProject({ 'src/audio/Old.cpp': old });
  const w = (file, body) => runHook(hook, dir, writeOf(join(dir, file), block(body)));
  const cfg = { guards: { smoothing: { module: 'src/dsp/smooth/**', namespace: 'smooth', scope: ['src/audio/**', 'src/dsp/**', 'src/app/PluginProcessor*'] } } };
  const sm = scratchProject({ '.claude/layout.json': JSON.stringify(cfg), 'src/audio/Old.cpp': 'void Old::f()\n{\n    level += 0.1f * (target - level);\n}\n' });
  const none = scratchProject({});
  const s = (file, body, d = sm) => runHook(hook, d, writeOf(join(d, file), `void X::f()\n{\n${body}\n}\n`));
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
    ['smoothing: a slew already there is not added', runHook(hook, sm, editOf(join(sm, 'src/audio/Old.cpp'), 'void Old::f()', 'void Old::g()')), 0],
    ['smoothing: no guards.smoothing, the check is off', s('src/audio/Out.cpp', '    b.applyGain (outputGain);', none), 0],

    ['new in processBlock', w('src/audio/Voice.cpp', '    auto* x = new float[64];'), 2],
    ['a lock in processBlock', w('src/audio/Voice.cpp', '    const juce::ScopedLock sl (lock);'), 2],
    ['plain arithmetic', w('src/audio/Voice.cpp', '    b.applyGain (0.5f);'), 0],
    ['an rt-ok exception', w('src/audio/Voice.cpp', '    auto* x = new float[64]; // rt-ok: test only'), 0],
    ['a fault already there is not added', runHook(hook, dir, editOf(join(dir, 'src/audio/Old.cpp'), 'ScopedNoDenormals nd;', 'ScopedNoDenormals noDenormals;')), 0],
    ['not C++', runHook(hook, dir, writeOf(join(dir, 'tools/x.py'), 'x = [1]\n')), 0],
    ['another project is not ours', runHook(hook, dir, writeOf(join(dirname(dir), 'elsewhere/Voice.cpp'), block('    auto* x = new float[64];'))), 0],
  ]);
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? selftest() : await asHook('realtime-guard', main));
