// How this project runs the kit. `npx --no-install` needs the kit in its own node_modules, and a project in another language has none: there npx
// fetches it, and the --no-install form every installed file names fails with "npx canceled due to missing packages" (KWB-76).
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const PACKAGE = '@thedecipherist/claude-packs';

export const hasLocalKit = (dir) => existsSync(join(dir, 'node_modules', PACKAGE, 'package.json'));
export const kitCommand = (dir) => (hasLocalKit(dir) ? `npx --no-install ${PACKAGE}` : `npx ${PACKAGE}`);

// The line the CLAUDE.md block adds where the installed files' form cannot work: a project with no package.json at all.
export const noPackageLine = (dir) => (existsSync(join(dir, 'package.json')) || hasLocalKit(dir)
  ? []
  : [`This project has no package.json: run the kit as \`npx ${PACKAGE} <command>\`, wherever its files say \`npx --no-install ${PACKAGE}\`.`, '']);
