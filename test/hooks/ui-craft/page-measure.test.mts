// The ui-craft pack's page-measure tool in real Chrome (0.22.0): a sound page passes, and each planted fault is named. Skipped where
// there is no Chrome.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { judge, measure } from '../../../packs/ui-craft/tools/page-measure.mts';
import type { PageFacts } from '../../../packs/ui-craft/tools/page-measure.mts';
import { spawnSync } from '../../kit-cli.mts';

const CHROME = ['/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => existsSync(p));

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
