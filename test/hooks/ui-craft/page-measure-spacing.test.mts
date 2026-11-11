// page-measure in real Chrome: the spacing and line faults are named (see page-measure.test.mts). Skipped where there is no Chrome.
import assert from 'node:assert/strict';
import test from 'node:test';
import { judge } from '../../../packs/ui-craft/tools/page-measure.mts';
import { CHROME, inChrome } from './page-measure-rig.mts';

test('page-measure in real Chrome: unequal page margins and a heading over two lines are named', { skip: !CHROME && 'no Chrome here' }, () => {
  const fails = (html: string): string => judge(inChrome(html)).join('\n');
  assert.match(fails('<main style="margin-left:300px"><h1>a</h1></main>'), /unequal page margins/);
  assert.match(fails(`<main style="width:300px"><h1 style="font-size:60px">${'word '.repeat(30)}</h1></main>`), /over two lines/);
});
