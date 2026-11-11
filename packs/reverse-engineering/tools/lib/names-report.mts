// The sweep of one image for the names a manual prints, and its report: every wrapping in unwrap.mjs is tried and the one that reads the most
// names wins (names reading prove the unwrapping). names-sweep.mjs is the command line over these.
import { abbreviated, found, foundShifted } from './names-find.mts';
import type { Name } from './names-find.mts';
import { groupsOf } from './names-tables.mts';
import type { Group } from './names-tables.mts';
import { entropyOf, wrappings } from './unwrap.mts';

export { abbreviationOf, displayForms, readNames } from './names-find.mts';

const FLAT = 7.5; // bits per byte: past this no text is showing and no structure either
const PROOF = 3; // names: one or two can read by chance in a large image, so fewer proves nothing

/** What a sweep of one image found. */
export interface Sweep {
  names: number; wrapping: string | null; reads: number; entropy: number; shortened: [string, string | undefined][]; proven: boolean;
  tried: { name: string; reads: number }[]; groups: Group[]; missing: string[];
}

export function sweep(image: Buffer, names: readonly Name[], { bases = [0] }: { bases?: readonly number[] } = {}): Sweep {
  const tried = wrappings().map((w) => { const view = w.open(image); return { name: w.name, view, hits: found(names, view) }; });
  const relative = foundShifted(names, image);
  tried.push({ name: `custom character set, shift ${relative.shift ?? '-'}`, view: image, hits: relative.names });
  tried.sort((a, b) => b.hits.length - a.hits.length);
  const best = tried[0];
  if (!best) throw new Error('no wrapping was tried');
  const read = new Set(best.hits.map((n) => n.name));
  const shortened = best.hits.length >= PROOF ? abbreviated(best.view, names.filter((n) => !read.has(n.name))) : [];
  best.hits.push(...shortened);
  const seen = new Set(best.hits.map((n) => n.name));
  return {
    names: names.length, wrapping: best.hits.length ? best.name : null, reads: best.hits.length, entropy: entropyOf(image), shortened: shortened.map((n): [string, string | undefined] => [n.name, n.abbreviated]),
    proven: best.hits.length >= Math.min(PROOF, names.length),
    tried: tried.map((t) => ({ name: t.name, reads: t.hits.length })),
    groups: best.hits.length ? groupsOf(best.hits, best.view, bases, names) : [],
    missing: names.filter((n) => !seen.has(n.name)).map((n) => n.name),
  };
}

const hex = (n: number | undefined): string => `0x${(n ?? 0).toString(16).toUpperCase()}`;
function groupLine(g: Group): string {
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

function nothingRead(label: string, r: Sweep): string {
  const searched = r.tried.map((t) => t.name).join(', ');
  const said = r.reads ? `only ${r.reads} of ${r.names} names read, which chance can do, under` : `none of ${r.names} names reads under`;
  const flat = r.entropy >= FLAT ? ' It looks compressed or encrypted: read what loads it, and if nothing does, record that the text is not in these files and stop.' : '';
  return `${label}: ${said} any of ${r.tried.length} wrappings. Searched: ${searched}.\n` +
    `The image is still wrapped some other way, or the names file is wrong. This says nothing about what the machine holds. Entropy ${r.entropy.toFixed(2)} bits per byte.${flat}`;
}

export function report(label: string, r: Sweep): string {
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
