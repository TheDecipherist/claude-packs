// What the hits of the names say about the image: the table they sit in (the densest run), its stride, whether the manual's order holds, the pointers that
// lead to it, the entries after it, and a pool with no separators. names-sweep.mjs reports one line of these per group of names.
import { findAll } from './multi-find.mts';
import { MAX_HITS } from './names-find.mts';
import type { Found, Name } from './names-find.mts';

const SPAN_PER_NAME = 640; // bytes a name may take: a preset record's stride can be 512
const MAX_SPAN = 32768;

/** A pointer format: its width, the Buffer method that writes one, and the highest address it holds. */
interface PointerKind { name: string; width: number; write: 'writeUInt16BE' | 'writeUInt16LE' | 'writeUInt32BE' | 'writeUInt32LE'; top: number }
const POINTERS: readonly PointerKind[] = [
  { name: 'u16 big-endian', width: 2, write: 'writeUInt16BE', top: 0xffff },
  { name: 'u16 little-endian', width: 2, write: 'writeUInt16LE', top: 0xffff },
  { name: 'u32 big-endian', width: 4, write: 'writeUInt32BE', top: 0xffffffff },
  { name: 'u32 little-endian', width: 4, write: 'writeUInt32LE', top: 0xffffffff },
];

export interface Gap { gap: number; count: number; of: number }
export interface Order { held: number; of: number }
export interface Dense { names: number; from: number; to: number }
export interface PointerRun { at: number; entries: number; kind: string; base: number }
export interface Pool { from: number; to: number; hits: number }
/** One group's facts: how many of its names read, where, and what the hits say. */
export interface Group {
  group: string; found: number; of: number; first: number | undefined; last: number | undefined; dense: Dense | null;
  stride: Gap | null; order: Order; pointers: PointerRun | null; next: string[]; pool: Pool | null;
}

const first = (hit: Found): number => hit.hits[0] ?? 0;

export function mostCommonGap(offsets: readonly number[]): Gap | null {
  const counts = new Map<number, number>();
  for (let i = 1; i < offsets.length; i += 1) { const gap = (offsets[i] ?? 0) - (offsets[i - 1] ?? 0); counts.set(gap, (counts.get(gap) ?? 0) + 1); }
  const [gap, count] = [...counts].sort((a, b) => b[1] - a[1])[0] ?? [0, 0];
  return count >= 2 && count >= (offsets.length - 1) / 5 ? { gap, count, of: offsets.length - 1 } : null; // a gap a few pairs share is no stride, and reading one invents a table
}

// How many neighbours in the names file's order also sit in that order in the image.
export function orderHeld(hits: readonly Found[]): Order {
  let held = 0;
  for (let i = 1; i < hits.length; i += 1) if (first(hits[i] as Found) > first(hits[i - 1] as Found)) held += 1;
  return { held, of: Math.max(0, hits.length - 1) };
}

interface Placed { at: number; name: string }

// Where the most different names sit closest: the table itself. A common word also turns up in presets and messages, so the first hit is not the table.
function densest(hits: readonly Found[], span: number): Dense | null {
  const all: Placed[] = hits.flatMap((n) => n.hits.map((at) => ({ at, name: n.name }))).sort((a, b) => a.at - b.at);
  const held = new Map<string, number>();
  const count = (name: string): number => held.get(name) ?? 0;
  const drop = (name: string): void => { if (count(name) > 1) held.set(name, count(name) - 1); else held.delete(name); };
  const placed = (i: number): Placed => all[i] as Placed;
  let best: { names: number; from: number; to: number; first: number; last: number } | null = null;
  let from = 0;
  for (let to = 0; to < all.length; to += 1) {
    held.set(placed(to).name, count(placed(to).name) + 1);
    while (placed(to).at - placed(from).at > span || count(placed(from).name) > 1) { drop(placed(from).name); from += 1; } // a stray earlier copy of a name is no part of the table
    const width = placed(to).at - placed(from).at;
    if (held.size > (best?.names ?? 1) || (best && held.size === best.names && width < best.to - best.from)) best = { names: held.size, from: placed(from).at, to: placed(to).at, first: from, last: to };
  }
  return best && withNeighbours(all, best);
}

