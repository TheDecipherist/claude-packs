// once-only-index: the PostToolUse that records a written file in the repo index. The hook's contract, then its refusals.
import { join } from 'node:path';
import { write } from '../../fixtures/installs.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'once-only-index.mjs',
  dir: () => fixture('base'),
  same: (project) => ({ payload: { ...write(join(project, 'src/core/Rec.cpp')), hook_event_name: 'PostToolUse', tool_response: { success: true } }, status: 0 }),
});
