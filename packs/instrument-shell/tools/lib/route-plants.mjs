// A small clean menu, and one planted fault for each law of route-judge.mjs. The tool's --selftest and the kit's test both
// judge them: the clean table has no fault, and each plant is caught by its own law.

/** Four pages: a home screen, an edit screen, a pulldown on both, and a window on the pulldown. EXIT goes back from anywhere. */
export const CLEAN = {
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

const page = (t, id) => t.pages.find((p) => p.id === id);

// Each law and the change to the clean table that breaks it.
export const PLANTS = {
  'no-start': (t) => { t.start = 'nowhere'; },
  'unknown-page': (t) => { t.routes.find((r) => r.input === 'EDIT').to = 'edits'; },
  'unknown-input': (t) => { t.routes.push({ from: 'home', input: 'PLAY', to: 'edit' }); },
  'two-outcomes': (t) => { t.routes.push({ from: 'home', input: 'MENU', to: 'edit' }); },
  unreached: (t) => { t.pages.push({ id: 'orphan', kind: 'screen', branch: 'Play' }); },
  trap: (t) => {
    page(t, 'edit').inputs.push('MORE');
    t.pages.push({ id: 'stuck', kind: 'screen', branch: 'Edit' });
    t.routes.push({ from: 'edit', input: 'MORE', to: 'stuck' }, { from: 'stuck', input: 'EXIT', to: 'stuck' });
  },
  unrouted: (t) => { page(t, 'home').inputs.push('HELP'); },
  'inert-and-routed': (t) => { t.inert.push({ page: 'home', input: 'MENU', why: 'planted' }); },
  'inert-without-why': (t) => { page(t, 'home').inputs.push('HELP'); t.inert.push({ page: 'home', input: 'HELP', why: '' }); },
  'overlay-no-close': (t) => {
    t.routes.find((r) => r.from === 'write').to = 'home';
    t.routes.push({ from: 'write', input: 'EXIT', to: 'home' });
  },
};

/** The clean table with one law's fault planted, as a fresh copy. */
export function planted(law) {
  const t = structuredClone(CLEAN);
  PLANTS[law](t);
  return t;
}
