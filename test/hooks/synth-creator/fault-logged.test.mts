// fault-logged (opt-in): a reply that admits a fault with no bug-log entry in the turn is sent back once. The hook's contract.
import { join } from 'node:path';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';
import { put } from '../../kit-cli.mts';
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
