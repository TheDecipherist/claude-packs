// 1.7.0: a menu system is one route table, judged by instrument-shell's route-table tool and drawn from it as Mermaid. The
// user: a menu like the V-Synth's must be ironclad, and a Mermaid diagram fits its shape, so the picture is made from the table.
import { KIT, assert, existsSync, fresh, join, readdirSync, readFileSync, run, spawnSync, test, writeFileSync } from './kit-cli.mts';
import { judge, LAW_NAMES } from '../packs/instrument-shell/tools/lib/route-judge.mjs';
import { diagrams } from '../packs/instrument-shell/tools/lib/route-mermaid.mjs';
import { CLEAN, PLANTS, planted } from '../packs/instrument-shell/tools/lib/route-plants.mjs';

// The command runs from an install, as a project runs it: it finds base's hook lib beside the tools (W4: isMain from hook-log).
const INSTALL = fresh('route-tool-install-');
run(INSTALL, 'init', 'instrument-shell', '--config', 'synth-creator', 'cpp', 'audio-core');
const TOOL = join(INSTALL, '.claude/tools/route-table.mjs');
const tool = (...args) => spawnSync('node', [TOOL, ...args], { encoding: 'utf8' });
const tableFile = (table) => { const f = join(fresh('routes-'), 'routes.json'); writeFileSync(f, JSON.stringify(table)); return f; };

test('a clean menu has no fault, and every law catches its own planted fault', () => {
  assert.deepEqual(judge(CLEAN), []);
  assert.deepEqual(Object.keys(PLANTS).sort(), [...LAW_NAMES].sort(), 'every law has a plant, and every plant a law');
  for (const law of LAW_NAMES) assert.ok(judge(planted(law)).some((f) => f.law === law), `${law} misses its plant: ${JSON.stringify(judge(planted(law)))}`);
});

test('the faults say which page and which input, so the table row can be found', () => {
  const said = (law) => judge(planted(law)).filter((f) => f.law === law).map((f) => f.what).join(' | ');
  assert.match(said('two-outcomes'), /"home" MENU leads to menu and edit/);
  assert.match(said('unreached'), /"orphan" is reached by no route from "home"/);
  assert.match(said('trap'), /"stuck" has no way back to "home"/);
  assert.match(said('unrouted'), /"home" HELP: no route and not declared inert/);
  assert.match(said('overlay-no-close'), /the window "write" has no route back/);
});

test('a page\'s own route wins over a route from any page, and a condition makes a second outcome its own', () => {
  const own = structuredClone(CLEAN);
  own.routes.push({ from: 'edit', input: 'EXIT', to: 'home' });
  assert.deepEqual(judge(own), [], 'edit\'s own EXIT is no second outcome of the shared one');
  const when = structuredClone(CLEAN);
  when.routes.push({ from: 'home', input: 'MENU', to: 'edit', when: 'shift held' });
  assert.deepEqual(judge(when), [], 'MENU with shift held is another route');
});

test('the command: clean exits 0, faults exit 1 with their law, misuse exits 2, and its selftest passes', () => {
  assert.equal(tool('check', tableFile(CLEAN)).status, 0);
  const bad = tool('check', tableFile(planted('trap')));
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /^trap: "stuck" has no way back/m);
  assert.equal(tool('check').status, 2);
  assert.equal(tool('nonsense').status, 2);
  const self = tool('--selftest');
  assert.equal(self.status, 0, self.stderr);
  assert.match(self.stdout, new RegExp(`${LAW_NAMES.length} laws each catch their plant`));
});

// Another reader of the diagrams: every edge read back by its node labels equals the table's routes, branch by branch.
function edgesIn(text) {
  const labels = new Map([...text.matchAll(/^ {2}(n\d+)[[({]+"(.*?)"[\])}]+$/gm)].map((m) => [m[1], m[2].replace(/^[\w ]+: /, '')]));
  return [...text.matchAll(/^ {2}(n\d+) -\.?->\|"(.*?)"\| (n\d+)$/gm)].map((m) => `${labels.get(m[1])} ${m[2]} ${labels.get(m[3])}`).sort();
}

test('the Mermaid is drawn from the table: each branch has its own diagram, and its edges read back as the table\'s routes', () => {
  const label = (id) => ({ '*': 'any page', back: 'back' })[id] ?? CLEAN.pages.find((p) => p.id === id).label;
  const drawn = diagrams(CLEAN);
  assert.deepEqual(drawn.map((d) => d.file).sort(), ['Edit.mmd', 'Play.mmd']);
  for (const d of drawn) {
    const here = CLEAN.pages.filter((p) => p.branch === d.name).map((p) => p.id);
    const want = CLEAN.routes.filter((r) => here.includes(r.from) || r.from === '*').map((r) => `${label(r.from)} ${r.input} ${label(r.to)}`).sort();
    assert.deepEqual(edgesIn(d.text), want, d.name);
  }
  const dir = fresh('mmd-');
  assert.equal(tool('mermaid', tableFile(CLEAN), dir).status, 0);
  assert.deepEqual(readdirSync(dir).sort(), ['Edit.mmd', 'Play.mmd']);
});

test('instrument-shell installs the route tool, its rule and the layer law, and the installed tool proves itself', () => {
  const dir = fresh('routes-install-');
  run(dir, 'init', 'instrument-shell');
  for (const f of ['tools/route-table.mjs', 'tools/lib/route-judge.mjs', 'tools/lib/route-mermaid.mjs', 'tools/lib/route-plants.mjs', 'rules/menu-is-one-route-table.md', 'rules/hidden-under-a-layer-is-idle.md', 'skills/prove-hidden-is-idle/SKILL.md']) {
    assert.ok(existsSync(join(dir, '.claude', f)), f);
  }
  const self = spawnSync('node', [join(dir, '.claude/tools/route-table.mjs'), '--selftest'], { encoding: 'utf8' });
  assert.equal(self.status, 0, self.stderr);
  assert.match(readFileSync(join(dir, '.claude/rules/menu-is-one-route-table.md'), 'utf8'), /route-table\.mjs check/);
});
