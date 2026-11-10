#!/usr/bin/env node
// The fastest way into a firmware image or a dump: search it for the names the manual prints. Patch names, arp patterns, delay and reverb programs, menus,
// parameters. One name gives a table, the table's stride gives a record size, its order gives the parameter order, and what points at it leads to the code.
//   node names-sweep.mjs <image> [<image>...] --names <file> [--pair] [--base 0x8000,...] [--banked] [--min 4] [--json]
// The names file has one name per line, `group<TAB>name` to keep kinds apart (patch, arp, reverb, menu, parameter), `#` for a comment.
// --pair reads two images as one interleaved EPROM pair. Every wrapping in lib/unwrap.mjs is tried, and the one that reads the most names wins.
// Names reading prove the unwrapping. Exit 1 when too few read under any wrapping, and the report says what was searched.
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { findAll } from './lib/multi-find.mjs';
import { entropyOf, interleave, shiftedHitsMany, wrappings } from './lib/unwrap.mjs';

const MAX_HITS = 2048; // a common word is everywhere, and the cap must not cut off the one hit in the table
const SPAN_PER_NAME = 640; // bytes a name may take: a preset record's stride can be 512
const MAX_SPAN = 32768;
const FLAT = 7.5; // bits per byte: past this no text is showing and no structure either
const PROOF = 3; // names: one or two can read by chance in a large image, so fewer proves nothing
const POINTERS = [
  { name: 'u16 big-endian', width: 2, write: 'writeUInt16BE', top: 0xffff },
  { name: 'u16 little-endian', width: 2, write: 'writeUInt16LE', top: 0xffff },
  { name: 'u32 big-endian', width: 4, write: 'writeUInt32BE', top: 0xffffffff },
  { name: 'u32 little-endian', width: 4, write: 'writeUInt32LE', top: 0xffffffff },
];

export function readNames(text, min = 4) {
  return text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => {
    const [group, name] = l.includes('\t') ? l.split('\t').map((s) => s.trim()) : ['name', l];
    return { group, name };
  }).filter((n) => n.name.length >= min);
}

// A display does not print what a manual prints: it changes case, drops spaces and cuts a name to its column ("Decay Time" is `Decaytime`, "Filter Balance" `FilterBalanc`).
// So a name is searched as printed, squeezed, and cut to each column width. A cut under eight characters would match by chance.
const COLUMNS = [16, 15, 12, 10, 8];
export function displayForms(name) {
  const squeezed = name.replace(/\s+/g, '');
  const cuts = COLUMNS.filter((w) => w < squeezed.length).map((w) => squeezed.slice(0, w));
  return [...new Set([name, squeezed, ...cuts].map((f) => f.toLowerCase()))];
}

// Firmware also drops vowels and stops early (`BrickWll`, `ARP SWNG`, `MinWool`), so a name that did not read is tried loosely: a word's first three letters stand, vowels may go, and it may end early.
const VOWEL = /[aeiou]/;
const letter = (c, kept) => { const safe = c.replace(/[^a-z0-9]/g, '\\$&'); return kept && VOWEL.test(c) ? `${safe}?` : safe; };
function wordPattern(word) {
  const letters = [...word];
  const tail = letters.slice(3).reverse().reduce((inner, c) => `(?:${letter(c, true)}${inner})?`, '');
  return letters.slice(0, 3).map((c, i) => letter(c, i > 0)).join('') + tail;
}
export function abbreviationOf(name) {
  const words = name.toLowerCase().split(/\s+/).filter(Boolean);
  return new RegExp(`(?<![a-z])${words.map(wordPattern).join('[ .]?')}(?![a-z])`, 'g');
}

function abbreviated(view, names) {
  const text = view.toString('latin1').toLowerCase();
  return names.filter((n) => n.name.length >= 5).map((n) => {
    const hits = [...text.matchAll(abbreviationOf(n.name))].filter((m) => m[0].length >= Math.max(5, n.name.length / 2)).slice(0, MAX_HITS);
    return { ...n, hits: hits.map((m) => m.index), abbreviated: hits[0]?.[0] };
  }).filter((n) => n.hits.length);
}

