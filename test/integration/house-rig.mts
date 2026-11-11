// What the house-* files read of an install's settings.json and of the hook table the runner reads (.claude/hooks/hooks.json, W8.1).
import { join, readFileSync } from '../kit-cli.mts';

export interface Entry { matcher?: string; hooks: { type?: string; command: string; asyncRewake?: boolean }[] }
export type HookTable = Record<string, Entry[]>;
export const settingsOf = (dir: string): { hooks: HookTable } => JSON.parse(readFileSync(join(dir, '.claude/settings.json'), 'utf8')) as { hooks: HookTable };
export const commandsOf = (hooks: HookTable): string[] => Object.values(hooks).flat().flatMap((g) => g.hooks).map((h) => h.command);
/** The hooks the runner runs: the table's rows that are not async, by hook name (`git-guard`). */
export const runnerHooks = (dir: string): string[] => (JSON.parse(readFileSync(join(dir, '.claude/hooks/hooks.json'), 'utf8')) as { hook: string; async?: boolean; asyncRewake?: boolean }[]).filter((r) => !r.async && !r.asyncRewake).map((r) => r.hook);
