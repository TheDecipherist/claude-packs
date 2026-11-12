// The build's first step (typescript order W2.2, d-2): an emitted .mjs whose .mts is gone is removed, so a deleted or renamed
// source never leaves its old output to be installed, imported or shipped. An emitted file is one git ignores in a source folder
// with no TypeScript source beside it; a hand-written .mjs is tracked, and never touched.
//   node scripts/clean-emitted.mts [--dry-run]
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gitLines } from '../packs/base/hooks/lib/git-run.mts';
import { isMain } from '../packs/base/hooks/lib/hook-log.mts';
import { emittedFrom } from '../packs/base/hooks/lib/source-exts.mts';

const KIT = fileURLToPath(new URL('..', import.meta.url));
const FOLDERS = ['bin', 'lib', 'global', 'scripts', 'packs', '.claude/hooks'];

/** The ignored .mjs, .cjs and .js under the source folders whose TypeScript source is gone. */
function strayEmitted(root: string, env: Readonly<Record<string, string | undefined>>): string[] {
  const ignored = gitLines(['ls-files', '--others', '--ignored', '--exclude-standard', '--', ...FOLDERS], { cwd: root, env });
  return ignored.filter((rel) => /\.(?:mjs|cjs|js)$/.test(rel) && !rel.includes('node_modules/') && emittedFrom(join(root, rel)) === null);
}

if (isMain(import.meta.url)) {
  const dry = process.argv.includes('--dry-run');
  const stray = strayEmitted(KIT, process.env);
  for (const rel of stray) {
    if (!dry) rmSync(join(KIT, rel));
    console.log(`${dry ? 'would remove' : 'removed'} ${rel} (its source is gone)`);
  }
}
