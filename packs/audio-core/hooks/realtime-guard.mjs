#!/usr/bin/env node
// PreToolUse hook (Write|Edit|MultiEdit|NotebookEdit|Bash, every route: lib/writes.mjs): blocks writes that ADD realtime-unsafe code to
// audio-thread functions in C++ files. Exit 2 = block, stderr goes back to Claude.
import { readFileSync } from 'node:fs';
import { writesOf } from './lib/writes.mjs';
import { findViolations, violationKey } from './lib/realtime-checks.mjs';
import { insideProject } from './lib/project.mjs';

const CPP = /\.(cpp|cc|cxx|h|hh|hpp|mm)$/;

function main() {
  let payload;
  try {
    payload = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return 0;
  }
  for (const w of writesOf(payload)) {
    if (w.after === null || !CPP.test(w.path) || !insideProject(w.path)) continue;
    const code = judge(w.path, w);
    if (code) return code;
  }
  return 0;
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

process.exit(main());
