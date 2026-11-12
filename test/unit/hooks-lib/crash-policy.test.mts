// crash-policy.mts: a crash refuses a tool call once, then lets the same call through, logged (KF-18).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { crashVerdict } from '../../../packs/base/hooks/lib/crash-policy.mts';
import { ensureDir, scratchDir } from '../../../packs/base/hooks/lib/files.mts';

const NOW = 1_700_000_000_000;
const crash = [{ hook: 'once-only', code: 1, reason: 'run-hooks: once-only failed: boom\nstack' }];
const call = { hook_event_name: 'PreToolUse', tool_name: 'Write', tool_input: { file_path: '/a' } };

test('nothing crashed, or only 0 and 2: no verdict', () => {
  const root = scratchDir('crash-');
  assert.deepEqual(crashVerdict(root, call, [{ hook: 'a', code: 0 }, { hook: 'b', code: 2 }], NOW), {});
});

test('a crash on a tool call refuses once; the same call again goes through, said', () => {
  const root = ensureDir(scratchDir('crash-'));
  ensureDir(join(root, '.claude'));
  const first = crashVerdict(root, call, crash, NOW);
  assert.equal(first.code, 2);
  assert.match(first.stderr ?? '', /once-only crashed.*boom/);
  assert.match(first.stderr ?? '', /The call has not run/);
  const again = crashVerdict(root, call, crash, NOW + 1000);
  assert.equal(again.code, undefined);
  assert.match(again.stdout ?? '', /went through unjudged/);
  assert.equal(crashVerdict(root, { ...call, hook_event_name: 'PostToolUse' }, crash, NOW).code, 2);
});

test('no .claude folder to remember in: never a refusal; an event with no tool: only a notice', () => {
  const root = scratchDir('crash-');
  assert.equal(crashVerdict(root, call, crash, NOW).code, undefined);
  assert.match(crashVerdict(root, call, crash, NOW).stdout ?? '', /systemMessage/);
  assert.match(crashVerdict(root, { hook_event_name: 'Stop' }, crash, NOW).stdout ?? '', /logs clear once-only/);
});

test('a hold older than an hour is no hold: the call is refused again (KWB-174)', () => {
  const root = ensureDir(scratchDir('crash-'));
  ensureDir(join(root, '.claude'));
  assert.equal(crashVerdict(root, call, crash, NOW).code, 2);
  assert.equal(crashVerdict(root, call, crash, NOW + 59 * 60 * 1000).code, undefined);
  assert.equal(crashVerdict(root, call, crash, NOW + 2 * 60 * 60 * 1000).code, 2);
});
