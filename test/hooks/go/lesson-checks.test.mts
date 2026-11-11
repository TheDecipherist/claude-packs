// The go pack's checks (0.25.0), fired through the base lesson-checks hook.
import { holdsEachCaseIn, reviewPacksInstall } from '../lesson-cases.mts';

holdsEachCaseIn(reviewPacksInstall, [
  ['go', 'src/a.go', 'package a\n_ = json.Unmarshal(raw, &rows)\n', 'package a\nif err := json.Unmarshal(raw, &rows); err != nil { return err }\n'],
]);
