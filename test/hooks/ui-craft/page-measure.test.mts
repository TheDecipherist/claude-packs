// The ui-craft pack's page-measure tool in real Chrome (0.22.0): a sound page passes, and each planted fault is named. Skipped where
// there is no Chrome. The faults are shared out over this file, page-measure-type.test.mts and page-measure-spacing.test.mts, so no file
// sums over a minute (each page is one Chrome start).
import assert from 'node:assert/strict';
import test from 'node:test';
import { judge } from '../../../packs/ui-craft/tools/page-measure.mts';
import { CHROME, inChrome } from './page-measure-rig.mts';

test('page-measure in real Chrome: a sound page passes, and the heading and width faults are named', { skip: !CHROME && 'no Chrome here' }, () => {   // was one test over every fault: "page-measure in real Chrome: a sound page passes, and each planted fault is named"
  const good = '<main style="margin:0 40px"><h1>One title</h1><h2>A section</h2><p>Words at a readable size.</p></main>';
  assert.deepEqual(judge(inChrome(good)), []);
  const fails = (html: string): string => judge(inChrome(html)).join('\n');
  assert.match(fails('<main><h2>No h1</h2></main>'), /0 h1/);
  assert.match(fails('<main><h1>a</h1><div style="width:3000px">wide</div></main>'), /scrolls sideways/);
  assert.match(fails('<main><h1>a</h1><h3>skip</h3></main>'), /heading level is skipped/);
});
