// merge-out.mts: a halt (`continue: false`, the stay-inside stop) survives the merge of several hooks' outputs, and the event that
// carries one answers 0 so Claude Code reads it, whatever another hook refused (KWB-next, 2026-11-14).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { halts, mergeOut } from '../../../packs/base/hooks/lib/merge-out.mts';
import { parseJson, toJson } from '../../../packs/base/hooks/lib/json.mts';
import { halt } from '../../../packs/base/hooks/lib/verdict.mts';

const stop = halt('STOPPED by stay-inside: a write to /tmp').stdout;

test('a halt is found among the outputs, and a plain or empty output is none', () => {
  assert.equal(halts(['', stop, 'some context\n']), true);
  assert.equal(halts(['', toJson({ systemMessage: 'x' }), 'text\n']), false);
});

test('a later hook\'s continue: true never undoes an earlier halt, in either order', () => {
  for (const outs of [[stop, toJson({ continue: true, systemMessage: 'later' })], [toJson({ continue: true }), stop]]) {
    const merged = parseJson<Record<string, unknown>>(mergeOut(outs));
    assert.equal(merged?.['continue'], false);
    assert.match(String(merged?.['stopReason']), /stay-inside/);
  }
});

test('the halt denies the tool call too, so it never runs', () => {
  const v = parseJson<{ hookSpecificOutput?: { permissionDecision?: string } }>(stop);
  assert.equal(v?.hookSpecificOutput?.permissionDecision, 'deny');
});
