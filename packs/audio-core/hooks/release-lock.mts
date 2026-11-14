// The release lock: what a saved patch or a DAW song depends on is frozen at the first release, and only additions pass after it.
//   node release-lock.mjs --release   the release step: write .claude/release.lock.json (every parameter's kind, range, step and skew,
//                                     each choice list in order, the patch format, the factory bank's program numbers) and the id
//                                     lock (param-id-lock). Run it before tagging; run it again at each later release to lock the
//                                     additions. It refuses while the sources hold a change the lock would refuse.
//   node release-lock.mjs --status    exit 1 when a `v*` git tag exists and no release lock was written (run by hand or by a release script; doctor does not run it)
//   (as PostToolUse hook)             exit 2 when a write changes a locked fact: a range, step count or skew, a choice inserted,
//                                     moved or removed, the patch format, a program's number. Additions pass. Before the release
//                                     (no lock file) nothing is judged. The parameter ORDER is never locked: JUCE hashes each VST3
//                                     ParamID from its string id.
//   node release-lock.mjs --selftest  proves it
// How the hook knows a release happened: the lock file's presence. The release step writes it, and a `v*` tag is what --status
// reads to say the step was missed. Settings: .claude/release-lock.config.json { "patchFormat": ["<regex, one group>"],
// "programs": { "file": "data/factory.csv", "number": 0, "name": 1 } }; the ids are read as param-id-lock reads them.
// A file is judged in its own checkout: an agent worktree keeps its own lock.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readText } from './lib/files.mts';
import { contextOf, isMain, runAsHook, writeVerdict } from './lib/hook-log.mts';
import { readJson, toJson, writeJson } from './lib/json.mts';
import { judgeEachCheckout } from './lib/judge-checkouts.mts';
import { loadConfig, lockIds } from './lib/param-sources.mts';
import { SNAPSHOT_FILE, changesSince, programsFile, releaseSnapshot } from './lib/release-facts.mts';
import type { Snapshot } from './lib/release-facts.mts';
import { put, runHook, scratchProject, verdicts, writeOf } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { Hook, Verdict } from './lib/types.d.mts';
import { pass } from './lib/verdict.mts';

const lockPath = (root: string): string => join(root, SNAPSHOT_FILE);
const lockOf = (root: string): Snapshot | null => readJson<Snapshot>(lockPath(root), null);

/** Whether the project's git holds a tag `v*`: a loose ref or a packed one. */
function hasReleaseTag(root: string): boolean {
  const loose = join(root, '.git', 'refs', 'tags');
  if (existsSync(loose) && readdirSync(loose).some((t) => t.startsWith('v'))) return true;
  return /refs\/tags\/v/.test(readText(join(root, '.git', 'packed-refs')) ?? '');
}

export function status(root: string): Verdict {
  if (existsSync(lockPath(root)) || !hasReleaseTag(root)) return pass;
  return { code: 1, stdout: 'release-lock: a v* tag exists but no release lock was written, so nothing is locked. Run `node .claude/hooks/release-lock.mjs --release`.\n', stderr: '' };
}

/** `--release`: the snapshot written from the sources; its words, and the exit code. */
export function release(root: string): Verdict {
  const config = loadConfig(root, 'release-lock');
  if ('error' in config) return { code: 2, stdout: '', stderr: config.error };
  const now = releaseSnapshot(root, config);
  const was = lockOf(root);
  const broken = was ? changesSince(was, now) : [];
  if (broken.length) return { code: 1, stdout: '', stderr: `release-lock: not released, the sources change what the last release locked:\n  ${broken.join('\n  ')}\n` };
  writeJson(lockPath(root), now, { pretty: true });
  const ids = lockIds(root, config);
  return { code: 0, stdout: `Locked ${ids.size} ids, ${Object.keys(now.params).length} parameters, ${Object.keys(now.programs).length} programs in ${SNAPSHOT_FILE}\n`, stderr: '' };
}

const REFUSAL = 'The host stores a normalised 0..1 value, so a change of range, step count, skew or a choice list breaks saved automation and patches. ' +
  'Restore it; to change what a control means, add a NEW parameter and migrate old patches on load. Appending is fine. ' +
  'See .claude/rules/release-lock.md\n';

