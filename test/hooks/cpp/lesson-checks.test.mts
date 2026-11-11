// The cpp pack's checks (0.28.0), fired through the base lesson-checks hook in a synth-creator install with the pack.
import { cppPackInstall, holdsEachCaseIn } from '../lesson-cases.mts';

holdsEachCaseIn(cppPackInstall, [
  ['cpp', 'src/a.h', 'inline constexpr Preset kFactory[] = {};\n', 'inline constexpr Preset kFactory[] = { Preset {} };\n'],
  ['cpp', 'src/b.cpp', 'const double w = 2.0 * M_PI * f;\n', 'const double w = 2.0 * std::numbers::pi * f;\n'],
]);
