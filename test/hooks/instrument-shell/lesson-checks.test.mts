// The instrument-shell pack's checks (0.28.0), fired through the base lesson-checks hook.
import { audioPacksInstall, holdsEachCaseIn } from '../lesson-cases.mts';

holdsEachCaseIn(audioPacksInstall, [
  ['instrument-shell', 'src/state.cpp', 'sm.append (&s, sizeof (State));\n', 'writeBlob (sm, s);\n'],
]);
