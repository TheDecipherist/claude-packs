// page-measure in real Chrome: the type faults are named (see page-measure.test.mts). Skipped where there is no Chrome.
import assert from 'node:assert/strict';
import test from 'node:test';
import { judge } from '../../../packs/ui-craft/tools/page-measure.mts';
import { CHROME, inChrome } from './page-measure-rig.mts';

test('page-measure in real Chrome: tiny type and text hidden at rest are named', { skip: !CHROME && 'no Chrome here' }, () => {
  const fails = (html: string): string => judge(inChrome(html)).join('\n');
  assert.match(fails('<main><h1>a</h1><p style="font-size:9px">tiny</p></main>'), /under 12px/);
  assert.match(fails('<main><h1>a</h1><p style="opacity:0">gone</p></main>'), /hidden at rest/);
});