// The tightest window drops a first entry whose name comes again later in the table, so it takes back any hit as close as the table's own entries. A stray copy is further off.
function withNeighbours(all: readonly Placed[], { names, first: start, last }: { names: number; first: number; last: number }): Dense {
  const placed = (i: number): Placed => all[i] as Placed;
  const gaps = all.slice(start + 1, last + 1).map((h, i) => h.at - placed(start + i).at).sort((a, b) => a - b);
  const reach = 2 * (gaps[Math.floor(gaps.length / 2)] ?? 0);
  let [from, to] = [start, last];
  while (from > 0 && placed(from).at - placed(from - 1).at <= reach) from -= 1;
  while (to < all.length - 1 && placed(to + 1).at - placed(to).at <= reach) to += 1;
  return { names, from: placed(from).at, to: placed(to).at };
}

// Every place an address of one of the hits is stored, in this pointer format.
function seatsOf(view: Buffer, offsets: readonly number[], base: number, kind: PointerKind): number[] {
  const encoded = (o: number): Buffer => { const b = Buffer.alloc(kind.width); b[kind.write](o + base); return b; };
  const needles = offsets.filter((o) => o + base >= 0 && o + base <= kind.top).map(encoded);
  return findAll(view, needles, MAX_HITS).flat().sort((a, b) => a - b); // every address in one pass (KWB-120)
}

// Where addresses of the hits sit close together: that run is the table the code indexes.
function pointerTable(view: Buffer, offsets: readonly number[], bases: readonly number[]): PointerRun | null {
  let best: PointerRun | null = null;
  for (const base of bases) {
    for (const kind of POINTERS.filter((k) => base >= 0 || k.width === 2)) { // a bank is reached through a 16-bit address
      let run: number[] = [];
      for (const seat of seatsOf(view, offsets, base, kind)) {
        run = run.length && seat - (run[run.length - 1] ?? 0) <= kind.width * 4 ? [...run, seat] : [seat];
        if (run.length >= 4 && run.length > (best?.entries ?? 0)) best = { at: run[0] ?? 0, entries: run.length, kind: kind.name, base };
      }
    }
  }
  return best;
}

// Printable runs after the last hit: the entries of the table the manual does not list.
function nextRuns(view: Buffer, from: number, count = 3): string[] {
  const text = view.subarray(from, from + 512).toString('latin1');
  return (text.match(/[\x20-\x7e]{4,}/g) ?? []).slice(1, count + 1);
}

// Hits in one unbroken printable run are a pool or a fixed-width blob with no separators: read the run whole, because a name that fills its field has no terminator.
function poolOf(view: Buffer, offsets: readonly number[]): Pool | null {
  const printable = (x: number | undefined): boolean => x !== undefined && x >= 0x20 && x < 0x7f;
  const runs = new Map<number, Pool>();
  for (const at of offsets) {
    let from = at;
    let to = at;
    while (from > 0 && printable(view[from - 1])) from -= 1;
    while (to < view.length && printable(view[to])) to += 1;
    runs.set(from, { from, to, hits: (runs.get(from)?.hits ?? 0) + 1 });
  }
  const best = [...runs.values()].sort((a, b) => b.hits - a.hits)[0];
  return best && best.hits >= 2 ? best : null;
}

export function groupsOf(hits: readonly Found[], view: Buffer, bases: readonly number[], wanted: readonly Name[]): Group[] {
  return [...new Set(wanted.map((n) => n.group))].map((group): Group => {
    const mine = hits.filter((n) => n.group === group);
    const offsets = [...new Set(mine.flatMap((n) => n.hits))].sort((a, b) => a - b);
    const last = offsets[offsets.length - 1];
    const dense = densest(mine, Math.min(MAX_SPAN, mine.length * SPAN_PER_NAME));
    const inTable = dense ? mine.map((n) => ({ ...n, hits: n.hits.filter((at) => at >= dense.from && at <= dense.to) })).filter((n) => n.hits.length) : mine;
    return {
      group, found: mine.length, of: wanted.filter((n) => n.group === group).length, first: offsets[0], last, dense,
      stride: mostCommonGap(offsets), order: orderHeld(inTable), pointers: offsets.length >= 4 ? pointerTable(view, offsets, bases) : null,
      next: last === undefined ? [] : nextRuns(view, last), pool: poolOf(view, offsets),
    };
  });
}
