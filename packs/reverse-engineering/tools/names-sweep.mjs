#!/usr/bin/env node
// The fastest way into a firmware image or a dump: search it for the names the manual prints. Patch names, arp patterns, delay and reverb programs, menus,
// parameters. One name gives a table, the table's stride gives a record size, its order gives the parameter order, and what points at it leads to the code.
//   node names-sweep.mjs <image> [<image>...] --names <file> [--pair] [--base 0x8000,...] [--min 4] [--json]
// The names file has one name per line, `group<TAB>name` to keep kinds apart (patch, arp, reverb, menu, parameter), `#` for a comment.
// --pair reads two images as one interleaved EPROM pair. Every wrapping in lib/unwrap.mjs is tried, and the one that reads the most names wins.
// A name found proves the unwrapping. Exit 1 when no name reads under any wrapping, and the report says what was searched.
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { interleave, shiftedHits, wrappings } from './lib/unwrap.mjs';

const MAX_HITS = 64;
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

function hitsIn(view, text) {
  const hits = [];
  for (let at = view.indexOf(text); at !== -1 && hits.length < MAX_HITS; at = view.indexOf(text, at + 1)) hits.push(at);
  return hits;
}

// Case is the one thing a display changes freely, so both sides are folded.
const folded = (view) => Buffer.from(view.toString('latin1').toLowerCase(), 'latin1');
function found(names, view) {
  const low = folded(view);
  return names.map((n) => ({ ...n, hits: hitsIn(low, Buffer.from(n.name.toLowerCase(), 'latin1')) })).filter((n) => n.hits.length);
}

// A custom character set: only names long enough for the letters' distances to mean anything, in each case the display might use.
function foundShifted(names, view) {
  const shifted = names.filter((n) => n.name.length >= 6).map((n) => {
    const all = [n.name, n.name.toUpperCase(), n.name.toLowerCase()].flatMap((form) => shiftedHits(view, form));
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
  return count >= 2 ? { gap, count, of: offsets.length - 1 } : null;
}

// How many neighbours in the names file's order also sit in that order in the image.
function orderHeld(hits) {
  let held = 0;
  for (let i = 1; i < hits.length; i += 1) if (hits[i].hits[0] > hits[i - 1].hits[0]) held += 1;
  return { held, of: Math.max(0, hits.length - 1) };
}

// Every place an address of one of the hits is stored, in this pointer format.
function seatsOf(view, offsets, base, kind) {
  const encoded = (o) => { const b = Buffer.alloc(kind.width); b[kind.write](o + base); return b; };
  return offsets.filter((o) => o + base <= kind.top).flatMap((o) => hitsIn(view, encoded(o))).sort((a, b) => a - b);
}

// Where addresses of the hits sit close together: that run is the table the code indexes.
function pointerTable(view, offsets, bases) {
  let best = null;
  for (const base of bases) {
    for (const kind of POINTERS) {
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

function groupsOf(hits, view, bases, wanted) {
  return [...new Set(wanted.map((n) => n.group))].map((group) => {
    const mine = hits.filter((n) => n.group === group);
    const offsets = [...new Set(mine.flatMap((n) => n.hits))].sort((a, b) => a - b);
    const last = offsets[offsets.length - 1];
    return {
      group, found: mine.length, of: wanted.filter((n) => n.group === group).length, first: offsets[0], last,
      stride: mostCommonGap(offsets), order: orderHeld(mine), pointers: offsets.length >= 4 ? pointerTable(view, offsets, bases) : null,
      next: offsets.length ? nextRuns(view, last) : [],
    };
  });
}

export function sweep(image, names, { bases = [0] } = {}) {
  const tried = wrappings().map((w) => { const view = w.open(image); return { name: w.name, view, hits: found(names, view) }; });
  const relative = foundShifted(names, image);
  tried.push({ name: `custom character set, shift ${relative.shift ?? '-'}`, view: image, hits: relative.names });
  tried.sort((a, b) => b.hits.length - a.hits.length);
  const best = tried[0];
  const seen = new Set(best.hits.map((n) => n.name));
  return {
    names: names.length, wrapping: best.hits.length ? best.name : null, reads: best.hits.length,
    tried: tried.map((t) => ({ name: t.name, reads: t.hits.length })),
    groups: best.hits.length ? groupsOf(best.hits, best.view, bases, names) : [],
    missing: names.filter((n) => !seen.has(n.name)).map((n) => n.name),
  };
}

const hex = (n) => `0x${n.toString(16).toUpperCase()}`;
function groupLine(g) {
  if (!g.found) return `  ${g.group}: 0 of ${g.of}`;
  const parts = [`  ${g.group}: ${g.found} of ${g.of}, ${hex(g.first)}..${hex(g.last)}`];
  if (g.stride) parts.push(`stride ${g.stride.gap} (${g.stride.count} of ${g.stride.of} gaps)`);
  if (g.order.of) parts.push(`the manual's order holds ${g.order.held} of ${g.order.of}`);
  if (g.pointers) parts.push(`pointers at ${hex(g.pointers.at)} (${g.pointers.entries}, ${g.pointers.kind}, base ${hex(g.pointers.base)})`);
  if (g.next.length) parts.push(`then ${g.next.map((s) => JSON.stringify(s)).join(' ')}`);
  return parts.join('; ');
}

function nothingRead(label, r) {
  const searched = r.tried.map((t) => t.name).join(', ');
  return `${label}: none of ${r.names} names reads under any of ${r.tried.length} wrappings. Searched: ${searched}.\n` +
    'The image is still wrapped some other way, or the names file is wrong. This says nothing about what the machine holds.';
}

export function report(label, r) {
  if (!r.wrapping) return nothingRead(label, r);
  const others = r.tried.filter((t) => t.reads && t.name !== r.wrapping).slice(0, 4).map((t) => `${t.name} ${t.reads}`).join(', ');
  const more = r.missing.length > 8 ? `, and ${r.missing.length - 8} more` : '';
  return [
    `${label}: ${r.reads} of ${r.names} names read ${r.wrapping} (${r.tried.length} wrappings tried${others ? `; also ${others}` : ''})`,
    ...r.groups.map(groupLine),
    r.missing.length ? `  not found: ${r.missing.slice(0, 8).join(', ')}${more}` : '  every name found',
  ].join('\n');
}

function imagesOf(files, pair) {
  if (!pair) return files.map((f) => [basename(f), readFileSync(f)]);
  return [[`${basename(files[0])}+${basename(files[1])}`, interleave(readFileSync(files[0]), readFileSync(files[1]))]];
}

function main(argv) {
  const value = (flag) => { const i = argv.indexOf(flag); return i === -1 ? undefined : argv[i + 1]; };
  const files = argv.filter((a, i) => !a.startsWith('--') && !['--names', '--base', '--min'].includes(argv[i - 1]));
  if (!files.length || !value('--names')) {
    console.error('usage: names-sweep.mjs <image>... --names <file> [--pair] [--base 0x8000,...] [--min 4] [--json]');
    return 2;
  }
  const names = readNames(readFileSync(value('--names'), 'utf8'), Number(value('--min') ?? 4));
  const bases = (value('--base') ?? '0').split(',').map(Number);
  const results = imagesOf(files, argv.includes('--pair')).map(([label, image]) => [label, sweep(image, names, { bases })]);
  console.log(argv.includes('--json') ? JSON.stringify(Object.fromEntries(results), null, 2) : results.map(([label, r]) => report(label, r)).join('\n\n'));
  return results.some(([, r]) => r.wrapping) ? 0 : 1;
}

if (process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]))) process.exit(main(process.argv.slice(2)));
