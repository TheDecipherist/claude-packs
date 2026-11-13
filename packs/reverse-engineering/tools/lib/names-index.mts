// A name table agreeing with the manual's list index for index is a finding only against its controls. The true alignment is scored beside the same table
// shifted one and two records, read at a stride off by one and two bytes, and the names shuffled (the real chance rate). names-sweep.mjs --index runs it.
//   indexCheck(image, names, { at, stride, width }) -> { agreement, controls, located }
//   indexText(label, check) -> the text names-sweep prints

/** Where the table sits in the image: its first entry, the gap between entries, and the width of each name. */
export interface TableShape { at: number; stride: number; width: number }
/** The score of one alignment: its name, and the share of the manual's names it agrees with. */
export interface Score { name: string; agreement: number }
/** The true alignment, every control, and whether the true one beats them all. */
export interface IndexCheck { agreement: number; controls: Score[]; located: boolean }

const SHUFFLES = 200;
const norm = (s: string): string => s.replace(/\s+/g, '').toLowerCase();

function entryAt(image: Buffer, shape: TableShape, index: number): string {
  const from = shape.at + index * shape.stride;
  return from < 0 || from + shape.width > image.length ? '' : norm(image.toString('latin1', from, from + shape.width));
}

// The entry may be cut to a column, so a name agrees when the entry is a prefix of it, or it of the entry.
const agrees = (entry: string, name: string): boolean => entry.length >= 3 && (norm(name).startsWith(entry) || entry.startsWith(norm(name)));

const score = (names: readonly string[], entry: (i: number) => string): number => names.filter((n, i) => agrees(entry(i), n)).length / names.length;

export function indexCheck(image: Buffer, names: readonly string[], shape: TableShape): IndexCheck {
  const agreement = score(names, (i) => entryAt(image, shape, i));
  const controls: Score[] = [-2, -1, 1, 2].map((s) => ({ name: `shifted ${s > 0 ? '+' : ''}${s} record`, agreement: score(names, (i) => entryAt(image, shape, i + s)) }));
  for (const d of [-2, -1, 1, 2]) controls.push({ name: `stride ${d > 0 ? '+' : ''}${d} byte`, agreement: score(names, (i) => entryAt(image, { ...shape, stride: shape.stride + d }, i)) });
  let seed = 12345;
  const next = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed; };
  let total = 0;
  for (let n = 0; n < SHUFFLES; n += 1) {
    const order = names.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i -= 1) { const j = next() % (i + 1); [order[i], order[j]] = [order[j] ?? 0, order[i] ?? 0]; }
    total += score(names, (i) => entryAt(image, shape, order[i] ?? i));
  }
  controls.push({ name: `shuffled names (mean of ${SHUFFLES})`, agreement: total / SHUFFLES });
  return { agreement, controls, located: names.length > 0 && controls.every((c) => agreement > c.agreement) };
}

const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;

export function indexText(label: string, check: IndexCheck): string {
  return [`${label}: true alignment ${pct(check.agreement)}; ${check.located ? 'it beats every control, so the table is located' : 'it does not beat every control, so nothing is located'}`,
    ...check.controls.map((c) => `  ${c.name}: ${pct(c.agreement)}`)].join('\n');
}
