#!/usr/bin/env node
// PreToolUse (Write|Edit|MultiEdit): JUCE and other vendored code is read-only.
// Agents "fixing" a bug inside JUCE is a reported failure mode; fix our code or wrap the library instead.
// Projects add their own read-only paths (vendored copies) in .claude/layout.json "protected".
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { matchesAny } from './lib/glob.mjs';
import { readLayout } from './lib/layout.mjs';

const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const DEFAULT_GLOBS = ['JUCE/**', '**/JUCE/modules/**', 'JuceLibraryCode/**', 'libs/**', 'third_party/**', 'external/**', '_deps/**', 'build/**'];

function main() {
  let payload;
  try {
    payload = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return 0;
  }
  const file = payload.tool_input?.file_path;
  if (!file) return 0;
  const rel = relative(ROOT, file);
  if (rel.startsWith('..')) return 0;
  const globs = [...DEFAULT_GLOBS, ...(readLayout(ROOT).protected ?? [])];
  if (!matchesAny(rel, globs)) return 0;
  process.stderr.write(
    `BLOCKED by protect-vendor: ${rel} is vendored/generated code and is read-only.\n` +
      'Fix our own code, wrap the library, or ask the user if the library itself must change.\n',
  );
  return 2;
}

process.exit(main());
