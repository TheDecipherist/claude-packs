#!/usr/bin/env node
// PreToolUse (Write|Edit|MultiEdit): files on the frozen list cannot change.
// While a fix is in progress, the test that proves it, the golden renders and the sound
// fingerprints are frozen, so the fix can't be "made to pass" by moving the target.
// The list lives in .claude/state/frozen.json and is set by `node .claude/tools/freeze.mjs`.
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { matchesAny } from './lib/glob.mjs';
import { insideProject, checkoutRoot } from './lib/project.mjs';

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

process.exit(main());