const folded = (view) => Buffer.from(view.toString('latin1').toLowerCase(), 'latin1');
// Every form of every name in one pass over the view (KWB-120); a name keeps the first of its forms that reads.
function found(names, view) {
  const forms = names.map((n) => displayForms(n.name));
  const needles = [...new Set(forms.flat())];
  const index = new Map(needles.map((form, i) => [form, i]));
  const hits = findAll(folded(view), needles.map((form) => Buffer.from(form, 'latin1')), MAX_HITS);
  const first = (k) => forms[k].map((form) => ({ form, hits: hits[index.get(form)] })).find((f) => f.hits.length);
  return names.map((n, k) => ({ ...n, ...first(k) })).filter((n) => n.hits?.length);
}

// A custom character set: only names long enough for the letters' distances to mean anything, in each case the display might use.
function foundShifted(names, view) {
  const long = names.filter((n) => n.name.length >= 6);
  const forms = long.map((n) => [n.name, n.name.toUpperCase(), n.name.toLowerCase()]);
  const hits = shiftedHitsMany(view, forms.flat()); // one pass for every form of every name (KWB-120)
  const shifted = long.map((n, k) => {
    const all = hits.slice(k * 3, k * 3 + 3).flat();
    return { ...n, hits: all.map((h) => h.at), shift: all[0]?.shift };
  }).filter((n) => n.hits.length);
  const counts = new Map();
  for (const n of shifted) counts.set(n.shift, (counts.get(n.shift) ?? 0) + 1);
  const best = [...counts].sort((a, b) => b[1] - a[1])[0];
  return best ? { shift: best[0], names: shifted.filter((n) => n.shift === best[0]) } : { names: [] };
}

function mostCommonGap(offsets) {
  const counts = new Map();
  for (let i = 1; i < offsets.length; i += 1) { const gap = offsets[i] - offsets[i - 1]; counts.set(gap, (counts.get(gap) ?? 0) + 1); }
  const [gap, count] = [...counts].sort((a, b) => b[1] - a[1])[0] ?? [0, 0];
  return count >= 2 && count >= (offsets.length - 1) / 5 ? { gap, count, of: offsets.length - 1 } : null; // a gap a few pairs share is no stride, and reading one invents a table
}

// How many neighbours in the names file's order also sit in that order in the image.
function orderHeld(hits) {
  let held = 0;
  for (let i = 1; i < hits.length; i += 1) if (hits[i].hits[0] > hits[i - 1].hits[0]) held += 1;
  return { held, of: Math.max(0, hits.length - 1) };
}

// Where the most different names sit closest: the table itself. A common word also turns up in presets and messages, so the first hit is not the table.
function densest(hits, span) {
  const all = hits.flatMap((n) => n.hits.map((at) => ({ at, name: n.name }))).sort((a, b) => a.at - b.at);
  const held = new Map();
  const drop = (name) => { if (held.get(name) > 1) held.set(name, held.get(name) - 1); else held.delete(name); };
  let best = null;
  let from = 0;
  for (let to = 0; to < all.length; to += 1) {
    held.set(all[to].name, (held.get(all[to].name) ?? 0) + 1);
    while (all[to].at - all[from].at > span || held.get(all[from].name) > 1) { drop(all[from].name); from += 1; } // a stray earlier copy of a name is no part of the table
    const width = all[to].at - all[from].at;
    if (held.size > (best?.names ?? 1) || (held.size === best?.names && width < best.to - best.from)) best = { names: held.size, from: all[from].at, to: all[to].at, first: from, last: to };
  }
  return best && withNeighbours(all, best);
}

// The tightest window drops a first entry whose name comes again later in the table, so it takes back any hit as close as the table's own entries. A stray copy is further off.
function withNeighbours(all, { names, first, last }) {
  const gaps = all.slice(first + 1, last + 1).map((h, i) => h.at - all[first + i].at).sort((a, b) => a - b);
  const reach = 2 * (gaps[Math.floor(gaps.length / 2)] ?? 0);
  let [from, to] = [first, last];
  while (from > 0 && all[from].at - all[from - 1].at <= reach) from -= 1;
  while (to < all.length - 1 && all[to + 1].at - all[to].at <= reach) to += 1;
  return { names, from: all[from].at, to: all[to].at };
}

// Every place an address of one of the hits is stored, in this pointer format.
function seatsOf(view, offsets, base, kind) {
  const encoded = (o) => { const b = Buffer.alloc(kind.width); b[kind.write](o + base); return b; };
  const needles = offsets.filter((o) => o + base >= 0 && o + base <= kind.top).map(encoded);
  return findAll(view, needles, MAX_HITS).flat().sort((a, b) => a - b); // every address in one pass (KWB-120)
}

