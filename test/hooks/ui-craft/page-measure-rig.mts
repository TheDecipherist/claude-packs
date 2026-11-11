// What the page-measure files share: the Chrome there is (none: the tests skip), and a page measured in it.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { measure } from '../../../packs/ui-craft/tools/page-measure.mts';
import type { PageFacts } from '../../../packs/ui-craft/tools/page-measure.mts';
import { spawnSync } from '../../kit-cli.mts';

export const CHROME = ['/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => existsSync(p));

export function inChrome(html: string, width = 1440): PageFacts {
  if (!CHROME) throw new Error('no Chrome here');
  const file = join(scratchDir('pm-'), 'page.html');
  put(file, `<!doctype html><html><body>${html}<pre id="out" style="display:none"></pre><script>document.getElementById('out').textContent = JSON.stringify((${measure.toString()})());</script></body></html>`);
  const r = spawnSync(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', `--window-size=${width},900`, '--virtual-time-budget=3000', '--dump-dom', `file://${file}`], { encoding: 'utf8', timeout: 60_000 });
  const found = /<pre id="out"[^>]*>(.*?)<\/pre>/s.exec(r.stdout)?.[1];
  assert.ok(found, 'Chrome printed the measure');
  return JSON.parse(found.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) as PageFacts;
}
