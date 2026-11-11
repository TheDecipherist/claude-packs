// PreToolUse (Write|Edit|MultiEdit|NotebookEdit|Bash): files on the frozen list cannot change, by any route (a tool, or the shell
// writing, copying, moving or deleting them; lib/writes.mts). While a fix is in progress, the test that proves it, the golden
// renders and the sound fingerprints are frozen, so the fix can't be "made to pass" by moving the target.
// The list lives in .claude/state/frozen.json and is set by `node .claude/tools/freeze.mjs`. `--selftest` proves it.
// On the hook contract (typescript order W4): a judge; the state is read, never written.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchesAny } from './lib/glob.mts';
import { isMain, runAsHook } from './lib/hook-log.mts';
import { readJson } from './lib/json.mts';
import { bashOf, editOf, put, runHook, scratchProject, snapshot, verdicts, writtenSince } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { Hook } from './lib/types.d.mts';
import { pass } from './lib/verdict.mts';
import { judgeVerdict } from './lib/writes.mts';

const STATE = join('.claude', 'state', 'frozen.json');

/** `.claude/state/frozen.json`, as freeze.mjs writes it. */
interface Frozen { files?: unknown; reason?: unknown; since?: unknown }

/** The frozen globs of a project and why, or null when nothing is frozen (no file, or a list with nothing in it). */
function frozenOf(root: string): { files: string[]; reason: string } | null {
  const state = readJson<Frozen>(join(root, STATE));
  const files = Array.isArray(state?.files) ? state.files.filter((f): f is string => typeof f === 'string') : [];
  return state && files.length ? { files, reason: typeof state.reason === 'string' ? state.reason : 'a fix is in progress' } : null;
}

export const hook: Hook = (event, ctx) => {
  const frozen = frozenOf(ctx.projectDir);
  if (!frozen) return pass;
  return judgeVerdict(event, {
    name: 'frozen-files',
    write: (_w, rel) => (rel === '.claude/state/frozen.json' || matchesAny(rel, frozen.files)
      ? `${rel} is frozen (${frozen.reason}).\nFix the code, not the test or the golden file. Unfreeze (node .claude/tools/freeze.mjs off) only when the\n` +
        'fix is green, or after the user agrees the target itself is wrong.'
      : null),
  }, ctx);
};

/** A frozen test and a golden are refused in a worktree, the code being fixed is not. */
export const worktreeCase: WorktreeCase = {
  files: { '{here}/.claude/state/frozen.json': JSON.stringify({ files: ['tests/**'], reason: 'bug 7' }) },
  steps: [
    { label: 'a frozen test in the worktree', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/tests/svf_test.cpp', content: '// x\n' } }, want: 2 },
    { label: 'the code being fixed in the worktree', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/src/dsp/Svf.cpp', content: '// x\n' } }, want: 0 },
  ],
};

export function selftest(): number {
  const me = fileURLToPath(import.meta.url);
  const frozen = JSON.stringify({ files: ['tests/bug_7*', 'goldens/**'], reason: 'bug 7' });
  const dir = scratchProject({ '.claude/state/frozen.json': frozen });
  const idle = scratchProject();
  put(join(idle, '.claude/state/frozen.json'), JSON.stringify({ files: [] }));   // an empty list freezes nothing
  const before = snapshot(dir);
  const e = (root: string, file: string): number | null => runHook(me, root, editOf(join(root, file))).status;
  return verdicts('frozen-files', [
    ['the test that proves the fix', e(dir, 'tests/bug_7_test.cpp'), 2],
    ['a golden render', e(dir, 'goldens/pad.wav'), 2],
    ['the code being fixed', e(dir, 'src/dsp/Svf.cpp'), 0],
    ['the frozen list itself', e(dir, '.claude/state/frozen.json'), 2],
    ['nothing frozen', e(scratchProject(), 'tests/bug_7_test.cpp'), 0],
    ['an empty list freezes nothing', e(idle, 'tests/bug_7_test.cpp'), 0],
    ['another project is not ours', runHook(me, dir, editOf(join(dirname(dir), 'elsewhere/tests/bug_7.cpp'))).status, 0],
    ['the shell writing the frozen test', runHook(me, dir, bashOf("cat > tests/bug_7_test.cpp <<'EOF'\nEXPECT (true);\nEOF", dir)).status, 2],
    ['the shell deleting a golden', runHook(me, dir, bashOf('rm -f goldens/pad.wav', dir)).status, 2],
    ['the shell writing the code', runHook(me, dir, bashOf('echo x >> src/dsp/Svf.cpp', dir)).status, 0],
    ['a judge writes no file (the write trap)', writtenSince(dir, before).join(','), ''],
  ]);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'frozen-files', hook, selftest);
