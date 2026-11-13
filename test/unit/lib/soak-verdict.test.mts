// soak-verdict (KWB-216): a "not judged by X (over time)" answer from the daemon is a difference, never compared away.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isPartial, sameVerdict, type Answer } from '../../../scripts/soak-verdict.mts';

const answer = (code: number, out: string, err = ''): Answer => ({ code, out, err, ms: 1 });
const PARTIAL = '{"systemMessage":"not judged by stage-guard, secrets-guard (over time)"}';

test('a partial verdict from the daemon is a difference even when the exit code and the refusal text agree', () => {
  const ts = answer(2, '', 'git-guard refuses\n');
  const daemon = answer(2, PARTIAL, 'git-guard refuses\n');
  assert.equal(isPartial(daemon), true);
  assert.equal(sameVerdict(daemon, ts), false);
});

test('a partial verdict that let a call through is a difference', () => {
  assert.equal(sameVerdict(answer(0, PARTIAL), answer(2, '', 'secrets-guard: token\n')), false);
});

test('equal whole verdicts agree; an empty {} and the governor\'s figures do not count', () => {
  assert.equal(sameVerdict(answer(0, '{}'), answer(0, '')), true);
  assert.equal(sameVerdict(answer(2, '', 'governor-route load 3.1'), answer(2, '', 'governor-route load 4.7')), true);
});
