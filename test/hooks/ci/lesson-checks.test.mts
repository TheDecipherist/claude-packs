// The ci pack's checks (0.25.0), fired through the base lesson-checks hook.
import { holdsEachCaseIn, reviewPacksInstall } from '../lesson-cases.mts';

holdsEachCaseIn(reviewPacksInstall, [
  ['ci', '.github/workflows/test.yml', 'on: push\njobs:\n  t:\n    runs-on: x\n', 'on: push\npermissions:\n  contents: read\njobs:\n  t:\n    runs-on: x\n'],
]);
