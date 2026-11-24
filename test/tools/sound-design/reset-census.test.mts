// reset-census (sound-design's tool, reset-before-apply): every engine class that declares a reset() must have its fate
// on a patch load in the reset map. Found in supernova2_monitor (its B-185): a program load flushed the notes and left the
// comb's delay lines ringing, and the reset-before-apply check passed because the load called a reset. Run from an
// install, as a project runs it.
import { assert, fresh, join, mkdirSync, run, spawnSync, test, writeFileSync } from '../../kit-cli.mts';
import { fixture } from '../../fixtures/installs.mts';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';

const INSTALL = fixture('synth-creator');
run(INSTALL, 'add', 'sound-design');
const TOOL = join(INSTALL, '.claude/tools/reset-census.mjs');

const COMB = 'class CombFilter final {\npublic:\n    void prepare (double rate);\n    void reset() noexcept;\n};\n';
const EQ = 'struct Eq {\n    void reset() { z = 0.0; }\n    double z = 0.0;\n};\n';
const PLAIN = 'struct Settings {\n    float cutoff = 0.5f;\n};\n';
const NESTED = 'class Chain {\n    struct Stage {\n        void reset();\n    };\n    Stage a;\n};\n';

/** A source folder holding `files` ({ "rel/path": text }), the map beside it, and the census run over them. */
function censusOf(files: Record<string, string>, map: object) {
  const dir = fresh('reset-census-');
  const src = join(dir, 'src');
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(join(src, rel, '..'), { recursive: true });
    writeFileSync(join(src, rel), text);
  }
  writeFileSync(join(dir, 'reset-map.json'), toJson(map));
  const r = spawnSync('node', [TOOL, join(dir, 'reset-map.json'), src], { encoding: 'utf8' });
  return { status: r.status, text: r.stdout + r.stderr };
}

const ENGINE = { 'dsp/comb/CombFilter.h': COMB, 'dsp/Eq.h': EQ, 'dsp/Settings.h': PLAIN };

test('a module the map leaves out fails, by name: the comb a load never cleared', () => {
  const r = censusOf(ENGINE, { modules: { Eq: { fate: 'cleared', source: '[FW] h8:0x1000' } } });
  assert.equal(r.status, 1, r.text);
  assert.match(r.text, /MISSING CombFilter/);
  assert.match(r.text, /1 of 2 in the map/);
});

test('every module with a fate and a source passes; a carried module counts as decided', () => {
  const r = censusOf(ENGINE, { modules: {
    CombFilter: { fate: 'cleared', source: '[FW] h8:0x2000' },
    Eq: { fate: 'carried', source: '[FW] h8:0x2010, untouched by the program-change path' },
  } });
  assert.equal(r.status, 0, r.text);
});

test('a nested class keeps its reset to itself: the outer class is no module', () => {
  const r = censusOf({ 'Chain.h': NESTED }, { modules: { Stage: { fate: 'cleared', source: '[SCH] sheet 3' } } });
  assert.equal(r.status, 0, r.text);
  assert.match(r.text, /1 stateful modules/);
});

test('an entry with no fate or no source, and an entry naming no module, each fail', () => {
  const r = censusOf(ENGINE, { modules: {
    CombFilter: { fate: 'cleared' },
    Eq: { fate: 'maybe', source: '[FW] x' },
    Reverb: { fate: 'cleared', source: '[FW] y' },
  } });
  assert.equal(r.status, 1, r.text);
  assert.match(r.text, /INCOMPLETE CombFilter/);
  assert.match(r.text, /INCOMPLETE Eq/);
  assert.match(r.text, /STALE Reverb/);
});

test('a folder with no stateful module fails, so the census never passes on nothing', () => {
  const r = censusOf({ 'Settings.h': PLAIN }, { modules: {} });
  assert.equal(r.status, 1, r.text);
  assert.match(r.text, /measured nothing/);
});

test('misuse exits 2', () => {
  assert.equal(spawnSync('node', [TOOL], { encoding: 'utf8' }).status, 2);
});
