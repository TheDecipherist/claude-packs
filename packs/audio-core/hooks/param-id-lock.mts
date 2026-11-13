// Locks parameter IDs: once a release holds an ID, it may never disappear from the source. The lock starts at the first release, never
// at the first sighting: before it an id may be renamed or dropped freely (DECIDED "E57 replaced").
//   node param-id-lock.mjs --init   the release step for ids: write .claude/param-ids.lock.json (a later release adds the new ids)
//   node param-id-lock.mjs --status exit 1, saying why, when a lock exists, holds no ids and the unit has parameters (doctor runs it)
//   (as PostToolUse hook)           fail (exit 2) if a locked ID is gone; with no lock, nothing is judged. Every route that
//                                   writes is judged (Write, Edit, MultiEdit, NotebookEdit, and the shell's >, >>, tee,
//                                   sed -i, cp, mv, rm, a heredoc; lib/writes.mjs): an id deleted by `sed -i` is gone too.
//   node param-id-lock.mjs --selftest  proves it
// Where IDs are read: lib/param-sources.mjs (shared with release-lock). A file is judged in its own checkout: an agent worktree is
// scanned, and keeps its lock, on its own. The ids are one row of the release lock; release-lock judges the rest.
import { existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readText } from './lib/files.mts';
import { contextOf, isMain, runAsHook, writeVerdict } from './lib/hook-log.mts';
import { readJson } from './lib/json.mts';
import { CONFIG, PARAMETER_WORDS, collectIds, lockFile, lockIds, loadConfig, lockedIds, sourcesOf } from './lib/param-sources.mts';
import type { IdConfig } from './lib/param-sources.mts';
import { judgeEachCheckout } from './lib/judge-checkouts.mts';
import { put, runHook, scratchProject, verdicts, writeOf } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { Hook, Verdict } from './lib/types.d.mts';
import { pass } from './lib/verdict.mts';

// KF-15: ids built from a table or a generator are invisible to the default patterns, and a lock with nothing in it protects nothing.
// No lock yet is no release yet: nothing to say.
export function status(root: string): Verdict {
  if (!existsSync(lockFile(root))) return pass;
  const config = loadConfig(root);
  if ('error' in config) return { code: 1, stdout: config.error, stderr: '' };
  if (lockedIds(root).length) return pass;
  for (const file of sourcesOf(root, config.extensions)) {
    if (!PARAMETER_WORDS.test(readText(file) ?? '')) continue;
    return {
      code: 1,
      stdout: `param-id-lock: ${relative(root, file)} makes parameters and the lock holds no ids, so it protects nothing. ` +
        `Say where the ids are in ${CONFIG} ("extensions", "patterns"), then \`node .claude/hooks/param-id-lock.mjs --init\`.\n`,
      stderr: '',
    };
  }
  return pass;
}

/** `--init`: the release step for ids; its words, and the exit code. */
export function init(root: string): Verdict {
  const config = loadConfig(root);
  if ('error' in config) return { code: 2, stdout: '', stderr: config.error };
  const ids = lockIds(root, config);
  return { code: 0, stdout: `Locked ${ids.size} parameter IDs in ${relative(root, lockFile(root))}\n`, stderr: '' };
}

// The checkout's own lock only: main's lock may hold ids a worktree branch never had. No lock: no release yet, nothing judged.
function judge(root: string, config: IdConfig): string | null {
  if (!existsSync(lockFile(root))) return null;
  const current = collectIds(root, config);
  const missing = lockedIds(root).filter((id) => !current.has(id));
  if (missing.length === 0) return null;
  return `Parameter IDs removed or renamed since the release: ${missing.join(', ')}\n` +
    'IDs never change once released (saved patches and host automation use them). ' +
    'Restore them; if a control changed meaning, add a NEW ID and migrate old patches in setStateInformation. ' +
    'See .claude/rules/parameter-ids-never-change.md\n';
}

export const hook: Hook = judgeEachCheckout((root, settingsRoot, file) => {
  const config = loadConfig(settingsRoot);
  if ('error' in config) return config.error;
  if (file && !config.extensions.test(file)) return undefined; // not a file ids are written in
  return judge(root, config);
});

const PARAMS = (...ids: string[]): string => ids.map((id) => `auto p_${id} = juce::ParameterID { "${id}", 1 };`).join('\n') + '\n';

/** A worktree that drops an id its own lock holds is refused, though main still has it (PostToolUse: the edit is already on disk).
 *  The steps after it (a new id joining the worktree's lock, never main's) read the lock files, and stay with the test's own case. */
export const worktreeCase: WorktreeCase = {
  files: { '{wt}/src/params/Params.h': PARAMS('cutoff') },
  steps: [
    { label: 'a worktree that drops an id its lock holds', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/src/params/Params.h' } }, want: 2 },
  ],
};

export function selftest(): number {
  const hookFile = fileURLToPath(import.meta.url);
  const dir = scratchProject({ 'src/params/Params.h': PARAMS('cutoff', 'res') }, { folders: {}, concepts: {} });
  const unreleased = scratchProject({ 'src/params/Params.h': PARAMS('cutoff') }, { folders: {}, concepts: {} });
  const file = join(dir, 'src/params/Params.h');
  const free = join(unreleased, 'src/params/Params.h');
  const post = (text: string): number | null => (put(file, text), runHook(hookFile, dir, writeOf(file, text)).status);
  const before = (text: string): number | null => (put(free, text), runHook(hookFile, unreleased, writeOf(free, text)).status);
  const locked = (): string[] => readJson<string[]>(join(dir, '.claude/param-ids.lock.json'), []) ?? [];
  const noLock = (): boolean => !existsSync(join(unreleased, '.claude/param-ids.lock.json'));
  const renamedBefore = before(PARAMS('cutoff_hz'));
  const droppedBefore = before(PARAMS());
  const unlockedAfter = noLock();
  const initStatus = runHook(hookFile, dir, null, ['--init']).status;
  const lockedAtRelease = locked().join();
  const removed = post(PARAMS('cutoff'));
  const renamed = post(PARAMS('cutoff', 'resonance'));
  const added = post(PARAMS('cutoff', 'res', 'drive'));
  return verdicts('param-id-lock', [
    ['an id renamed before any release', renamedBefore, 0],
    ['an id dropped before any release', droppedBefore, 0],
    ['no first sighting starts a lock', unlockedAfter, true],
    ['--status before any release', runHook(hookFile, unreleased, null, ['--status']).status, 0],
    ['--init (the release) writes the lock', initStatus === 0 && lockedAtRelease === 'cutoff,res', true],
    ['an id removed after the release', removed, 2],
    ['an id renamed after the release', renamed, 2],
    ['an id added after the release', added, 0],
    ['an added id is not locked until the next release', locked().includes('drive'), false],
    ['another project is not ours', runHook(hookFile, dir, writeOf(join(dirname(dir), 'elsewhere/Params.h'))).status, 0],
    ['--status: a lock with ids', runHook(hookFile, dir, null, ['--status']).status, 0],
  ]);
}

// `--init` and `--status` are by-hand modes (doctor runs `--status`): their words go to the process's streams.
if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'param-id-lock', hook, selftest, {
  flags: {
    '--status': () => { const v = status(contextOf().projectDir); writeVerdict(v); return v.code; },
    '--init': () => { const v = init(contextOf().projectDir); writeVerdict(v); return v.code; },
  },
});
