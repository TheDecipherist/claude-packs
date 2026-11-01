// What an install switches on. A hook or a lesson check is behaviour: it refuses work. So a new one never
// switches on in a project that did not choose it:
//   - a pack the project is choosing now (init, add) brings all its hooks and checks, except its opt-in ones
//     (pack.json "optIn", e.g. tims-asks and idle-wake), which wait for the project's "enable" list;
//   - a pack the project already had brings a NEW hook or check (one it never had: not in the lock, not on disk, not
//     run by its settings.json) only when layout.json "enable" names it ("hooks/git-guard.py", "checks/x.json");
//   - what the project already had stays on.
// `update` prints both lists before it changes anything.
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { PACKS_DIR, planFiles, readPack } from './packs.mjs';
import { readSettings } from './settings.mjs';

const SWITCH = /^(hooks\/[\w-]+\.(mjs|py)|checks\/[\w-]+\.json)$/;
const listed = (list, packRel) => (list ?? []).some((d) => packRel === d || packRel.startsWith(`${d.replace(/\/$/, '')}/`));

export function switches(projectDir, packNames, layout, lock) {
  const hooks = JSON.stringify(readSettings(join(projectDir, '.claude')).hooks ?? {});
  const on = [];
  const held = [];
  for (const name of packNames) {
    const optIn = readPack(name).optIn ?? [];
    for (const { src, rel } of planFiles(name, layout)) {
      const packRel = relative(join(PACKS_DIR, name), src).replace(/\\/g, '/');
      if (!SWITCH.test(packRel)) continue;
      const had = lock.files[rel] !== undefined || existsSync(join(projectDir, rel)) ||
        (packRel.startsWith('hooks/') && hooks.includes(`.claude/hooks/${packRel.slice(6)}`));
      if (had) continue;
      const chosen = listed(layout.enable, packRel) || (!lock.packs.includes(name) && !optIn.includes(packRel));
      (chosen ? on : held).push(packRel);
    }
  }
  return { on, held };
}

export function reportSwitches({ on, held }, log) {
  if (on.length) log(`  switching on (new to this project): ${on.join(', ')}`);
  if (held.length) log(`  held back, not switched on (name them in "enable" in .claude/layout.json to switch them on): ${held.join(', ')}`);
}
