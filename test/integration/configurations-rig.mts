// What the configurations files share (split by configuration so no file sums over a minute): the configurations the kit ships, one's
// config.json, and the test that a configuration installs into a fresh repo and passes doctor --strict.
import { KIT, assert, cli, execFileSync, existsSync, fresh, join, readdirSync, readFileSync, test } from '../kit-cli.mts';
import { readConfig } from '../../lib/configs.mts';

interface Folder { path: string; planned?: boolean }
export interface Config { layout: { folders: Record<string, Folder> }; preamble: { never: string[] } }

export const CONFIGS = readdirSync(join(KIT, 'configurations'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
/** A configuration as the kit makes it: its deltas over configurations/shared.json. */
export const config = (name: string): Config => {
  const c = readConfig(name);
  return { layout: { folders: { ...c.layout?.folders } }, preamble: { never: [...(c.preamble?.never ?? [])] } };
};

/** One test per named configuration: it installs into a fresh repo and `doctor --strict` passes there. */
export function holdsInstalls(names: readonly string[]): void {
  for (const name of names) {
    test(`${name}: installs into a fresh repo and doctor --strict passes`, () => {
      const dir = fresh(`cfgs-${name}-`);
      execFileSync('git', ['init', '-q'], { cwd: dir });
      const init = cli(dir, 'init', '--config', name);
      assert.equal(init.status, 0, init.stdout + init.stderr);
      for (const f of Object.values(config(name).layout.folders)) assert.equal(existsSync(join(dir, f.path)), !f.planned, `${name}: ${f.path}/`);
      const strict = cli(dir, 'doctor', '--strict');
      assert.equal(strict.status, 0, strict.stdout);
      assert.match(strict.stdout, new RegExp(`configuration: ${name}\\b`));
    });
  }
}
