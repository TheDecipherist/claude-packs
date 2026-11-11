// What an install switches on. A hook or a lesson check is behaviour: it refuses work. So a new one never
// switches on in a project that did not choose it:
//   - a pack the project is choosing now (init, add) brings all its hooks and checks, except its opt-in ones
//     (pack.json "optIn", e.g. user-asks and idle-wake), which wait for the project's "enable" list;
//   - a pack the project already had brings a NEW hook or check (one it never had: not in the lock, not on disk, not
//     run by its settings.json) only when layout.json "enable" names it ("hooks/git-guard.mjs", "checks/x.json");
//   - what the project already had stays on.
// `update` prints both lists before it changes anything.
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Layout, Lock, Logger } from '../packs/base/hooks/lib/types.d.mts';
import { HOOK_FILE, packRoot, planFiles, readPack } from './packs.mts';
import { OLD_ASKS, readSettings } from './settings.mts';

/** What the lists of a switch hold: pack-relative paths, `hooks/<name>` or `checks/<name>.json`. */
export interface Switches { on: string[]; held: string[] }

// A hook as a pack ships it (its emitted .mjs, or a Python hook: HOOK_FILE) or a lesson check.
const SWITCH = /^(?:hooks\/[\w-]+\.[a-z]+|checks\/[\w-]+\.json)$/;
const isSwitch = (packRel: string): boolean => SWITCH.test(packRel) && (packRel.startsWith('checks/') || HOOK_FILE.test(packRel));
const renamed = (d: string): string => (d === `hooks/${OLD_ASKS}` ? 'hooks/user-asks.mjs' : d);
const listed = (list: readonly string[] | undefined, packRel: string): boolean =>
  (list ?? []).map(renamed).some((d) => packRel === d || packRel.startsWith(`${d.replace(/\/$/, '')}/`));

/** The hooks and checks of the packs that switch on now, and those held back (a pack the project already had, a new item it
 *  did not name in "enable"). */
export function switches(projectDir: string, packNames: readonly string[], layout: Layout, lock: Lock): Switches {
  const hooks = JSON.stringify(readSettings(join(projectDir, '.claude')).hooks ?? {});
  const on: string[] = [];
  const held: string[] = [];
  for (const name of packNames) {
    const pack = readPack(name);
    const optIn = pack.optIn ?? [];
    const onByDefault = Array.isArray(pack['onByDefault']) ? (pack['onByDefault'] as readonly string[]) : []; // the law (pack.json "onByDefault"): on in every project, new or updated
    for (const { src, rel } of planFiles(name, layout)) {
      const packRel = relative(packRoot(name), src).replace(/\\/g, '/');
      if (!isSwitch(packRel)) continue;
      // A hook counts as had under either of its names: a Node hook's Python forerunner (git-guard.py) is the same hook.
      const names = packRel.startsWith('hooks/') ? [packRel, packRel.replace(/\.(mjs|py)$/, '.py'), packRel.replace(/\.(mjs|py)$/, '.mjs')] : [packRel];
      if (packRel === 'hooks/user-asks.mjs') names.push(`hooks/${OLD_ASKS}`, `hooks/${OLD_ASKS.replace('.mjs', '.py')}`);
      const had = names.some((n) => lock.files[`.claude/${n}`] !== undefined || existsSync(join(projectDir, '.claude', n)) ||
        (n.startsWith('hooks/') && hooks.includes(`.claude/${n}`))) || lock.files[rel] !== undefined;
      if (had) continue;
      const chosen = names.some((n) => listed(layout.enable, n)) || onByDefault.includes(packRel) || (!lock.packs.includes(name) && !optIn.includes(packRel));
      (chosen ? on : held).push(packRel);
    }
  }
  return { on, held };
}

/** What `update` prints before it changes anything. */
export function reportSwitches({ on, held }: Switches, log: Logger): void {
  if (on.length) log(`  switching on (new to this project): ${on.join(', ')}`);
  if (held.length) log(`  held back, not switched on (name them in "enable" in .claude/layout.json to switch them on): ${held.join(', ')}`);
}
