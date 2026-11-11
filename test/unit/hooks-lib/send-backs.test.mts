// send-backs.mts: three send-backs with the same findings end the turn; the count is kept per session in the temp folder (KWB-7).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { MAX_SENDS, countAfter, endsTheTurn, recordSendBack, sendBackFile } from '../../../packs/base/hooks/lib/send-backs.mts';
import { scratchDir } from '../../../packs/base/hooks/lib/files.mts';

test('the file is named by the session, under the caller\'s TMPDIR, and a planted odd session id is cleaned', () => {
  assert.equal(sendBackFile({ TMPDIR: '/t' }, 'abc-1'), join('/t', 'making-check-abc-1.json'));
  assert.equal(sendBackFile({ TMPDIR: '/t' }, '../x/y'), join('/t', 'making-check-xy.json'));
  assert.equal(sendBackFile({ TMPDIR: '/t' }, undefined), join('/t', 'making-check-session.json'));
});

test('the count rises on the same findings, restarts on different ones, and is 0 with none', () => {
  assert.equal(countAfter(null, ['a']), 1);
  assert.equal(countAfter(null, []), 0);
  const dir = scratchDir('sendback-');
  const file = join(dir, 's.json');
  recordSendBack(file, ['a']);
  recordSendBack(file, ['a']);
  assert.equal(endsTheTurn(file, ['a']), false, 'the third send-back is still sent');
  recordSendBack(file, ['a']);
  assert.equal(endsTheTurn(file, ['a']), true, `past ${MAX_SENDS}`);
  assert.equal(endsTheTurn(file, ['b']), false, 'other findings start again');
});

test('a planted broken counter file is a first send-back, never a throw', () => {
  const dir = scratchDir('sendback-');
  assert.equal(endsTheTurn(join(dir, 'missing.json'), ['a']), false);
  assert.equal(countAfter({ hash: 'x', count: 'many' }, ['a']), 1);
});
