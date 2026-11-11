// The `configs` and `config <name>` commands, and doctor's configuration line (0.10.0, STEP 3 item 1).
import { join } from 'node:path';
import { readLayout } from '../packs/base/hooks/lib/layout.mjs';
import { allowedPacks, describeConfigs, describeSwitch, packsFor, readConfig, resolveConfig } from './configs.mjs';
import { doctor } from './doctor.mjs';
import { readLock } from './manifest.mjs';
import { sync } from './sync.mjs';
export { describeConfigs, readConfig };
export const layoutConfiguration = (dir) => readLayout(dir).configuration ?? null;
/** Switch a project to configuration `name`: the packs it has that the new one takes stay; with none left, the new one's
 *  default packs. What changes is printed first; --dry-run stops there. */
export async function switchConfig(dir, name, installed, { force = false, dryRun = false, log = console.log } = {}) {
    if (!name)
        throw new Error('name the configuration: `config <name>` (`configs` lists them)');
    if (installed.length === 0)
        throw new Error('nothing installed here; run `init --config <name>` first');
    const to = readConfig(name);
    const layout = readLayout(dir);
    const { config: from } = resolveConfig({ layout, packs: installed });
    const fromSources = packsFor(from, installed);
    const kept = installed.filter((p) => p === 'base' || (allowedPacks(to).includes(p) && !from.packs.always.includes(p)));
    const chosen = kept.some((p) => p !== 'base') ? kept : [...kept, ...to.packs.default];
    const toSources = packsFor(to, chosen);
    const lines = describeSwitch(from, fromSources, to, toSources, { ...layout, disable: [...(layout.disable ?? [])] }, Object.keys(readLock(join(dir, '.claude')).files));
    for (const l of lines)
        log(l);
    if (dryRun) {
        log('dry run: nothing changed');
        return 0;
    }
    if (lines.at(-1) === '  no change' && layout.configuration === to.name)
        return 0;
    await sync(dir, chosen, { force, mkdirs: true, config: name, log });
    return doctor(dir, log, { installing: true });
}
