// The host-agent pack's checks (0.25.0), fired through the base lesson-checks hook.
import { holdsEachCaseIn, reviewPacksInstall } from '../lesson-cases.mts';

holdsEachCaseIn(reviewPacksInstall, [
  ['host-agent', 'src/update.ts', 'if (expectedSha256 && actual !== expectedSha256) return fail();\n', 'if (!expectedSha256 || actual !== expectedSha256) return fail();\n'],
]);
