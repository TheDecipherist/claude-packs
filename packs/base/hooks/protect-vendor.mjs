#!/usr/bin/env node
// PreToolUse (Write|Edit|MultiEdit): JUCE and other vendored code is read-only.
// Agents "fixing" a bug inside JUCE is a reported failure mode; fix our code or wrap the library instead.
// Projects add their own read-only paths (vendored copies) in .claude/layout.json "protected".
// `--selftest` proves it.
import { readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { matchesAny } from './lib/glob.mjs';
import { checkoutRoot, claudeRoot } from './lib/project.mjs';
import { readLayout } from './lib/layout.mjs';
import { fileURLToPath } from 'node:url';
import { editOf, git, put, runHook, scratchProject, verdicts } from './lib/selftest.mjs';

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
  const root = checkoutRoot(file);
  const rel = relative(root, file);
  if (rel.startsWith('..')) return 0;
  const globs = [...DEFAULT_GLOBS, ...(readLayout(claudeRoot(file)).protected ?? [])];
  if (!matchesAny(rel, globs)) return 0;
  process.stderr.write(
    `BLOCKED by protect-vendor: ${rel} is vendored/generated code and is read-only.\n` +
      'Fix our own code, wrap the library, or ask the user if the library itself must change.\n',
  );
  return 2;
}

// A git project with FetchContent's JUCE clone under build/_deps and an agent worktree.
function selftest() {
  const hook = fileURLToPath(import.meta.url);
  const dir = scratchProject({ 'src/dsp/Svf.cpp': '// svf\n', 'design/ref.md': 'x\n' }, { folders: {}, concepts: {}, protected: ['design/**'] });
  git(dir, 'init', '-q');
  git(dir, 'add', 'src', '.claude');
  git(dir, 'commit', '-qm', 'init');
  git(dir, 'worktree', 'add', '-q', '.claude/worktrees/agent-x', '-b', 'work/x');
  put(join(dir, 'build/_deps/juce-src/modules/juce_core/juce_core.h'), '// juce\n');
  git(join(dir, 'build/_deps/juce-src'), 'init', '-q');
  const wt = join(dir, '.claude/worktrees/agent-x');
  const e = (file) => runHook(hook, dir, editOf(join(dir, file)));
  return verdicts('protect-vendor', [
    ['our own source', e('src/dsp/Svf.cpp'), 0],
    ['JUCE modules', e('JUCE/modules/juce_core/juce_core.h'), 2],
    ['a nested clone under build/_deps (Sub37 WB-2)', e('build/_deps/juce-src/modules/juce_core/juce_core.h'), 2],
    ['a layout "protected" glob', e('design/ref.md'), 2],
    ['a worktree file is judged in the worktree', runHook(hook, dir, editOf(join(wt, 'src/dsp/Svf.cpp'))), 0],
    ['a worktree\'s vendored folder', runHook(hook, dir, editOf(join(wt, 'third_party/lib/lib.h'))), 2],
    ['another project is not ours', runHook(hook, dir, editOf(join(dirname(dir), 'elsewhere/JUCE/x.h'))), 0],
  ]);
}

process.exit(process.argv.includes('--selftest') ? selftest() : main());
