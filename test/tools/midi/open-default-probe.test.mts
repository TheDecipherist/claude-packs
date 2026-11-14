// open-default-probe (midi's tool): the sync default at open (decided C6/C9). A delay that opens free as a plugin and an LFO that
// opens synced are refused; the decided defaults pass; a stored state loads as stored; a timbre time never follows tempo.
// The tool runs from an install, as a project runs it: it imports base's hook lib beside it.
import { assert, fresh, join, run, spawnSync, test, writeFileSync } from '../../kit-cli.mts';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';
import { fixture } from '../../fixtures/installs.mts';

const INSTALL = fixture('cpp');
run(INSTALL, 'add', 'midi');
const TOOL = join(INSTALL, '.claude/tools/open-default-probe.mjs');

interface Dest { name: string; kind: string; mode: string; hardware?: string; stored?: string }
const synced = (name: string, ms = 500): { name: string; at120: number; at90: number } => ({ name, at120: ms, at90: ms * (120 / 90) });
const free = (name: string, ms = 247): { name: string; at120: number; at90: number } => ({ name, at120: ms, at90: ms });

function probe(destinations: Dest[], measured: unknown[]): { status: number | null; out: string } {
  const spec = join(fresh('open-default-'), 'spec.json');
  writeFileSync(spec, toJson({ destinations, measured }));
  const done = spawnSync('node', [TOOL, spec], { encoding: 'utf8' });
  return { status: done.status, out: done.stdout + done.stderr };
}

const DELAY: Dest = { name: 'delay', kind: 'delay', mode: 'plugin' };
const LFO: Dest = { name: 'lfo', kind: 'lfo', mode: 'plugin' };

test('the decided defaults pass: a plugin delay synced, an LFO and an envelope free, a timbre time free', () => {
  const units: Dest[] = [DELAY, LFO, { name: 'env', kind: 'envelope', mode: 'plugin' }, { name: 'pre', kind: 'timbre', mode: 'plugin' }];
  const done = probe(units, [synced('delay'), free('lfo'), free('env'), free('pre', 12)]);
  assert.equal(done.status, 0, done.out);
});

test('a delay that opens free as a plugin is refused', () => {
  const done = probe([DELAY], [free('delay')]);
  assert.equal(done.status, 1);
  assert.match(done.out, /delay .*must open synced, measured free/);
});

test('an LFO that opens synced is refused', () => {
  const done = probe([LFO], [synced('lfo')]);
  assert.equal(done.status, 1);
  assert.match(done.out, /lfo .*must open free, measured synced/);
});

test('standalone opens as the hardware did, a stored state loads as stored, a timbre time never follows tempo', () => {
  assert.equal(probe([{ name: 'd', kind: 'delay', mode: 'standalone' }], [free('d')]).status, 0, 'standalone with no hardware default opens free');
  assert.equal(probe([{ name: 'd', kind: 'delay', mode: 'standalone', hardware: 'synced' }], [synced('d')]).status, 0);
  assert.equal(probe([{ ...DELAY, stored: 'free' }], [free('delay', 247)]).status, 0, 'a stored free delay stays free');
  assert.equal(probe([{ name: 'p', kind: 'timbre', mode: 'plugin' }], [synced('p', 12)]).status, 1);
});

test('a time that scales with neither ratio is refused, an unmeasured destination is a fault, misuse exits 2', () => {
  assert.equal(probe([DELAY], [{ name: 'delay', at120: 500, at90: 600 }]).status, 1);
  assert.match(probe([DELAY], []).out, /delay: not measured at open/);
  assert.equal(spawnSync('node', [TOOL], { encoding: 'utf8' }).status, 2);
});

test('a kind or mode that is not in the list is a wrong use (exit 2), not read as a plugin or a non-delay', () => {
  assert.equal(probe([{ ...DELAY, kind: 'dely' }], [synced('delay')]).status, 2);
  assert.equal(probe([{ ...DELAY, mode: 'plug-in' }], [synced('delay')]).status, 2);
  assert.equal(probe([{ ...DELAY, stored: 'sync' }], [synced('delay')]).status, 2);
});

test('a timbre time stored synced is a fault: timbre times never follow tempo (C9), stored or not', () => {
  const done = probe([{ name: 'pre', kind: 'timbre', mode: 'plugin', stored: 'synced' }], [synced('pre', 12)]);
  assert.equal(done.status, 1, done.out);
  assert.match(done.out, /pre \(timbre, plugin\): must open free/);
});
