// How this project runs the kit. `npx --no-install` needs the kit in its own node_modules, and a project in another language has none: there npx
// fetches it, and the --no-install form every installed file names fails with "npx canceled due to missing packages" (KWB-76).
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { KIT } from '../packs/base/hooks/lib/kit-version.mts';

/** True when the project's own node_modules holds the kit. */
export const hasLocalKit = (dir: string): boolean => existsSync(join(dir, 'node_modules', KIT, 'package.json'));
/** The command that runs the kit in this project. */
export const kitCommand = (dir: string): string => (hasLocalKit(dir) ? `npx --no-install ${KIT}` : `npx ${KIT}`);
/** The command in text no project has read yet (a planner skill in claude.ai): the form that fetches the kit when it is not there. */
export const kitCommandAnywhere = (): string => `npx ${KIT}`;

/** The line the CLAUDE.md block adds where the installed files' form cannot work: a project with no package.json at all. */
export const noPackageLine = (dir: string): string[] => (existsSync(join(dir, 'package.json')) || hasLocalKit(dir)
  ? []
  : [`This project has no package.json: run the kit as \`npx ${KIT} <command>\`, wherever its files say \`npx --no-install ${KIT}\`.`, '']);
