// A menu's route table, judged. The table is the one source of a menu system: its pages, the inputs each page takes, and the
// routes (page, input, condition) -> page or back. The project's generator writes it as JSON from its own table; this reads it.
//
//   { "start": "<page id>",
//     "inputs": ["<an input every page takes>", ...],                  optional: the panel's own buttons
//     "overlays": ["pulldown", "window"],                               optional: the kinds that sit on a page and close back to it
//     "pages":  [{ "id", "label"?, "kind"?, "branch"?, "inputs"?: [...] }],
//     "routes": [{ "from": "<page id>" | "*", "input", "to": "<page id>" | "back", "when"?, "source"? }],
//     "inert":  [{ "page": "<page id>" | "*", "input", "why" }] }
//
// A route from "*" serves every page that has no route of its own for that input and condition. "back" returns to the page
// beneath (an overlay) or the page that led here, so for reachability it leads to every page that routes into this one.

export const ANY = '*';
export const BACK = 'back';
const DEFAULT_OVERLAYS = ['pulldown', 'window'];

/** A page of the menu. */
export interface RoutePage { id: string; label?: string; kind?: string; branch?: string; inputs?: string[] }
/** A route: from a page (or "*"), on an input, perhaps when a condition holds, to a page or "back". */
export interface Route { from: string; input: string; to: string; when?: string; source?: string }
/** An input a page declares it ignores, and why. */
export interface Inert { page: string; input: string; why?: string }
/** The table as the project's generator writes it. */
export interface RouteTable { start: string; inputs?: string[]; overlays?: string[]; pages?: RoutePage[]; routes?: Route[]; inert?: Inert[] }
/** The table with its lookups: pages by id, each page's inputs, the overlay kinds. */
export interface ReadTable {
  start: string; pages: Map<string, RoutePage>; inputsOf: (id: string) => Set<string>; overlays: Set<string>; routes: Route[]; inert: Inert[];
}
/** One fault: the law it breaks, and what is wrong, in one line. */
export interface Fault { law: string; what: string }

/** One (page, input, condition) as a single string: two routes with the same one must lead to the same place. */
const routeKey = (from: string, input: string, when = ''): string => `${from}\u0000${input}\u0000${when}`;

export function readTable(table: RouteTable): ReadTable {
  const pages = new Map((table.pages ?? []).map((p) => [p.id, p] as const));
  const shared = table.inputs ?? [];
  const inputsOf = (id: string): Set<string> => new Set([...shared, ...(pages.get(id)?.inputs ?? [])]);
  const overlays = new Set(table.overlays ?? DEFAULT_OVERLAYS);
  return { start: table.start, pages, inputsOf, overlays, routes: table.routes ?? [], inert: table.inert ?? [] };
}

/** Every route that applies to a page: its own rows, then the "*" rows for inputs and conditions it does not route itself. */
export function routesOf(t: ReadTable, id: string): Route[] {
  const own = t.routes.filter((r) => r.from === id);
  const ownKeys = new Set(own.map((r) => routeKey(id, r.input, r.when)));
  const shared = t.routes.filter((r) => r.from === ANY && !ownKeys.has(routeKey(id, r.input, r.when)));
  return [...own, ...shared.map((r) => ({ ...r, from: id }))];
}

/** Where each page leads, "back" resolved to every page that routes into it. */
export function edges(t: ReadTable): Map<string, string[]> {
  const out = new Map<string, string[]>([...t.pages.keys()].map((id) => [id, []]));
  const into = new Map<string, Set<string>>([...t.pages.keys()].map((id) => [id, new Set()]));
  const all = [...t.pages.keys()].flatMap((id) => routesOf(t, id));
  for (const r of all) if (r.to !== BACK) into.get(r.to)?.add(r.from);
  for (const r of all) out.get(r.from)?.push(...(r.to === BACK ? [...(into.get(r.from) ?? [])] : t.pages.has(r.to) ? [r.to] : []));
  return out;
}

