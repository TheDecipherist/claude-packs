// page-measure (ui-craft's tool): `judge(facts)` lists what a measured page fails. `measure()` runs in a browser, which a
// test of the kit never opens (test-quietly), so the facts here are the ones a page would report. First test for it (W5).
import { assert, test } from '../../kit-cli.mts';
import { judge } from '../../../packs/ui-craft/tools/page-measure.mts';
import type { PageFacts } from '../../../packs/ui-craft/tools/page-measure.mts';

const GOOD: PageFacts = { width: 1280, h1s: 1, skippedHeading: false, overflowX: false, overflowing: [], longHeadlines: [], tinyText: [], brokenImages: [], hiddenAtRest: 0, margins: [40, 40] };

test('a page with one h1, no overflow, readable text and equal margins fails nothing', () => {
  assert.deepEqual(judge(GOOD), []);
});

test('each fault is said, with the thing to look for', () => {
  const said = (change: Partial<PageFacts>): string => judge({ ...GOOD, ...change }).join(' | ');
  assert.match(said({ h1s: 0 }), /0 h1 on the page/);
  assert.match(said({ h1s: 2 }), /2 h1 on the page/);
  assert.match(said({ skippedHeading: true }), /heading level is skipped/);
  assert.match(said({ overflowX: true, width: 390, overflowing: ['table', 'img'] }), /scrolls sideways at 390px \(table, img\)/);
  assert.match(said({ longHeadlines: ['A headline that runs over three lines'] }), /headline over two lines: A headline/);
  assert.match(said({ tinyText: ['fine print'] }), /text under 12px: fine print/);
  assert.match(said({ brokenImages: ['/a.png'] }), /broken image: \/a\.png/);
  assert.match(said({ hiddenAtRest: 3 }), /3 text element\(s\) hidden at rest/);
  assert.match(said({ margins: [10, 60] }), /unequal page margins: 10 and 60px/);
});

test('margins within 2px of each other are equal, and every fault found is listed, not only the first', () => {
  assert.deepEqual(judge({ ...GOOD, margins: [40, 42] }), []);
  assert.equal(judge({ ...GOOD, h1s: 0, brokenImages: ['/b.png'], tinyText: ['x'] }).length, 3);
});
