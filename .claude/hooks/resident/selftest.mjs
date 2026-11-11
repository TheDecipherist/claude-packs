// resident/selftest: `node .claude/hooks/resident.mjs --selftest`, run by doctor like a hook's. It starts real daemons in scratch
// projects, plants each fault and checks the daemon survives it and answers right (the cases are in selftest-events and
// selftest-lifecycle). The 10,000-event memory case is test/integration/resident-load.test.mts: too long for a selftest.
import { verdicts } from '../lib/selftest.mjs';
import { eventCases } from './selftest-events.mjs';
import { lifecycleCases } from './selftest-lifecycle.mjs';
export async function selftest() {
    const cases = [];
    await eventCases(cases);
    await lifecycleCases(cases);
    return verdicts('resident', cases);
}
