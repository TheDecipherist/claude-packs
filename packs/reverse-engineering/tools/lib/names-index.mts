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
/** The least a located table agrees with: this many names, and this share of the list. A lone match against controls at 0 % is chance. */
const MIN_MATCHES = 3;
const MIN_SHARE = 0.5;

/** A seeded source of 31-bit numbers with real low bits (mulberry32; the product is Math.imul, never a double past 2^53). */
export function chanceSource(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) & 0x7fffffff;
  };
}
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
  const next = chanceSource(12345);
  let total = 0;
  for (let n = 0; n < SHUFFLES; n += 1) {
    const order = names.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i -= 1) { const j = next() % (i + 1); [order[i], order[j]] = [order[j] ?? 0, order[i] ?? 0]; }
    total += score(names, (i) => entryAt(image, shape, order[i] ?? i));
  }
  controls.push({ name: `shuffled names (mean of ${SHUFFLES})`, agreement: total / SHUFFLES });
  return { agreement, controls, located: names.length > 0 && agreement >= MIN_SHARE && agreement * names.length >= MIN_MATCHES && controls.every((c) => agreement > c.agreement) };
}

const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;

export function indexText(label: string, check: IndexCheck): string {
  return [`${label}: true alignment ${pct(check.agreement)}; ${check.located ? `it beats every control and holds at least ${MIN_MATCHES} names and ${MIN_SHARE * 100}% of the list, so the table is located` : `it does not beat every control and hold at least ${MIN_MATCHES} names and ${MIN_SHARE * 100}% of the list, so nothing is located`}`,
    ...check.controls.map((c) => `  ${c.name}: ${pct(c.agreement)}`)].join('\n');
}
