// What the kit holds, read from its tree: the facts `scripts/counts.mts` writes into the README, the site and the docs (d-8). Every
// reader takes the kit's root, so a copy a test plants a fault in answers the same way.
import { readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { isDir, readText } from '../packs/base/hooks/lib/files.mts';
import { parseJson } from '../packs/base/hooks/lib/json.mts';
import type { PackManifest } from '../packs/base/hooks/lib/types.d.mts';

const dirsOf = (dir: string): string[] => (isDir(dir) ? readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort() : []);
const namesIn = (dir: string): string[] => (isDir(dir) ? readdirSync(dir).filter((f) => !f.startsWith('.')).sort() : []);
const packJson = (root: string, pack: string): Partial<PackManifest> => parseJson<Partial<PackManifest>>(readText(join(root, 'packs', pack, 'pack.json'))) ?? {};

/** The stock packs of a kit folder: each folder of packs/ that holds a pack.json. */
export const packNames = (root: string): string[] => dirsOf(join(root, 'packs')).filter((p) => readText(join(root, 'packs', p, 'pack.json')) !== null);

/** A hook of a pack with where it runs: the file name, and each event it is registered on with its matcher. */
export interface HookRow { name: string; runs: { event: string; matcher: string | undefined }[] }

/** The hooks a pack registers, one row each, in the order the manifest first names them. */
export function hooksOf(root: string, pack: string): HookRow[] {
  const rows = new Map<string, HookRow>();
  for (const [event, groups] of Object.entries(packJson(root, pack).hooks ?? {})) {
    for (const group of groups ?? []) {
      for (const hook of group.hooks) {
        const name = /hooks\/([\w-]+)\./.exec(hook.command)?.[1] ?? hook.command;
        const row = rows.get(name) ?? { name, runs: [] };
        row.runs.push({ event, matcher: group.matcher });
        rows.set(name, row);
      }
    }
  }
  return [...rows.values()];
}

/** One line per pack of the README's table: what the pack is for and what it holds. */
export interface PackRow { name: string; description: string; rules: number; checks: number; hooks: number; skills: number }

const countIn = (root: string, pack: string, kind: string, keep: (f: string) => boolean): number => namesIn(join(root, 'packs', pack, kind)).filter(keep).length;

export function packRows(root: string): PackRow[] {
  return packNames(root).map((name) => ({
    name,
    description: packJson(root, name).description ?? '',
    rules: countIn(root, name, 'rules', (f) => f.endsWith('.md')),
    checks: countIn(root, name, 'checks', (f) => f.endsWith('.json')),
    hooks: hooksOf(root, name).length,
    skills: countIn(root, name, 'skills', () => true),
  }));
}

/** The six numbers of the site: packs, rules, checks, hooks (the registered ones), skills, configurations. */
export function totals(root: string): Record<'packs' | 'rules' | 'checks' | 'hooks' | 'skills' | 'configurations', number> {
  const rows = packRows(root);
  const sum = (key: 'rules' | 'checks' | 'hooks' | 'skills'): number => rows.reduce((n, r) => n + r[key], 0);
  const configurations = dirsOf(join(root, 'configurations')).filter((c) => readText(join(root, 'configurations', c, 'config.json')) !== null).length;
  return { packs: rows.length, rules: sum('rules'), checks: sum('checks'), hooks: sum('hooks'), skills: sum('skills'), configurations };
}

/** The rules of each pack that no lesson check names: what stays judged by reading (docs/rules-without-checks.md). A rule a hook holds
 *  (its `# hook:` line) is judged by that hook. */
export function rulesWithoutChecks(root: string): Record<string, string[]> {
  const named = new Set<string>();
  for (const pack of packNames(root)) {
    for (const file of namesIn(join(root, 'packs', pack, 'checks')).filter((f) => f.endsWith('.json'))) {
      const rule = parseJson<{ rule?: string }>(readText(join(root, 'packs', pack, 'checks', file)))?.rule;
      if (typeof rule === 'string') named.add(basename(rule, '.md'));
    }
  }
  const out: Record<string, string[]> = {};
  for (const pack of packNames(root)) {
    const bare = namesIn(join(root, 'packs', pack, 'rules')).filter((f) => f.endsWith('.md')).map((f) => basename(f, '.md'))
      .filter((rule) => !named.has(rule) && !/^# hook:/m.test(readText(join(root, 'packs', pack, 'rules', `${rule}.md`)) ?? ''));
    if (bare.length > 0) out[pack] = bare;
  }
  return out;
}
