// The reverse-engineering pack's checks (0.28.0), fired through the base lesson-checks hook.
import { audioPacksInstall, holdsEachCaseIn } from '../lesson-cases.mts';

holdsEachCaseIn(audioPacksInstall, [
  ['reverse-engineering', 'src/law.cpp', 'kDrive = 1.7f; // sounds right\n', 'kDrive = 1.7f; // [EAR] ledger row 12\n'],
  ['reverse-engineering', 'src/rom.cpp', `const uint8_t curve[] = {${Array.from({ length: 40 }, (_, i) => i).join(', ')}};\n`, 'const int steps[] = {1, 2, 4, 8};\n'],
]);
