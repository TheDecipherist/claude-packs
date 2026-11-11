// user-asks (opt-in): what the user asked is kept and said again after a compaction. The hook's contract, then the refusals that sat in
// the old root test files.
import { join } from 'node:path';
import { put } from '../../kit-cli.mts';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';
import { enabledFixture, holdsTheContract } from '../hook-rig.mts';

const withHook = (): string => enabledFixture('user-asks', 'synth-creator', 'hooks/user-asks.mjs');

holdsTheContract({
  hook: 'user-asks.mjs',
  dir: withHook,
  same: (project) => {
    const transcript = join(project, 'transcript.jsonl');
    put(transcript, `${toJson({ type: 'user', message: { content: 'make the bank louder' } })}\n`);
    return {
      payload: { hook_event_name: 'SessionStart', source: 'compact', transcript_path: transcript },
      status: 0,
      env: { TIMS_ASKS_LEDGER: join(project, 'ledger.json') },
    };
  },
});