// Where addresses of the hits sit close together: that run is the table the code indexes.
function pointerTable(view, offsets, bases) {
  let best = null;
  for (const base of bases) {
    for (const kind of POINTERS.filter((k) => base >= 0 || k.width === 2)) { // a bank is reached through a 16-bit address
      let run = [];
      for (const seat of seatsOf(view, offsets, base, kind)) {
        run = run.length && seat - run[run.length - 1] <= kind.width * 4 ? [...run, seat] : [seat];
        if (run.length >= 4 && run.length > (best?.entries ?? 0)) best = { at: run[0], entries: run.length, kind: kind.name, base };
      }
    }
  }
  return best;
}

// Printable runs after the last hit: the entries of the table the manual does not list.
function nextRuns(view, from, count = 3) {
  const text = view.subarray(from, from + 512).toString('latin1');
  return (text.match(/[\x20-\x7e]{4,}/g) ?? []).slice(1, count + 1);
}

// Hits in one unbroken printable run are a pool or a fixed-width blob with no separators: read the run whole, because a name that fills its field has no terminator.
function poolOf(view, offsets) {
  const printable = (x) => x >= 0x20 && x < 0x7f;
  const runs = new Map();
  for (const at of offsets) {
    let from = at;
    let to = at;
    while (from > 0 && printable(view[from - 1])) from -= 1;
    while (to < view.length && printable(view[to])) to += 1;
    runs.set(from, { from, to, hits: (runs.get(from)?.hits ?? 0) + 1 });
  }
  const best = [...runs.values()].sort((a, b) => b.hits - a.hits)[0];
  return best?.hits >= 2 ? best : null;
}

function groupsOf(hits, view, bases, wanted) {
  return [...new Set(wanted.map((n) => n.group))].map((group) => {
    const mine = hits.filter((n) => n.group === group);
    const offsets = [...new Set(mine.flatMap((n) => n.hits))].sort((a, b) => a - b);
    const last = offsets[offsets.length - 1];
    const dense = densest(mine, Math.min(MAX_SPAN, mine.length * SPAN_PER_NAME));
    const inTable = dense ? mine.map((n) => ({ ...n, hits: n.hits.filter((at) => at >= dense.from && at <= dense.to) })).filter((n) => n.hits.length) : mine;
    return {
      group, found: mine.length, of: wanted.filter((n) => n.group === group).length, first: offsets[0], last, dense,
      stride: mostCommonGap(offsets), order: orderHeld(inTable), pointers: offsets.length >= 4 ? pointerTable(view, offsets, bases) : null,
      next: offsets.length ? nextRuns(view, last) : [], pool: poolOf(view, offsets),
    };
  });
}

export function sweep(image, names, { bases = [0] } = {}) {
  const tried = wrappings().map((w) => { const view = w.open(image); return { name: w.name, view, hits: found(names, view) }; });
  const relative = foundShifted(names, image);
  tried.push({ name: `custom character set, shift ${relative.shift ?? '-'}`, view: image, hits: relative.names });
  tried.sort((a, b) => b.hits.length - a.hits.length);
  const best = tried[0];
  const read = new Set(best.hits.map((n) => n.name));
  const shortened = best.hits.length >= PROOF ? abbreviated(best.view, names.filter((n) => !read.has(n.name))) : [];
  best.hits.push(...shortened);
  const seen = new Set(best.hits.map((n) => n.name));
  return {
    names: names.length, wrapping: best.hits.length ? best.name : null, reads: best.hits.length, entropy: entropyOf(image), shortened: shortened.map((n) => [n.name, n.abbreviated]),
    proven: best.hits.length >= Math.min(PROOF, names.length),
    tried: tried.map((t) => ({ name: t.name, reads: t.hits.length })),
    groups: best.hits.length ? groupsOf(best.hits, best.view, bases, names) : [],
    missing: names.filter((n) => !seen.has(n.name)).map((n) => n.name),
  };
}

