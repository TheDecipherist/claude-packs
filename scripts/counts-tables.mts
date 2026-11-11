// The README's five tables, each made from what the kit holds (d-8): packs with their counts, configurations, presets, commands, and
// the hooks base installs. A table is a string; `scripts/counts-render.mts` puts it between its markers.
import type { Configuration } from '../packs/base/hooks/lib/types.d.mts';
import { hooksOf, packRows, type HookRow } from './counts-facts.mts';

const cell = (text: string): string => text.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const table = (head: readonly string[], rows: readonly (readonly string[])[]): string =>
  [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`)].join('\n');
const code = (name: string): string => `\`${name}\``;
/** A description's first sentence: the table is a list to scan, and the rest of the text stays in the pack or configuration. */
const firstSentence = (text: string): string => /^.*?\.(?=\s|$)/s.exec(text)?.[0] ?? text;
const list = (names: readonly string[]): string => (names.length === 0 ? 'nothing' : names.map(code).join(', '));

export const packsTable = (root: string): string =>
  table(['Pack', 'For', 'Rules', 'Checks', 'Hooks', 'Skills'], packRows(root).map((p) => [code(p.name), firstSentence(p.description), `${p.rules}`, `${p.checks}`, `${p.hooks}`, `${p.skills}`]));

export const configurationsTable = (configs: readonly Configuration[]): string =>
  table(['Configuration', 'For', '`init` adds by default'], configs.map((c) => [code(c.name ?? ''), firstSentence(c.description ?? ''), list(c.packs.default)]));

export const presetsTable = (presets: Readonly<Record<string, readonly string[]>>): string =>
  table(['Preset', 'Packs'], Object.entries(presets).map(([name, packs]) => [code(name), list(packs)]));

// ---- the commands, from the help text the command line prints ----

/** One command of the help: what to type, and what it does. */
export interface CommandRow { usage: string; what: string }

/** The commands of prompts/help.txt: a line indented two spaces and starting with a letter opens one; its first sentence is what the
 *  line carries after the usage (a gap of two spaces) and the lines under it, up to the first flag line (`--x`). */
export function commandsOf(help: string): CommandRow[] {
  const rows: { usage: string; words: string[]; open: boolean }[] = [];
  for (const line of help.split('\n')) {
    const head = /^ {2}([a-z]\S*(?: \S+)*?)(?: {2,}(\S.*))?$/.exec(line);
    if (head !== null && !/^ {3,}/.test(line)) {
      rows.push({ usage: head[1] ?? '', words: head[2] === undefined ? [] : [head[2]], open: true });
      continue;
    }
    const last = rows[rows.length - 1];
    const more = line.trim();
    if (last === undefined || more === '' || !line.startsWith('   ')) continue;
    if (more.startsWith('-') || more.startsWith(`${last.usage.split(' ')[0] ?? ''} `)) last.open = false;
    if (last.open) last.words.push(more);
  }
  return rows.map((r) => ({ usage: r.usage, what: r.words.join(' ') }));
}

const sentence = (text: string): string => `${text.charAt(0).toUpperCase()}${text.slice(1)}`.replace(/<[^<>\s]+>/g, '`$&`');
export const commandsTable = (help: string): string =>
  table(['Command', 'What it does'], commandsOf(help).map((c) => [code(c.usage), sentence(c.what)]));

// ---- the hooks base installs ----

const TOOL: Record<string, string> = { Edit: 'Write', MultiEdit: 'Write', NotebookEdit: 'Write', Task: 'Agent' };
const EVENT: Record<string, string> = { UserPromptSubmit: 'Prompt', Stop: 'Stop', SessionStart: 'Session start' };

/** Where a hook runs, in the words the table uses: the tools of a tool event, "Prompt", "Stop", "Session start". */
export function whenOf(row: HookRow): string {
  const places = row.runs.flatMap(({ event, matcher }) => {
    const named = EVENT[event];
    if (named !== undefined) return [named];
    const tools = matcher === undefined ? ['Every call'] : matcher.split('|').map((t) => TOOL[t] ?? t);
    return event === 'PostToolUse' ? [`After ${tools.join(', ')}`.replace('After Every call', 'Every call')] : tools;
  });
  return [...new Set(places)].join(', ');
}

/** What each base hook does is prose, kept once, in the table itself: the cells of the table as it stands, by hook name. */
export function describedHooks(table: string): Map<string, string> {
  return new Map([...table.matchAll(/^\| `([\w-]+)` \| [^|]*\| (.*) \|$/gm)].map((m) => [m[1] ?? '', (m[2] ?? '').replace(/\\\|/g, '|')]));
}

/** The table of the hooks base installs; a hook with no description yet is returned in `missing`. */
export function baseHooksTable(root: string, described: ReadonlyMap<string, string>): { table: string; missing: string[] } {
  const rows = hooksOf(root, 'base');
  const missing = rows.filter((r) => !described.has(r.name)).map((r) => r.name);
  return { table: table(['Hook', 'When', 'What it does'], rows.map((r) => [code(r.name), whenOf(r), described.get(r.name) ?? 'not described yet'])), missing };
}
