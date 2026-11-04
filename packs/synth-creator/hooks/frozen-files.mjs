#!/usr/bin/env node
// PreToolUse (Write|Edit|MultiEdit|NotebookEdit|Bash): files on the frozen list cannot change, by any route
// (a tool, or the shell writing, copying, moving or deleting them; lib/writes.mjs).
// While a fix is in progress, the test that proves it, the golden renders and the sound
// fingerprints are frozen, so the fix can't be "made to pass" by moving the target.
// The list lives in .claude/state/frozen.json and is set by `node .claude/tools/freeze.mjs`.
// `--selftest` proves it.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { matchesAny } from './lib/glob.mjs';
import { insideProject, checkoutRoot } from './lib/project.mjs';
import { writesOf } from './lib/writes.mjs';
import { fileURLToPath } from 'node:url';
import { bashOf, editOf, runHook, scratchProject, verdicts } from './lib/selftest.mjs';
import { asHook, isMain } from './lib/hook-log.mjs';

const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const STATE = join(ROOT, '.claude', 'state', 'frozen.json');

function main(text) {
  if (!existsSync(STATE)) return 0;
  let payload;
  let state;
  try {
    payload = JSON.parse(text);
    state = JSON.parse(readFileSync(STATE, 'utf8'));
  } catch {
    return 0;
  }
  if (!Array.isArray(state.files) || state.files.length === 0) return 0;
  const hit = writesOf(payload, payload.cwd ?? process.cwd()).map((w) => w.path).filter((f) => insideProject(f)).map((f) => relative(checkoutRoot(f), f))
    .find((rel) => rel === '.claude/state/frozen.json' || matchesAny(rel, state.files));
  if (!hit) return 0;
  const rel = hit;
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
    ['the shell writing the frozen test', runHook(hook, dir, bashOf("cat > tests/bug_7_test.cpp <<'EOF'\nEXPECT (true);\nEOF", dir)), 2],
    ['the shell deleting a golden', runHook(hook, dir, bashOf('rm -f goldens/pad.wav', dir)), 2],
    ['the shell writing the code', runHook(hook, dir, bashOf('echo x >> src/dsp/Svf.cpp', dir)), 0],
  ]);
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? selftest() : await asHook('frozen-files', main));
