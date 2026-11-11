// The cpp pack's checks (0.28.0), fired through the base lesson-checks hook in a synth-creator install with the pack.
import { fixture } from '../../fixtures/installs.mts';
import { assert, lessonWrite, test } from '../../kit-cli.mts';
import { cppPackInstall, holdsEachCaseIn } from '../lesson-cases.mts';

holdsEachCaseIn(cppPackInstall, [
  ['cpp', 'src/a.h', 'inline constexpr Preset kFactory[] = {};\n', 'inline constexpr Preset kFactory[] = { Preset {} };\n'],
  ['cpp', 'src/b.cpp', 'const double w = 2.0 * M_PI * f;\n', 'const double w = 2.0 * std::numbers::pi * f;\n'],
]);

test('KF-26: a filter is no search: it needs a return or break on the match', () => {
  const dir = fixture('cpp');
  const body = (loop: string): string => `void f()\n{\n    ${loop}\n}\n`;
  assert.equal(lessonWrite(dir, 'src/a.cpp', body('for (const auto& target : targets) if (target.kind == none) continue;')).status, 0);
  assert.equal(lessonWrite(dir, 'src/a.cpp', body('for (const auto& c : controls) if (c.id == id) return &c;')).status, 2);
  assert.equal(lessonWrite(dir, 'src/a.cpp', body('for (const auto& c : controls) { if (c.id == id) { found = &c; break; } }')).status, 2);
});
