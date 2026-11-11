// The worktree cases for hooks a pack other than base adds (synth-creator, gpu-painter, stellix, reverse-engineering): the
// worktree file each must allow and the one it must refuse, judged from the worktree's own checkout. worktrees.test.mjs
// joins them with base's own, and fails for an installed hook with no case.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { bash, caseFrom, fire, fireAs, installedCase, put } from './worktree-rig.mjs';
import { pathToFileURL } from 'node:url';
import { requiredSettings } from '../packs/audio-core/hooks/lib/settings-standard.mjs';
import { fresh, run } from './kit-cli.mjs';

// A hook of a pack other than base moved onto the contract (W4) exports its worktree case as data, but only an install holds it
// beside the base lib it imports: one scratch install, read here, as the cases of base's hooks read the source tree.
const INSTALLED = fresh('worktree-cases-packs-');
run(INSTALLED, 'init', '--config', 'synth-creator', 'cpp', 'audio-core', 'gpu-painter', 'reverse-engineering');
const caseOf = async (hook) => caseFrom(hook, (await import(pathToFileURL(join(INSTALLED, '.claude/hooks', hook)).href)).worktreeCase);

// A synth-creator hook's worktreeCase is read from its installed copy (installedCase), since its libs sit beside it only there.
export const PACK_CASES = {
  'protect-vendor.mjs': installedCase('protect-vendor.mjs'),
  'build-guard.mjs': installedCase('build-guard.mjs'),
  'time-guard.mjs': installedCase('time-guard.mjs'),
  'user-asks.mjs': installedCase('user-asks.mjs'),
  // the wake is timed, so its case needs the environment and stays a function (slice 6 rebuilds it)
  'idle-wake.mjs': async (checkouts) => {
    const { here, wt } = checkouts;
    await installedCase('idle-wake.mjs')(checkouts);
    const t = join(wt, 'transcript.jsonl');
    writeFileSync(t, '{}\n');
    const env = { IDLE_WAKE_MIN: '0.0005', IDLE_WAKE_LOOK_S: '0.01', TIMS_ASKS_LEDGER: join(wt, 'ledger.json') };
    assert.equal(fireAs(here, 'idle-wake.mjs', { hook_event_name: 'Stop', transcript_path: t, last_assistant_message: 'Next I would build P4.' }, env).status, 2);
  },
  'browser-guard.mjs': await caseOf('browser-guard.mjs'),
  'firmware-out-of-git.mjs': await caseOf('firmware-out-of-git.mjs'),
  'chart-first.mjs': async (checkouts) => {
    const { here, wt } = checkouts;
    await installedCase('chart-first.mjs')(checkouts);   // no committed chart: refused in the worktree and in main
    // the worktree's layout names a chart its HEAD holds (CLAUDE.md stands in for one); main's names the default, which it lacks
    put(join(wt, '.claude/layout.json'), JSON.stringify({ ...JSON.parse(readFileSync(join(wt, '.claude/layout.json'), 'utf8')), chart: 'CLAUDE.md' }));
    assert.equal(fire(here, 'chart-first.mjs', join(wt, 'src/dsp/Svf.cpp')), 0, 'judged by the worktree');
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
    const layout = JSON.parse(readFileSync(join(wt, '.claude/layout.json'), 'utf8'));
    put(join(wt, '.claude/layout.json'), JSON.stringify({ ...layout, settingsLayer: { files: ['src/app/SettingsRows.cpp'] } }));
    const rows = (ids) => `const SettingRow rows[] = { ${ids.map((id) => `{ "${id}" }`).join(', ')} };\n`;
    const all = requiredSettings().map(([id]) => id);
    assert.equal(fire(here, 'settings-layer.mjs', join(wt, 'src/app/SettingsRows.cpp'), rows(all.filter((id) => id !== 'midi.qwerty'))), 2);
    assert.equal(fire(here, 'settings-layer.mjs', join(wt, 'src/app/SettingsRows.cpp'), rows(all)), 0);
    assert.equal(fire(here, 'settings-layer.mjs', join(here, 'src/app/SettingsRows.cpp'), rows([])), 0, 'main declares no settings layer');
  },
};
