#!/usr/bin/env node
// PreToolUse (Write|Edit|MultiEdit): files on the frozen list cannot change.
// While a fix is in progress, the test that proves it, the golden renders and the sound
// fingerprints are frozen, so the fix can't be "made to pass" by moving the target.
// The list lives in .claude/state/frozen.json and is set by `node .claude/tools/freeze.mjs`.
// `--selftest` proves it.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { matchesAny } from './lib/glob.mjs';
import { insideProject, checkoutRoot } from './lib/project.mjs';
import { fileURLToPath } from 'node:url';
import { editOf, runHook, scratchProject, verdicts } from './lib/selftest.mjs';

const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const STATE = join(ROOT, '.claude', 'state', 'frozen.json');

function main() {
  if (!existsSync(STATE)) return 0;
  let payload;
  let state;
  try {
    payload = JSON.parse(readFileSync(0, 'utf8'));
    state = JSON.parse(readFileSync(STATE, 'utf8'));
  } catch {
    return 0;
  }
  const file = payload.tool_input?.file_path;
  if (!file || !insideProject(file) || !Array.isArray(state.files) || state.files.length === 0) return 0;
  const rel = relative(checkoutRoot(file), file);
  if (rel !== '.claude/state/frozen.json' && !matchesAny(rel, state.files)) return 0;
  process.stderr.write(
    `BLOCKED by frozen-files: ${rel} is frozen (${state.reason ?? 'a fix is in progress'}).\n` +
      'Fix the code, not the test or the golden file. Unfreeze (node .claude/tools/freeze.mjs off) only when the\n' +
      'fix is green, or after the user agrees the target itself is wrong.\n',
  );
  return 2;
}

function selftest() {
  const hook = fileURLToPath(import.meta.url);
  const frozen = JSON.stringify({ files: ['tests/bug_7*', 'goldens/**'], reason: 'bug 7' });
  const dir = scratchProject({ '.claude/state/frozen.json': frozen });
  const idle = scratchProject();
  const e = (root, file) => runHook(hook, root, editOf(join(root, file)));
  return verdicts('frozen-files', [
    ['the test that proves the fix', e(dir, 'tests/bug_7_test.cpp'), 2],
    ['a golden render', e(dir, 'goldens/pad.wav'), 2],
    ['the code being fixed', e(dir, 'src/dsp/Svf.cpp'), 0],
    ['the frozen list itself', e(dir, '.claude/state/frozen.json'), 2],
    ['nothing frozen', e(idle, 'tests/bug_7_test.cpp'), 0],
    ['another project is not ours', runHook(hook, dir, editOf(join(dirname(dir), 'elsewhere/tests/bug_7.cpp'))), 0],
  ]);
}

process.exit(process.argv.includes('--selftest') ? selftest() : main());
