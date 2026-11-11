// settings-layer: a project's declared settings layer holds every setting the standard asks for. The contract, then the refusals of the old root files.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { requiredSettings } from '../../../packs/audio-core/hooks/lib/settings-standard.mts';
import { withLayout, write } from '../../fixtures/installs.mts';
import { fireAs } from '../../worktree-rig.mts';
import type { Checkouts } from '../../worktree-rig.mts';
import { fixture, holdsTheContract, installedWorktreeCase } from '../hook-rig.mts';

const ROWS = 'src/app/SettingsRows.cpp';
const rows = (ids: readonly string[]): string => `const SettingRow rows[] = { ${ids.map((id) => `{ "${id}" }`).join(', ')} };\n`;
const all = (): string[] => requiredSettings().map(([id]) => id);

async function worktreeCase(checkouts: Checkouts): Promise<void> {
  const { here, wt } = checkouts;
  // the worktree's layout declares the settings layer and main's does not: the worktree's file is judged by the worktree's layout
  withLayout(wt, { settingsLayer: { files: [ROWS] } });
  await installedWorktreeCase(checkouts, 'settings-layer.mjs');
  const fire = (file: string, ids: readonly string[]): number | null => fireAs(here, 'settings-layer.mjs', write(file, rows(ids))).status;
  assert.equal(fire(join(wt, ROWS), all().filter((id) => id !== 'midi.qwerty')), 2);
  assert.equal(fire(join(wt, ROWS), all()), 0);
  assert.equal(fire(join(here, ROWS), []), 0, 'main declares no settings layer');
}

holdsTheContract({
  hook: 'settings-layer.mjs',
  dir: () => fixture('audio-core'),
  worktree: worktreeCase,
  same: (project) => {
    withLayout(project, { settingsLayer: { files: [ROWS] } });
    return { payload: write(join(project, ROWS), rows([])), status: 2 };
  },
});