export const hook: Hook = judgeEachCheckout((root, settingsRoot, file) => {
  const was = lockOf(root);
  if (!was) return null; // no release yet: everything may change
  const config = loadConfig(settingsRoot, 'release-lock');
  if ('error' in config) return config.error;
  if (file && !config.extensions.test(file) && !file.endsWith(programsFile(root))) return undefined;
  const broken = changesSince(was, releaseSnapshot(root, config));
  return broken.length ? `Locked at the release, changed:\n  ${broken.join('\n  ')}\n${REFUSAL}` : null;
});

const PARAMS_H = 'src/params/Params.h';
const BANK = 'data/factory.csv';
const cutoffLine = (id: string, range: string): string => `layout.add (std::make_unique<juce::AudioParameterFloat> (juce::ParameterID { "${id}", 1 }, "${id}", juce::NormalisableRange<float> (${range}), 1000.0f));\n`;
const params = (range = '20.0f, 20000.0f, 0.0f, 0.3f', modes = '"Saw", "Pulse"', extra = ''): string =>
  `${cutoffLine('cutoff', range)}layout.add (std::make_unique<juce::AudioParameterChoice> (juce::ParameterID { "mode", 1 }, "Mode", juce::StringArray { ${modes} }, 0));\n${extra}`;
const bank = (...names: string[]): string => `program,name\n${names.map((n, i) => `${i},${n}`).join('\n')}\n`;

/** A worktree whose lock holds a range, and whose file changes it, is refused (PostToolUse: the edit is already on disk). */
export const worktreeCase: WorktreeCase = {
  files: {
    '{wt}/src/params/Params.h': cutoffLine('cutoff', '20.0f, 9000.0f, 0.0f, 0.3f'),
    '{wt}/.claude/release.lock.json': toJson({ released: 'x', params: { cutoff: { kind: 'Float', range: 'juce::NormalisableRange<float>(20.0f,20000.0f,0.0f,0.3f)' } }, patchFormat: [], programs: {} }),
  },
  steps: [{ label: 'a worktree that changes a locked range', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/src/params/Params.h' } }, want: 2 }],
};

export function selftest(): number {
  const hookFile = fileURLToPath(import.meta.url);
  const files = { [PARAMS_H]: params(), [BANK]: bank('Init', 'Pad') };
  const dir = scratchProject(files, { folders: {}, concepts: {} });
  const free = scratchProject(files, { folders: {}, concepts: {} });
  const at = (root: string, rel: string, text: string): number | null => (put(join(root, rel), text), runHook(hookFile, root, writeOf(join(root, rel), text)).status);
  const rangeBefore = at(free, PARAMS_H, params('20.0f, 9000.0f, 0.0f, 0.3f'));
  const released = runHook(hookFile, dir, null, ['--release']);
  const rangeChanged = at(dir, PARAMS_H, params('20.0f, 9000.0f, 0.0f, 0.3f'));
  const skewChanged = at(dir, PARAMS_H, params('20.0f, 20000.0f, 0.0f, 0.5f'));
  const inserted = at(dir, PARAMS_H, params(undefined, '"Saw", "Tri", "Pulse"'));
  const appended = at(dir, PARAMS_H, params(undefined, '"Saw", "Pulse", "Tri"', cutoffLine('drive', '0.0f, 1.0f')));
  const renumbered = at(dir, BANK, bank('Pad', 'Init'));
  const programAdded = at(dir, BANK, bank('Init', 'Pad', 'Bass'));
  const again = runHook(hookFile, dir, null, ['--release']).status;
  return verdicts('release-lock', [
    ['a range change before any release', rangeBefore, 0],
    ['--release writes the lock', released.status === 0 && existsSync(lockPath(dir)), true],
    ['a range change after the release', rangeChanged, 2],
    ['a skew change after the release', skewChanged, 2],
    ['a choice inserted mid-list after the release', inserted, 2],
    ['a choice and a parameter appended after the release', appended, 0],
    ['a renumbered program after the release', renumbered, 2],
    ['a program appended after the release', programAdded, 0],
    ['--release again with only additions', again, 0],
    ['--status with no tag', runHook(hookFile, free, null, ['--status']).status, 0],
  ]);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'release-lock', hook, selftest, {
  flags: {
    '--status': () => { const v = status(contextOf().projectDir); writeVerdict(v); return v.code; },
    '--release': () => { const v = release(contextOf().projectDir); writeVerdict(v); return v.code; },
  },
});
