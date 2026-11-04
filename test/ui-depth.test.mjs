// 0.22.0: everything in taste-skill, hover that says so, and one template tested once. The page-measure tool runs in real Chrome.
import { KIT, assert, cli, existsSync, fresh, holdToExamples, join, mkdirSync, readFileSync, readdirSync, run, spawnSync, test, writeFileSync } from './kit-cli.mjs';
import { judge, measure } from '../packs/ui-craft/tools/page-measure.mjs';

const CHROME = ['/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => existsSync(p));

function inChrome(html, width = 1440) {
  const file = join(fresh('pm-'), 'page.html');
  writeFileSync(file, `<!doctype html><html><body>${html}<pre id="out" style="display:none"></pre><script>document.getElementById('out').textContent = JSON.stringify((${measure.toString()})());</script></body></html>`);
  const r = spawnSync(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', `--window-size=${width},900`, '--virtual-time-budget=3000', '--dump-dom', `file://${file}`], { encoding: 'utf8', timeout: 60_000 });
  return JSON.parse(r.stdout.match(/<pre id="out"[^>]*>(.*?)<\/pre>/s)[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
}

test('page-measure in real Chrome: a sound page passes, and each planted fault is named', { skip: !CHROME && 'no Chrome here' }, () => {
  const good = '<main style="margin:0 40px"><h1>One title</h1><h2>A section</h2><p>Words at a readable size.</p></main>';
  assert.deepEqual(judge(inChrome(good)), []);
  const fails = (html) => judge(inChrome(html)).join('\n');
  assert.match(fails('<main><h2>No h1</h2></main>'), /0 h1/);
  assert.match(fails('<main><h1>a</h1><div style="width:3000px">wide</div></main>'), /scrolls sideways/);
  assert.match(fails('<main><h1>a</h1><h3>skip</h3></main>'), /heading level is skipped/);
  assert.match(fails('<main><h1>a</h1><p style="font-size:9px">tiny</p></main>'), /under 12px/);
  assert.match(fails('<main><h1>a</h1><p style="opacity:0">gone</p></main>'), /hidden at rest/);
  assert.match(fails('<main style="margin-left:300px"><h1>a</h1></main>'), /unequal page margins/);
  assert.match(fails(`<main style="width:300px"><h1 style="font-size:60px">${'word '.repeat(30)}</h1></main>`), /over two lines/);
});

test('every ui-craft check holds to its examples through the hook; every skill fits', () => {
  const dir = fresh('uid-');
  run(dir, 'init', 'next-app');
  const checks = readdirSync(join(KIT, 'packs/ui-craft/checks')).map((f) => JSON.parse(readFileSync(join(KIT, 'packs/ui-craft/checks', f), 'utf8')));
  assert.ok(checks.length >= 24);
  holdToExamples(dir, checks, (c) => (c.concepts.includes('ui-styles') && !c.bad.includes('<') ? 'src/app.css' : 'src/ui/Thing.tsx'));
  for (const s of readdirSync(join(KIT, 'packs/ui-craft/skills'))) {
    const text = readFileSync(join(KIT, 'packs/ui-craft/skills', s, 'SKILL.md'), 'utf8');
    assert.match(text, /^---\nname: [\w-]+\ndescription: Use when /, s);
    assert.ok(text.length < 8000, s);
  }
  assert.ok(existsSync(join(dir, '.claude/tools/page-measure.mjs')));
});

test('one template: a thousand instances cost one read and a handful of swaps, not half a million', () => {
  const dir = fresh('uid-sym-');
  run(dir, 'init', '--config', 'base');
  mkdirSync(join(dir, 'design'), { recursive: true });
  writeFileSync(join(dir, 'design/shape.json'), JSON.stringify({ concepts: { control: { shape: 'many', count: 1000, generator: 'controlId(i)', symmetry: { members: 'echo same', swap: 'true' } } }, exclude: [] }));
  const r = cli(dir, 'symmetry', 'run', 'control');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const n = Number(r.stdout.match(/swap: (\d+) pairs checked \(a spread of N = 1000\)/)[1]);
  assert.ok(n > 0 && n < 20, `${n} swaps`);
});

test('no law still asks to walk every instance: one per template, the rest by a read', () => {
  const read = (rel) => readFileSync(join(KIT, 'packs', rel), 'utf8');
  for (const rel of ['audio-core/rules/house-control-behaviours.md', 'audio-core/skills/prove-control/SKILL.md', 'gpu-painter/skills/hover-state/SKILL.md', 'ui-craft/skills/hover-state/SKILL.md']) {
    assert.match(read(rel), /one (?:control|item|element) of (?:this|each) (?:template|component)/, rel);
    assert.doesNotMatch(read(rel), /walk every control|for every interactive element|on every slot it appears/, rel);
  }
});

test('scan names elements built by hand more than once, html and c++', () => {
  const dir = fresh('uid-scan-');
  const card = (t) => `<div class="card"><h3 class="t">${t}</h3><p>${t}</p><a href="/">more</a></div>\n`;
  const knob = (n) => `  ${n}.setRange (0.0, 1.0);\n  ${n}.setValue (0.5);\n  ${n}.setStyle (Rotary);\n`;
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'src/a.html'), card('A'));
  writeFileSync(join(dir, 'src/b.html'), card('B'));
  writeFileSync(join(dir, 'src/c.cpp'), `void f() {\n${knob('cutoff')}\n  int gap;\n${knob('drive')}}\n`);
  const r = cli(dir, 'scan');
  const text = readFileSync(r.stdout.match(/Report: (\S+)/)[1], 'utf8');
  assert.match(text, /2 repeat\(s\) written by hand/);
  assert.match(text, /2x <div>: src\/a\.html:1, src\/b\.html:1\. Make it one component/);
  assert.match(text, /2x cutoff: src\/c\.cpp:2, src\/c\.cpp:7\. Make it one factory/);
});
