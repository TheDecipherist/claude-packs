// The `configs` and `config <name>` commands, and doctor's configuration line (0.10.0, STEP 3 item 1).
import { join } from 'node:path';
import { readLayout } from '../packs/base/hooks/lib/layout.mts';
import type { Logger } from '../packs/base/hooks/lib/types.d.mts';
import { allowedPacks, describeConfigs, describeSwitch, packsFor, readConfig, resolveConfig } from './configs.mts';
import { doctor } from './doctor.mts';
import { readLock } from './manifest.mts';
import { sync } from './sync.mts';

export { describeConfigs, readConfig };

export const layoutConfiguration = (dir: string): string | null => readLayout(dir).configuration ?? null;

export interface SwitchOptions { force?: boolean; dryRun?: boolean; log?: Logger }

/** Switch a project to configuration `name`: the packs it has that the new one takes stay; with none left, the new one's
 *  default packs. What changes is printed first; --dry-run stops there. */
export async function switchConfig(dir: string, name: string | undefined, installed: readonly string[], { force = false, dryRun = false, log = console.log }: SwitchOptions = {}): Promise<number> {
  if (!name) throw new Error('name the configuration: `config <name>` (`configs` lists them)');
  if (installed.length === 0) throw new Error('nothing installed here; run `init --config <name>` first');
  const to = readConfig(name);
  const layout = readLayout(dir);
  const { config: from } = resolveConfig({ layout, packs: installed });
  const fromSources = packsFor(from, installed);
  const kept = installed.filter((p) => p === 'base' || (allowedPacks(to).includes(p) && !from.packs.always.includes(p)));
  const chosen = kept.some((p) => p !== 'base') ? kept : [...kept, ...to.packs.default];
  const toSources = packsFor(to, chosen);
  const lines = describeSwitch(from, fromSources, to, toSources, { ...layout, disable: [...(layout.disable ?? [])] }, Object.keys(readLock(join(dir, '.claude')).files));
  for (const l of lines) log(l);
  if (dryRun) { log('dry run: nothing changed'); return 0; }
  if (lines.at(-1) === '  no change' && layout.configuration === to.name) return 0;
  await sync(dir, chosen, { force, mkdirs: true, config: name, log });
  return doctor(dir, log, { installing: true });
}
