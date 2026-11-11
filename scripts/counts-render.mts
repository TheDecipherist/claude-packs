// Every generated file of the kit, rendered from what the kit holds (d-8). `renderAll` takes the files as they stand and returns them as
// the kit makes them, so `scripts/counts.mts` writes the result, and `--check` (and a test that plants a wrong number) compares.
import { join } from 'node:path';
import { readText } from '../packs/base/hooks/lib/files.mts';
import { parseJson } from '../packs/base/hooks/lib/json.mts';
import { configsAt } from '../lib/configs.mts';
import { PRESETS } from '../lib/packs.mts';
import { rulesWithoutChecks, totals } from './counts-facts.mts';
import { baseHooksTable, commandsTable, configurationsTable, describedHooks, packsTable, presetsTable } from './counts-tables.mts';

/** The files a generation writes into, by their place in the kit. */
export const GENERATED = ['README.md', 'site/index.html', 'docs/rules-without-checks.md', 'docs/versions.md', 'planner/README.md'] as const;
export type GeneratedFile = (typeof GENERATED)[number];

/** The kit's version and dependencies, from its package.json. */
interface PackageFields { version?: string; dependencies?: Record<string, string>; devDependencies?: Record<string, string>; optionalDependencies?: Record<string, string> }

const marks = (name: string): [string, string] => [`<!-- generated:${name}:start -->`, `<!-- generated:${name}:end -->`];

/** A text with what lies between a pair of markers replaced; null when the markers are not both there, in order. */
export function between(text: string, name: string, body: string): string | null {
  const [open, close] = marks(name);
  const from = text.indexOf(open);
  const to = text.indexOf(close);
  return from < 0 || to < from ? null : `${text.slice(0, from + open.length)}\n${body}\n${text.slice(to)}`;
}

/** The README as the kit makes it: its five tables between their markers, and the version in the status-line sample. */
export function readmeOf(root: string, text: string, version: string, errors: string[]): string {
  const help = readText(join(root, 'prompts/help.txt')) ?? '';
  const hooks = baseHooksTable(root, describedHooks(text));
  if (hooks.missing.length > 0) errors.push(`README.md: the base hooks without a description in the table: ${hooks.missing.join(', ')}`);
  const bodies: [string, string][] = [['packs', packsTable(root)], ['configurations', configurationsTable(configsAt(root))], ['presets', presetsTable(PRESETS)],
    ['commands', commandsTable(help)], ['base-hooks', hooks.table]];
  let made = text;
  for (const [name, body] of bodies) {
    const next = between(made, name, body);
    if (next === null) errors.push(`README.md: no ${marks(name).join(' ... ')} markers`);
    else made = next;
  }
  return made.replace(/^claude-packs \d+\.\d+\.\d+ \|/m, `claude-packs ${version} |`);
}

/** The site with its six `data-count` numbers made true. */
export function siteOf(root: string, html: string): string {
  const shown: Record<string, number> = totals(root);
  const count = (whole: string, name: string): string => (shown[name] === undefined ? whole : `data-count="${name}">${shown[name]}<`);
  return html.replace(/data-count="(\w+)">\d+</g, count);
}

const RULES_HEAD = [
  '# Rules with no check',
  '',
  'A rule that a regex or a script can hold becomes a check or a hook (`skill-writing`). These rules have no lesson check naming them and',
  'no `# hook:` line: what they ask for is judged by reading, by ear or in a rendered page, or a hook or a test holds it without',
  'the rule saying so. A rule here is a candidate only if someone finds a pattern that does not misfire. This list is written by',
  '`node scripts/counts.mts`.',
  '',
].join('\n');
export function rulesWithoutChecksOf(root: string): string {
  const lines = Object.entries(rulesWithoutChecks(root)).map(([pack, rules]) => `- **${pack}:** ${rules.map((r) => `\`${r}\``).join(', ')}`);
  return `${RULES_HEAD}\n${lines.join('\n')}\n`;
}

/** docs/versions.md with each dependency's row saying the version package.json holds; a dependency with no row is an error (what was
 *  checked, and where, is research a person writes). */
export function versionsOf(root: string, text: string, errors: string[]): string {
  const pkg = parseJson<PackageFields>(readText(join(root, 'package.json'))) ?? {};
  const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.optionalDependencies };
  const rows = text.split('\n');
  for (const [name, range] of Object.entries(deps)) {
    const at = rows.findIndex((r) => r.startsWith(`| ${name} |`));
    if (at < 0) {
      errors.push(`docs/versions.md: package.json holds ${name} ${range} and the table has no row for it`);
      continue;
    }
    const cells = (rows[at] ?? '').split(' | ');
    cells[4] = range.replace(/^[\^~]/, '');
    rows[at] = cells.join(' | ');
  }
  return rows.join('\n');
}

/** Every generated file as the kit makes it, from the files as they stand (by place). Errors say what only a person can write. */
export function renderAll(root: string, texts: Readonly<Record<GeneratedFile, string>>): { files: Record<GeneratedFile, string>; errors: string[] } {
  const errors: string[] = [];
  const version = parseJson<PackageFields>(readText(join(root, 'package.json')))?.version ?? '0.0.0';
  const files: Record<GeneratedFile, string> = {
    'README.md': readmeOf(root, texts['README.md'], version, errors),
    'site/index.html': siteOf(root, texts['site/index.html']),
    'docs/rules-without-checks.md': rulesWithoutChecksOf(root),
    'docs/versions.md': versionsOf(root, texts['docs/versions.md'], errors),
    'planner/README.md': texts['planner/README.md'].replace(/Real at \d+\.\d+\.\d+/, `Real at ${version}`),
  };
  return { files, errors };
}
