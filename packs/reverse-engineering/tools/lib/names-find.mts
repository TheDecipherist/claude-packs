// Finding the names a manual prints in a view of an image: as printed, squeezed and cut to a display's column, loosely abbreviated, and in a custom
// character set. names-sweep.mjs uses these to prove an unwrapping (a name that reads is the proof) and names-tables.mjs to find the table.
import { findAll } from './multi-find.mts';
import { shiftedHitsMany } from './unwrap.mts';

export const MAX_HITS = 2048; // a common word is everywhere, and the cap must not cut off the one hit in the table

/** A name the manual prints, in its group (patch, arp, reverb, menu, parameter). */
export interface Name { group: string; name: string }
/** A name and the offsets it was found at, with how it read. */
export interface Found extends Name { hits: number[]; form?: string; abbreviated?: string; shift?: number }

export function readNames(text: string, min = 4): Name[] {
  return text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l): Name => {
    const [group = 'name', name = ''] = l.includes('\t') ? l.split('\t').map((s) => s.trim()) : ['name', l];
    return { group, name };
  }).filter((n) => n.name.length >= min);
}

// A display does not print what a manual prints: it changes case, drops spaces and cuts a name to its column ("Decay Time" is `Decaytime`, "Filter Balance" `FilterBalanc`).
// So a name is searched as printed, squeezed, and cut to each column width. A cut under eight characters would match by chance.
const COLUMNS = [16, 15, 12, 10, 8];
export function displayForms(name: string): string[] {
  const squeezed = name.replace(/\s+/g, '');
  const cuts = COLUMNS.filter((w) => w < squeezed.length).map((w) => squeezed.slice(0, w));
  return [...new Set([name, squeezed, ...cuts].map((f) => f.toLowerCase()))];
}

// Firmware also drops vowels and stops early (`BrickWll`, `ARP SWNG`, `MinWool`), so a name that did not read is tried loosely: a word's first three letters stand, vowels may go, and it may end early.
const VOWEL = /[aeiou]/;
const letter = (c: string, kept: boolean): string => { const safe = c.replace(/[^a-z0-9]/g, '\\$&'); return kept && VOWEL.test(c) ? `${safe}?` : safe; };
function wordPattern(word: string): string {
  const letters = [...word];
  const tail = letters.slice(3).reverse().reduce((inner, c) => `(?:${letter(c, true)}${inner})?`, '');
  return letters.slice(0, 3).map((c, i) => letter(c, i > 0)).join('') + tail;
}
export function abbreviationOf(name: string): RegExp {
  const words = name.toLowerCase().split(/\s+/).filter(Boolean);
  return new RegExp(`(?<![a-z])${words.map(wordPattern).join('[ .]?')}(?![a-z])`, 'g');
}

export function abbreviated(view: Buffer, names: readonly Name[]): Found[] {
  const text = view.toString('latin1').toLowerCase();
  return names.filter((n) => n.name.length >= 5).map((n): Found => {
    const hits = [...text.matchAll(abbreviationOf(n.name))].filter((m) => m[0].length >= Math.max(5, n.name.length / 2)).slice(0, MAX_HITS);
    const first = hits[0]?.[0];
    return { ...n, hits: hits.map((m) => m.index), ...(first === undefined ? {} : { abbreviated: first }) };
  }).filter((n) => n.hits.length);
}

const folded = (view: Buffer): Buffer => Buffer.from(view.toString('latin1').toLowerCase(), 'latin1');

// Every form of every name in one pass over the view (KWB-120); a name keeps the first of its forms that reads.
export function found(names: readonly Name[], view: Buffer): Found[] {
  const forms = names.map((n) => displayForms(n.name));
  const needles = [...new Set(forms.flat())];
  const index = new Map(needles.map((form, i) => [form, i]));
  const hits = findAll(folded(view), needles.map((form) => Buffer.from(form, 'latin1')), MAX_HITS);
  const first = (k: number): { form: string; hits: number[] } | undefined =>
    (forms[k] ?? []).map((form) => ({ form, hits: hits[index.get(form) ?? -1] ?? [] })).find((f) => f.hits.length);
  return names.map((n, k): Found => ({ ...n, hits: [], ...first(k) })).filter((n) => n.hits.length);
}

/** The most common shift among the names read in a custom character set, and the names that read under it. */
export interface Shifted { shift?: number; names: Found[] }

// A custom character set: only names long enough for the letters' distances to mean anything, in each case the display might use.
export function foundShifted(names: readonly Name[], view: Buffer): Shifted {
  const long = names.filter((n) => n.name.length >= 6);
  const forms = long.map((n) => [n.name, n.name.toUpperCase(), n.name.toLowerCase()]);
  const hits = shiftedHitsMany(view, forms.flat()); // one pass for every form of every name (KWB-120)
  const shifted = long.map((n, k): Found => {
    const all = hits.slice(k * 3, k * 3 + 3).flat();
    const shift = all[0]?.shift;
    return { ...n, hits: all.map((h) => h.at), ...(shift === undefined ? {} : { shift }) };
  }).filter((n) => n.hits.length);
  const counts = new Map<number | undefined, number>();
  for (const n of shifted) counts.set(n.shift, (counts.get(n.shift) ?? 0) + 1);
  const best = [...counts].sort((a, b) => b[1] - a[1])[0];
  return best?.[0] === undefined ? { names: [] } : { shift: best[0], names: shifted.filter((n) => n.shift === best[0]) };
}
