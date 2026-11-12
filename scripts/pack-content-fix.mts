// The mechanical part of the pack-content ratchet (W10 review finding 4), written once and kept so the diff can be re-made:
//   C2  a check with no `exclude` gets `"exclude": []` (the engine reads a missing one as an empty list: no behaviour changes);
//   C6  a check that states none of code, strings, language gets `"code": false` where `"code": true` would make its own `bad` or
//       `good` example fail (raw text is proven to be what it reads); a check that passes both ways is left for its author;
//   R6  a rule whose `## Check` section does not name the check ids that point at it gets one line naming them.
// A rule's Always and Never lines are never touched. Each file is edited as text (an insertion), then parsed again to prove it.
//   node scripts/pack-content-fix.mts [--dry-run]
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { put, readText } from '../packs/base/hooks/lib/files.mts';
import { isMain } from '../packs/base/hooks/lib/hook-log.mts';
import { parseJson } from '../packs/base/hooks/lib/json.mts';
import { selftest, type Check } from '../packs/base/hooks/lesson-checks.mts';
import { configsAt } from '../lib/configs.mts';
import { conceptsOf, conformance } from '../test/pack-content-rig.mts';

/** Rules this run leaves alone: another agent holds them. */
const HELD = new Set(['base/rules/agents-held.md']);
/** The checks this script fixes (C7 is reworded by hand, three files). */
const MECHANICAL: ReadonlySet<string> = new Set(['C2', 'C6', 'R6', 'C7']);

/** The text with `line` put after the first line that starts with `after` (a JSON key at two spaces), or null where none does. */
export function insertAfterKey(text: string, after: RegExp, line: string): string | null {
  const lines = text.split('\n');
  const at = lines.findIndex((l) => after.test(l));
  if (at < 0) return null;
  return [...lines.slice(0, at + 1), line, ...lines.slice(at + 1)].join('\n');
}

/** Whether a check, read with `"code": true`, still catches its `bad` and passes its `good`. */
function survivesCode(c: Record<string, unknown>, file: string): boolean {
  return selftest([{ ...c, file, code: true } as unknown as Check]).length === 0;
}

/** The rule text with a line naming `ids` at the end of its `## Check` section (a new section at the end where it has none). */
export function nameChecks(text: string, ids: readonly string[]): string {
  const named = ids.map((id) => `\`${id}\``).join(', ');
  const line = `Lesson check${ids.length > 1 ? 's' : ''} for this rule: ${named}.`;
  const lines = text.replace(/\n+$/, '').split('\n');
  const heading = lines.findIndex((l) => /^## Checks?\s*$/.test(l));
  if (heading < 0) return `${lines.join('\n')}\n\n## Check\n${line}\n`;
  const next = lines.findIndex((l, i) => i > heading && /^## /.test(l));
  const end = next < 0 ? lines.length : next;
  let last = end;
  while (last > heading + 1 && (lines[last - 1] ?? '').trim() === '') last -= 1;
  return `${[...lines.slice(0, last), line, ...(next < 0 ? [] : ['', ...lines.slice(end)])].join('\n')}\n`;
}

export function run(kit: string, dryRun: boolean): string[] {
  const packs = join(kit, 'packs');
  const done: string[] = [];
  const edit = (rel: string, text: string, what: string): void => {
    if (!dryRun) put(join(packs, rel), text);
    done.push(`${what} ${rel}`);
  };
  const all = conformance(packs, conceptsOf(packs, configsAt(kit)));
  // A file this run edits counts as changed, and a changed file must pass the whole set (test/pack-content.test.mts, law 2): so a file
  // that also fails a check a person judges (C5, R1, R7, S3 ...) is left whole, for the person to take in one edit.
  const judged = new Set(all.filter((x) => !MECHANICAL.has(x.id)).map((x) => x.file));
  const found = all.filter((x) => !judged.has(x.file));
  const c2 = new Set(found.filter((x) => x.id === 'C2').map((x) => x.file));
  for (const f of found.filter((x) => x.id === 'C2')) {
    const text = readText(join(packs, f.file)) ?? '';
    const next = insertAfterKey(text, /^ {2}"rule":/, '  "exclude": [],') ?? insertAfterKey(text, /^ {2}"id":/, '  "exclude": [],');
    if (next !== null && Array.isArray(parseJson<{ exclude?: unknown }>(next)?.exclude)) edit(f.file, next, 'C2');
  }
  for (const f of found.filter((x) => x.id === 'C6')) {
    const text = readText(join(packs, f.file)) ?? '';
    const c = parseJson<Record<string, unknown>>(text);
    // a check that reads the same either way keeps the explicit default only when this run edits it anyway (it must pass the whole set)
    if (c === null || (survivesCode(c, f.file) && !c2.has(f.file))) continue;
    const next = insertAfterKey(text, /^ {2}"rule":/, '  "code": false,');
    if (next !== null && parseJson<{ code?: unknown }>(next)?.code === false) edit(f.file, next, 'C6');
  }
  for (const f of found.filter((x) => x.id === 'R6' && !HELD.has(x.file))) {
    const ids = /does not name (.*)$/.exec(f.note)?.[1]?.split(', ') ?? [];
    if (ids.length > 0) edit(f.file, nameChecks(readText(join(packs, f.file)) ?? '', ids), 'R6');
  }
  return done;
}

if (isMain(import.meta.url)) {
  const kit = resolve(fileURLToPath(new URL('..', import.meta.url)));
  const lines = run(kit, process.argv.includes('--dry-run'));
  for (const line of lines) console.log(line);
  console.log(`${lines.length} file(s)${process.argv.includes('--dry-run') ? ' (dry run)' : ''}`);
}
