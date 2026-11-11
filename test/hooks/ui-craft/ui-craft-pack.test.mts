// The ui-craft pack's install and its tools, with no hook of its own (0.17.0, 0.22.0): the presets bring it, every check names a rule
// that is there, doctor asks for a page gate, the page-measure tool runs in real Chrome, one template is tested once, and the laws
// the sources agreed on are in the rules and skills. The pack's checks: lesson-checks.test.mts.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';
import { judge, measure } from '../../../packs/ui-craft/tools/page-measure.mts';
import type { PageFacts } from '../../../packs/ui-craft/tools/page-measure.mts';
import { withLayout } from '../../fixtures/installs.mts';
import { KIT, cli, spawnSync } from '../../kit-cli.mts';
import { fixture } from '../hook-rig.mts';
import { uiChecks } from './checks.mts';

const CHROME = ['/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => existsSync(p));
const readPack = (rel: string): string => readFileSync(join(KIT, 'packs', rel), 'utf8');

test('the UI presets and full-stack bring the pack; every check names a rule that is there, and every rule names checks that are', () => {
  const dir = fixture('next-app');
  assert.ok(existsSync(join(dir, '.claude/rules/no-generated-look.md')));
  const checks = uiChecks();
  for (const c of checks) assert.ok(existsSync(join(KIT, 'packs/ui-craft', c.rule.replace('.claude/', ''))), c.id);
  for (const r of readdirSync(join(KIT, 'packs/ui-craft/rules'))) {
    for (const [, id] of readPack(`ui-craft/rules/${r}`).matchAll(/`(ui-[a-z-]+)`/g)) assert.ok(checks.some((c) => c.id === id), `${r} names ${id}`);
  }
});

test('doctor is red for UI code with no page gate, and green with one or with a reason', () => {
  const dir = fixture('next-app');
  assert.equal(cli(dir, 'doctor').status, 0, 'no UI code yet: nothing to prove');
  put(join(dir, 'src/ui/Page.tsx'), 'export const Page = () => <main />;\n');
  const red = cli(dir, 'doctor');
  assert.equal(red.status, 1);
  assert.match(red.stdout, /no a11y gate declared/);
  assert.match(red.stdout, /prove-page/);
  withLayout(dir, { gates: { a11y: 'none: a throwaway prototype', hover: 'none: a throwaway prototype' } });
  assert.equal(cli(dir, 'doctor').status, 0);
  withLayout(dir, { gates: { a11y: 'node tools/page-gate.mjs', hover: 'none: a throwaway prototype' } });
  assert.match(cli(dir, 'doctor').stdout, /tools\/page-gate\.mjs, which is not there/);
});

function inChrome(html: string, width = 1440): PageFacts {
  if (!CHROME) throw new Error('no Chrome here');
  const file = join(scratchDir('pm-'), 'page.html');
  put(file, `<!doctype html><html><body>${html}<pre id="out" style="display:none"></pre><script>document.getElementById('out').textContent = JSON.stringify((${measure.toString()})());</script></body></html>`);
  const r = spawnSync(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', `--window-size=${width},900`, '--virtual-time-budget=3000', '--dump-dom', `file://${file}`], { encoding: 'utf8', timeout: 60_000 });
  const found = /<pre id="out"[^>]*>(.*?)<\/pre>/s.exec(r.stdout)?.[1];
  assert.ok(found, 'Chrome printed the measure');
  return JSON.parse(found.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) as PageFacts;
}

test('page-measure in real Chrome: a sound page passes, and each planted fault is named', { skip: !CHROME && 'no Chrome here' }, () => {
  const good = '<main style="margin:0 40px"><h1>One title</h1><h2>A section</h2><p>Words at a readable size.</p></main>';
  assert.deepEqual(judge(inChrome(good)), []);
  const fails = (html: string): string => judge(inChrome(html)).join('\n');
  assert.match(fails('<main><h2>No h1</h2></main>'), /0 h1/);
  assert.match(fails('<main><h1>a</h1><div style="width:3000px">wide</div></main>'), /scrolls sideways/);
  assert.match(fails('<main><h1>a</h1><h3>skip</h3></main>'), /heading level is skipped/);
  assert.match(fails('<main><h1>a</h1><p style="font-size:9px">tiny</p></main>'), /under 12px/);
  assert.match(fails('<main><h1>a</h1><p style="opacity:0">gone</p></main>'), /hidden at rest/);
  assert.match(fails('<main style="margin-left:300px"><h1>a</h1></main>'), /unequal page margins/);
  assert.match(fails(`<main style="width:300px"><h1 style="font-size:60px">${'word '.repeat(30)}</h1></main>`), /over two lines/);
});

test('one template: a thousand instances cost one read and a handful of swaps, not half a million', () => {
  const dir = fixture('base');
  put(join(dir, 'design/shape.json'), toJson({ concepts: { control: { shape: 'many', count: 1000, generator: 'controlId(i)', symmetry: { members: 'echo same', swap: 'true' } } }, exclude: [] }));
  const r = cli(dir, 'symmetry', 'run', 'control');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const n = Number(/swap: (\d+) pairs checked \(a spread of N = 1000\)/.exec(r.stdout)?.[1]);
  assert.ok(n > 0 && n < 20, `${n} swaps`);
});

test('no law still asks to walk every instance: one per template, the rest by a read', () => {
  for (const rel of ['audio-core/rules/house-control-behaviours.md', 'audio-core/skills/prove-control/SKILL.md', 'gpu-painter/skills/hover-state/SKILL.md', 'ui-craft/skills/hover-state/SKILL.md']) {
    assert.match(readPack(rel), /one (?:control|item|element) of (?:this|each) (?:template|component)/, rel);
    assert.doesNotMatch(readPack(rel), /walk every control|for every interactive element|on every slot it appears/, rel);
  }
});

test('an on-screen keyboard lights what sounds and has KB OCT, a kind is one size, and a window test stays off the desktop', () => {
  const house = readPack('audio-core/rules/house-control-behaviours.md');
  for (const law of [/whatever played it: MIDI, QWERTY/, /KB OCT header above the keyboard/, /reading 0, -12, \+12/, /never MIDI or a host's notes/, /Size every control of a kind the same/, /narrower than the tightest row/, /DOUBLE and TRIPLE beside KB OCT/, /a whole voice an octave up/, /a whole voice an octave down/, /note-off stops every voice its key started/]) assert.match(house, law);
  assert.match(readPack('audio-core/rules/a-control-is-proved-through-its-input.md'), /xvfb-run -a/);
});

test('scan names elements built by hand more than once, html and c++', () => {
  const dir = scratchDir('uid-scan-');
  const card = (t: string): string => `<div class="card"><h3 class="t">${t}</h3><p>${t}</p><a href="/">more</a></div>\n`;
  const knob = (n: string): string => `  ${n}.setRange (0.0, 1.0);\n  ${n}.setValue (0.5);\n  ${n}.setStyle (Rotary);\n`;
  mkdirSync(join(dir, 'src'));
  put(join(dir, 'src/a.html'), card('A'));
  put(join(dir, 'src/b.html'), card('B'));
  put(join(dir, 'src/c.cpp'), `void f() {\n${knob('cutoff')}\n  int gap;\n${knob('drive')}}\n`);
  const r = cli(dir, 'scan');
  const report = /Report: (\S+)/.exec(r.stdout)?.[1];
  assert.ok(report, r.stdout + r.stderr);
  const text = readFileSync(report, 'utf8');
  assert.match(text, /2 repeat\(s\) written by hand/);
  assert.match(text, /2x <div>: src\/a\.html:1, src\/b\.html:1\. Make it one component/);
  assert.match(text, /2x cutoff: src\/c\.cpp:2, src\/c\.cpp:7\. Make it one factory/);
});
