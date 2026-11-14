// fault-logged (opt-in): a reply that admits a fault with no bug-log entry in the turn is sent back once. The hook's contract.
import { join } from 'node:path';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';
import { assert, hookRun, put, test } from '../../kit-cli.mts';
import { enabledFixture, holdsTheContract, installedWorktreeCase } from '../hook-rig.mts';
import type { Checkouts } from '../hook-rig.mts';

const withHook = (): string => enabledFixture('fault-logged', 'synth-creator', 'hooks/fault-logged.mjs');

holdsTheContract({
  hook: 'fault-logged.mjs',
  dir: withHook,
  same: (project) => {
    const transcript = join(project, 'transcript.jsonl');
    put(transcript, `${toJson({ type: 'user', message: { content: 'go' } })}\n`);
    return { payload: { hook_event_name: 'Stop', transcript_path: transcript, last_assistant_message: 'I found a bug: the gate counts the last slot twice.' }, status: 2 };
  },
  worktree: (checkouts: Checkouts) => installedWorktreeCase(checkouts, 'fault-logged.mjs'),
});

// Review fx-1 finding 19: only the project's own log counts; the same file name in another folder is no log entry.
test('fault-logged: a write to docs/old/bugs.md is not the project log (bugs.md at the root)', () => {
  const project = withHook();
  const FAULT = 'I found a bug: the gate counts the last slot twice.';
  const turn = (file: string): string => [
    { type: 'user', message: { content: 'go' } },
    { type: 'assistant', cwd: '', message: { content: [{ type: 'tool_use', id: 'w', name: 'Write', input: { file_path: file, content: 'x\n' } }] } },
    { type: 'assistant', message: { content: [{ type: 'text', text: FAULT }] } },
  ].map((e) => toJson(e)).join('\n');
  const status = (file: string): number | null => {
    const transcript = join(project, `t-${file.replace(/\W/g, '')}.jsonl`);
    put(transcript, `${turn(join(project, file))}\n`);
    return hookRun(project, 'fault-logged.mjs', { hook_event_name: 'Stop', transcript_path: transcript, cwd: project, last_assistant_message: FAULT }).status;
  };
  assert.equal(status('docs/old/bugs.md'), 2);
  assert.equal(status('bugs.md'), 0);
});