const hex = (n) => `0x${n.toString(16).toUpperCase()}`;
function groupLine(g) {
  if (!g.found) return `  ${g.group}: 0 of ${g.of}`;
  const parts = [`  ${g.group}: ${g.found} of ${g.of}, ${hex(g.first)}..${hex(g.last)}`];
  if (g.dense) parts.push(`densest ${g.dense.names} names at ${hex(g.dense.from)}..${hex(g.dense.to)}`);
  if (g.stride) parts.push(`stride ${g.stride.gap} (${g.stride.count} of ${g.stride.of} gaps)`);
  if (g.order.of) parts.push(`the manual's order holds ${g.order.held} of ${g.order.of}`);
  if (g.pointers) parts.push(`pointers at ${hex(g.pointers.at)} (${g.pointers.entries}, ${g.pointers.kind}, base ${g.pointers.base < 0 ? '-' : ''}${hex(Math.abs(g.pointers.base))})`);
  if (g.pool) parts.push(`${g.pool.hits} in one run ${hex(g.pool.from)}..${hex(g.pool.to)} (${g.pool.to - g.pool.from} bytes, read it whole)`);
  if (g.next.length) parts.push(`then ${g.next.map((s) => JSON.stringify(s)).join(' ')}`);
  return parts.join('; ');
}

function nothingRead(label, r) {
  const searched = r.tried.map((t) => t.name).join(', ');
  const said = r.reads ? `only ${r.reads} of ${r.names} names read, which chance can do, under` : `none of ${r.names} names reads under`;
  const flat = r.entropy >= FLAT ? ' It looks compressed or encrypted: read what loads it, and if nothing does, record that the text is not in these files and stop.' : '';
  return `${label}: ${said} any of ${r.tried.length} wrappings. Searched: ${searched}.\n` +
    `The image is still wrapped some other way, or the names file is wrong. This says nothing about what the machine holds. Entropy ${r.entropy.toFixed(2)} bits per byte.${flat}`;
}

export function report(label, r) {
  if (!r.proven) return nothingRead(label, r);
  const others = r.tried.filter((t) => t.reads && t.name !== r.wrapping).slice(0, 4).map((t) => `${t.name} ${t.reads}`).join(', ');
  const more = r.missing.length > 8 ? `, and ${r.missing.length - 8} more` : '';
  return [
    `${label}: ${r.reads} of ${r.names} names read ${r.wrapping} (${r.tried.length} wrappings tried${others ? `; also ${others}` : ''})`,
    ...r.groups.map(groupLine),
    ...(r.shortened.length ? [`  abbreviated: ${r.shortened.slice(0, 8).map(([name, as]) => `${name} as "${as}"`).join(', ')}`] : []),
    r.missing.length ? `  not found: ${r.missing.slice(0, 8).join(', ')}${more}` : '  every name found',
  ].join('\n');
}

// A CPU sees a bank of a larger ROM through a window, so an address is the file offset less the bank plus the window: every plausible pairing, as a base.
const BANK_STEP = 0x4000;
const WINDOWS = [0x0000, 0x4000, 0x8000, 0xc000];
function bankedBases(size) {
  const bases = new Set([0]);
  for (let bank = 0; bank < size; bank += BANK_STEP) for (const window of WINDOWS) bases.add(window - bank);
  return [...bases];
}

function imagesOf(files, pair) {
  if (!pair) return files.map((f) => [basename(f), readFileSync(f)]);
  return [[`${basename(files[0])}+${basename(files[1])}`, interleave(readFileSync(files[0]), readFileSync(files[1]))]];
}

function main(argv) {
  const value = (flag) => { const i = argv.indexOf(flag); return i === -1 ? undefined : argv[i + 1]; };
  const files = argv.filter((a, i) => !a.startsWith('--') && !['--names', '--base', '--min'].includes(argv[i - 1]));
  if (!files.length || !value('--names')) {
    console.error('usage: names-sweep.mjs <image>... --names <file> [--pair] [--base 0x8000,...] [--banked] [--min 4] [--json]');
    return 2;
  }
  const names = readNames(readFileSync(value('--names'), 'utf8'), Number(value('--min') ?? 4));
  const given = (value('--base') ?? '0').split(',').map((b) => Number.parseInt(b));
  const basesFor = (image) => (argv.includes('--banked') ? bankedBases(image.length) : given);
  const results = imagesOf(files, argv.includes('--pair')).map(([label, image]) => [label, sweep(image, names, { bases: basesFor(image) })]);
  console.log(argv.includes('--json') ? JSON.stringify(Object.fromEntries(results), null, 2) : results.map(([label, r]) => report(label, r)).join('\n\n'));
  return results.some(([, r]) => r.proven) ? 0 : 1;
}

if (process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]))) process.exit(main(process.argv.slice(2)));
