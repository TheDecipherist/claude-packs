#!/usr/bin/env node
// PreToolUse hook (Write|Edit|MultiEdit): blocks edits that ADD realtime-unsafe code to
// audio-thread functions in C++ files. Exit 2 = block, stderr goes back to Claude. `--selftest` proves it.
import { readFileSync } from 'node:fs';
import { computeEdit } from './lib/apply-edit.mjs';
import { findViolations, violationKey } from './lib/realtime-checks.mjs';
import { insideProject } from './lib/project.mjs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { editOf, runHook, scratchProject, verdicts, writeOf } from './lib/selftest.mjs';

const CPP = /\.(cpp|cc|cxx|h|hh|hpp|mm)$/;

function main() {
  let payload;
  try {
    payload = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return 0;
  }
  const input = payload.tool_input ?? {};
  if (!CPP.test(input.file_path ?? '') || !insideProject(input.file_path)) return 0;

  const result = computeEdit(payload.tool_name, input);
  if (!result) return 0;

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
  return verdicts('realtime-guard', [
    ['new in processBlock', w('src/audio/Voice.cpp', '    auto* x = new float[64];'), 2],
    ['a lock in processBlock', w('src/audio/Voice.cpp', '    const juce::ScopedLock sl (lock);'), 2],
    ['plain arithmetic', w('src/audio/Voice.cpp', '    b.applyGain (0.5f);'), 0],
    ['an rt-ok exception', w('src/audio/Voice.cpp', '    auto* x = new float[64]; // rt-ok: test only'), 0],
    ['a fault already there is not added', runHook(hook, dir, editOf(join(dir, 'src/audio/Old.cpp'), 'ScopedNoDenormals nd;', 'ScopedNoDenormals noDenormals;')), 0],
    ['not C++', runHook(hook, dir, writeOf(join(dir, 'tools/x.py'), 'x = [1]\n')), 0],
    ['another project is not ours', runHook(hook, dir, writeOf(join(dirname(dir), 'elsewhere/Voice.cpp'), block('    auto* x = new float[64];'))), 0],
  ]);
}

process.exit(process.argv.includes('--selftest') ? selftest() : main());
