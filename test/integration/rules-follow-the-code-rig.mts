// What the rules-follow-the-code files share: a project's layout.json read, and the folder paths it names.
import { join, readFileSync } from '../kit-cli.mts';
import type { Layout } from '../../packs/base/hooks/lib/types.d.mts';

export const layoutOf = (dir: string): Layout => JSON.parse(readFileSync(join(dir, '.claude/layout.json'), 'utf8')) as Layout;
export const pathsOf = (dir: string): string[] => Object.values(layoutOf(dir).folders).map((f) => f.path);
