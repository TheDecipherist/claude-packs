// The worktree cases for hooks a pack other than base adds (synth-creator, gpu-painter, stellix, reverse-engineering): the
// worktree file each must allow and the one it must refuse, judged from the worktree's own checkout. worktrees.test.mjs
// joins them with base's own, and fails for an installed hook with no case.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { put } from '../packs/base/hooks/lib/files.mts';
import { requiredSettings } from '../packs/audio-core/hooks/lib/settings-standard.mts';
import { withLayout } from './fixtures/installs.mts';
import { fresh, run } from './kit-cli.mts';
import { bash, caseFrom, fire, fireAs, installedCase, worktreeCaseOf } from './worktree-rig.mts';
import type { Checkouts } from './worktree-rig.mts';

// A hook of a pack other than base moved onto the contract (W4) exports its worktree case as data, but only an install holds it
// beside the base lib it imports: one scratch install, read here, as the cases of base's hooks read the source tree.
const INSTALLED = fresh('worktree-cases-packs-');
run(INSTALLED, 'init', '--config', 'synth-creator', 'cpp', 'audio-core', 'gpu-painter', 'reverse-engineering');
const caseOf = async (hook: string): Promise<(checkouts: Checkouts) => void> => {
  const module: unknown = await import(pathToFileURL(join(INSTALLED, '.claude/hooks', hook)).href);
  return caseFrom(hook, worktreeCaseOf(module, hook));
};

type PackCase = (checkouts: Checkouts) => void | Promise<void>;

// A synth-creator hook's worktreeCase is read from its installed copy (installedCase), since its libs sit beside it only there.
export const PACK_CASES: Record<string, PackCase> = {
  'protect-vendor.mjs': installedCase('protect-vendor.mjs'),
  'build-guard.mjs': installedCase('build-guard.mjs'),
  'time-guard.mjs': installedCase('time-guard.mjs'),
  'user-asks.mjs': installedCase('user-asks.mjs'),
  // the wake is timed, so its case needs the environment and stays a function (slice 6 rebuilds it)
  'idle-wake.mjs': async (checkouts) => {
    const { here, wt } = checkouts;
    await installedCase('idle-wake.mjs')(checkouts);
    const t = join(wt, 'transcript.jsonl');
    put(t, '{}\n');
    const env = { IDLE_WAKE_MIN: '0.0005', IDLE_WAKE_LOOK_S: '0.01', TIMS_ASKS_LEDGER: join(wt, 'ledger.json') };
    assert.equal(fireAs(here, 'idle-wake.mjs', { hook_event_name: 'Stop', transcript_path: t, last_assistant_message: 'Next I would build P4.' }, env).status, 2);
  },
  'browser-guard.mjs': await caseOf('browser-guard.mjs'),
  'firmware-out-of-git.mjs': await caseOf('firmware-out-of-git.mjs'),
  'chart-first.mjs': async (checkouts) => {
    const { here, wt } = checkouts;
    await installedCase('chart-first.mjs')(checkouts);   // no committed chart: refused in the worktree and in main
    // the worktree's layout names a chart its HEAD holds (CLAUDE.md stands in for one); main's names the default, which it lacks
    withLayout(wt, { chart: 'CLAUDE.md' });
    assert.equal(fire(here, 'chart-first.mjs', join(wt, 'src/core/Svf.cpp')), 0, 'judged by the worktree');
  },
  // A non-base pack's hook cannot be imported from packs/ (its ./lib/ is base's, merged only by an install), so the worktree
  // cases of these hooks stay functions here, beside the `worktreeCase` data each hook exports, until slice 6 reads it from an install.
  'no-shipped-images.mjs': ({ here, wt }) => {
    assert.equal(fire(here, 'no-shipped-images.mjs', join(wt, 'src/painter/logo.png')), 2);
    assert.equal(fire(here, 'no-shipped-images.mjs', join(wt, 'tests/goldens/panel.png')), 0);
    assert.equal(bash(here, 'no-shipped-images.mjs', `cp /tmp/a.png ${join(wt, 'src/app/logo.png')}`), 2);
  },
  'settings-layer.mjs': ({ here, wt }) => {
    // the worktree's layout declares the settings layer and main's does not: the worktree's file is judged by the worktree's layout
    withLayout(wt, { settingsLayer: { files: ['src/app/SettingsRows.cpp'] } });
    const rows = (ids: readonly string[]) => `const SettingRow rows[] = { ${ids.map((id) => `{ "${id}" }`).join(', ')} };\n`;
    const all = requiredSettings().map(([id]) => id);
    assert.equal(fire(here, 'settings-layer.mjs', join(wt, 'src/app/SettingsRows.cpp'), rows(all.filter((id) => id !== 'midi.qwerty'))), 2);
    assert.equal(fire(here, 'settings-layer.mjs', join(wt, 'src/app/SettingsRows.cpp'), rows(all)), 0);
    assert.equal(fire(here, 'settings-layer.mjs', join(here, 'src/app/SettingsRows.cpp'), rows([])), 0, 'main declares no settings layer');
  },
};
