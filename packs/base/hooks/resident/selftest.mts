// resident/selftest: `node .claude/hooks/resident.mjs --selftest`, run by doctor like a hook's. It starts real daemons in scratch
// projects, plants each fault and checks the daemon survives it and answers right (the cases are in selftest-events and
// selftest-lifecycle). The 10,000-event memory case is test/integration/resident-load.test.mts: too long for a selftest.
import { verdicts } from '../lib/selftest.mts';
import type { VerdictRow } from '../lib/types.d.mts';
import { eventCases } from './selftest-events.mts';
import { lifecycleCases } from './selftest-lifecycle.mts';

export async function selftest(): Promise<number> {
  const cases: VerdictRow[] = [];
  await eventCases(cases);
  await lifecycleCases(cases);
  return verdicts('resident', cases);
}