function reached(from: string, next: (id: string) => string[] | undefined): Set<string> {
  const seen = new Set([from]);
  const queue = [from];
  for (let id = queue.shift(); id !== undefined; id = queue.shift()) for (const n of next(id) ?? []) if (!seen.has(n)) seen.add(n), queue.push(n);
  return seen;
}

const known = (t: ReadTable, id: string): boolean => id === ANY || t.pages.has(id);

// Each law: a name, and a function from the read table to what breaks it (one line each).
const LAWS: Readonly<Record<string, (t: ReadTable) => string[]>> = {
  'no-start': (t) => (t.pages.has(t.start) ? [] : [`the start "${t.start}" is no page`]),
  'unknown-page': (t) => [
    ...t.routes.filter((r) => !known(t, r.from)).map((r) => `a route from "${r.from}" (${r.input}): no such page`),
    ...t.routes.filter((r) => r.to !== BACK && !t.pages.has(r.to)).map((r) => `"${r.from}" ${r.input} leads to "${r.to}": no such page`),
    ...t.inert.filter((i) => !known(t, i.page)).map((i) => `inert ${i.input} on "${i.page}": no such page`),
  ],
  'unknown-input': (t) => t.routes.filter((r) => r.from !== ANY && t.pages.has(r.from) && !t.inputsOf(r.from).has(r.input))
    .map((r) => `"${r.from}" routes ${r.input}, an input the page does not take`),
  'two-outcomes': (t) => {
    const seen = new Map<string, string[]>();
    for (const r of t.routes) seen.set(routeKey(r.from, r.input, r.when), [...(seen.get(routeKey(r.from, r.input, r.when)) ?? []), r.to]);
    return [...seen].filter(([, to]) => new Set(to).size > 1).map(([k, to]) => {
      const [from, input, when] = k.split('\u0000');
      return `"${from}" ${input}${when ? ` (${when})` : ''} leads to ${[...new Set(to)].join(' and ')}`;
    });
  },
  unreached: (t) => {
    if (!t.pages.has(t.start)) return [];
    const out = edges(t);
    const seen = reached(t.start, (id) => out.get(id));
    return [...t.pages.keys()].filter((id) => !seen.has(id)).map((id) => `"${id}" is reached by no route from "${t.start}"`);
  },
  trap: (t) => {
    if (!t.pages.has(t.start)) return [];
    const out = edges(t);
    return [...t.pages.keys()].filter((id) => !reached(id, (n) => out.get(n)).has(t.start)).map((id) => `"${id}" has no way back to "${t.start}"`);
  },
  unrouted: (t) => [...t.pages.keys()].flatMap((id) => {
    const routed = new Set(routesOf(t, id).map((r) => r.input));
    const inert = new Set(t.inert.filter((i) => i.page === id || i.page === ANY).map((i) => i.input));
    return [...t.inputsOf(id)].filter((input) => !routed.has(input) && !inert.has(input)).map((input) => `"${id}" ${input}: no route and not declared inert`);
  }),
  'inert-and-routed': (t) => t.inert.filter((i) => i.page !== ANY && t.routes.some((r) => r.from === i.page && r.input === i.input))
    .map((i) => `"${i.page}" ${i.input} is declared inert and routed`),
  'inert-without-why': (t) => t.inert.filter((i) => !String(i.why ?? '').trim()).map((i) => `inert ${i.input} on "${i.page}" gives no reason`),
  'overlay-no-close': (t) => [...t.pages.values()].filter((p) => p.kind !== undefined && t.overlays.has(p.kind) && !routesOf(t, p.id).some((r) => r.to === BACK))
    .map((p) => `the ${p.kind} "${p.id}" has no route back to the page beneath`),
};

export const LAW_NAMES: string[] = Object.keys(LAWS);

/** Every fault in a table, as { law, what }. An empty list is a clean table. */
export function judge(table: RouteTable): Fault[] {
  const t = readTable(table);
  return Object.entries(LAWS).flatMap(([law, find]) => find(t).map((what) => ({ law, what })));
}
