// What the house-* files read of an install's settings.json.
import { join, readFileSync } from '../kit-cli.mts';

export interface Entry { matcher?: string; hooks: { type?: string; command: string; asyncRewake?: boolean }[] }
export type HookTable = Record<string, Entry[]>;
export const settingsOf = (dir: string): { hooks: HookTable } => JSON.parse(readFileSync(join(dir, '.claude/settings.json'), 'utf8')) as { hooks: HookTable };
export const commandsOf = (hooks: HookTable): string[] => Object.values(hooks).flat().flatMap((g) => g.hooks).map((h) => h.command);
