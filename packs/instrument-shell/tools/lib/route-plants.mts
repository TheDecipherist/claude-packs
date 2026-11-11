// A small clean menu, and one planted fault for each law of route-judge.mjs. The tool's --selftest and the kit's test both
// judge them: the clean table has no fault, and each plant is caught by its own law.
import type { Inert, Route, RoutePage, RouteTable } from './route-judge.mts';

/** A table whose lists are all there, so a plant can add to them. */
type FullTable = RouteTable & { pages: RoutePage[]; routes: Route[]; inert: Inert[] };

/** Four pages: a home screen, an edit screen, a pulldown on both, and a window on the pulldown. EXIT goes back from anywhere. */
export const CLEAN: FullTable = {
  start: 'home',
  inputs: ['EXIT'],
  pages: [
    { id: 'home', label: 'Home', kind: 'screen', branch: 'Play', inputs: ['MENU', 'EDIT'] },
    { id: 'edit', label: 'Edit', kind: 'screen', branch: 'Edit', inputs: ['MENU'] },
    { id: 'menu', label: 'Menu', kind: 'pulldown', branch: 'Play', inputs: ['WRITE'] },
    { id: 'write', label: 'Write', kind: 'window', branch: 'Play', inputs: ['OK'] },
  ],
  routes: [
    { from: 'home', input: 'MENU', to: 'menu' },
    { from: 'home', input: 'EDIT', to: 'edit' },
    { from: 'edit', input: 'MENU', to: 'menu' },
    { from: 'menu', input: 'WRITE', to: 'write' },
    { from: 'write', input: 'OK', to: 'back' },
    { from: '*', input: 'EXIT', to: 'back' },
  ],
  inert: [],
};

// The page or the route a plant changes: the clean table has them, so a miss is a fault in the plants.
const page = (t: FullTable, id: string): RoutePage => {
  const found = t.pages.find((p) => p.id === id);
  if (!found) throw new Error(`the clean table has no page ${id}`);
  return found;
};
const routeOf = (t: FullTable, match: (r: Route) => boolean): Route => {
  const found = t.routes.find(match);
  if (!found) throw new Error('the clean table has no such route');
  return found;
};
const pageInputs = (t: FullTable, id: string): string[] => (page(t, id).inputs ??= []);

// Each law and the change to the clean table that breaks it.
export const PLANTS: Readonly<Record<string, (t: FullTable) => void>> = {
  'no-start': (t) => { t.start = 'nowhere'; },
  'unknown-page': (t) => { routeOf(t, (r) => r.input === 'EDIT').to = 'edits'; },
  'unknown-input': (t) => { t.routes.push({ from: 'home', input: 'PLAY', to: 'edit' }); },
  'two-outcomes': (t) => { t.routes.push({ from: 'home', input: 'MENU', to: 'edit' }); },
  unreached: (t) => { t.pages.push({ id: 'orphan', kind: 'screen', branch: 'Play' }); },
  trap: (t) => {
    pageInputs(t, 'edit').push('MORE');
    t.pages.push({ id: 'stuck', kind: 'screen', branch: 'Edit' });
    t.routes.push({ from: 'edit', input: 'MORE', to: 'stuck' }, { from: 'stuck', input: 'EXIT', to: 'stuck' });
  },
  unrouted: (t) => { pageInputs(t, 'home').push('HELP'); },
  'inert-and-routed': (t) => { t.inert.push({ page: 'home', input: 'MENU', why: 'planted' }); },
  'inert-without-why': (t) => { pageInputs(t, 'home').push('HELP'); t.inert.push({ page: 'home', input: 'HELP', why: '' }); },
  'overlay-no-close': (t) => {
    routeOf(t, (r) => r.from === 'write').to = 'home';
    t.routes.push({ from: 'write', input: 'EXIT', to: 'home' });
  },
};

/** The clean table with one law's fault planted, as a fresh copy. */
export function planted(law: string): RouteTable {
  const t = structuredClone(CLEAN);
  const plant = PLANTS[law];
  if (!plant) throw new Error(`no plant for the law ${law}`);
  plant(t);
  return t;
}
