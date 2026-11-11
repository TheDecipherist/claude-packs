// verdict.mts: the three things a hook says (pass, refuse, say) and what is a Verdict at all; judgeVerdict (writes.mts), the
// judge frame on the contract, gives the same refusal judgeEvent writes.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { judgeEvent, judgeVerdict } from '../../../packs/base/hooks/lib/writes.mts';
import { isVerdict, pass, refuse, say } from '../../../packs/base/hooks/lib/verdict.mts';
import type { HookContext } from '../../../packs/base/hooks/lib/types.d.mts';

test('pass is code 0 and says nothing', () => {
  assert.deepEqual({ ...pass }, { code: 0, stdout: '', stderr: '' });
});

test('refuse is code 2 with the reason and one newline on stderr', () => {
  assert.deepEqual(refuse('no'), { code: 2, stdout: '', stderr: 'no\n' });
  assert.equal(refuse('no\n').stderr, 'no\n', 'a reason that ends in a newline is not given a second');
});

test('say gives plain text as it is and a value as JSON, with code 0', () => {
  assert.deepEqual(say('context'), { code: 0, stdout: 'context', stderr: '' });
  assert.equal(say({ systemMessage: 'a' }).stdout, '{"systemMessage":"a"}');
});

test('isVerdict: a planted wrong value (no stderr, a string code, nothing) is not one', () => {
  assert.ok(isVerdict(pass) && isVerdict(refuse('x')) && isVerdict(say('y')));
  assert.equal(isVerdict({ code: 0, stdout: '' }), false);
  assert.equal(isVerdict({ code: '2', stdout: '', stderr: '' }), false);
  assert.equal(isVerdict(undefined), false);
  assert.equal(isVerdict(2), false);
});

test('judgeVerdict refuses what judgeEvent refuses, with the same words, and passes what it passes', () => {
  const spec = { name: 'planted', command: (c: string): string | null => (c.includes('bad') ? 'the word bad' : null) };
  const ctx = { projectDir: '/p', cwd: '/p', env: {} } as HookContext;
  const event = { tool_name: 'Bash', tool_input: { command: 'echo bad' } };
  const said: string[] = [];
  const code = judgeEvent(JSON.stringify(event), spec, { cwd: () => '/p', env: {}, stderr: { write: (t) => said.push(t) } });
  const v = judgeVerdict(event, spec, ctx);
  assert.equal(code, 2);
  assert.deepEqual([v.code, v.stderr], [2, said.join('')]);
  assert.equal(v.stderr, 'BLOCKED by planted: the word bad\n');
  assert.deepEqual({ ...judgeVerdict({ tool_name: 'Bash', tool_input: { command: 'echo ok' } }, spec, ctx) }, { ...pass });
});
