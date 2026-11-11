// untrusted: none
// untrusted-boundary: a model call is fed outside text only inside wrapUntrusted. The hook's contract, then its refusals.
import { join } from 'node:path';
import { write } from '../../fixtures/installs.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

const CALL_LINE = 'const r = await client.messages.create({ messages: [{ role: "user", content: page }] });\n';

holdsTheContract({
  hook: 'untrusted-boundary.mjs',
  dir: () => fixture('base'),
  same: (project) => ({ payload: write(join(project, 'tools/ask.mjs'), CALL_LINE), status: 2 }),
});
