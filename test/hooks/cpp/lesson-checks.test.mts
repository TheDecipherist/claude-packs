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

// 0.24.0: the fixtures are the shapes measured on Stellix: a gate that presses every control, a search written by hand.
test('a hand-written search is refused; the library call passes', () => {
  const dir = fixture('cpp');
  assert.equal(lessonWrite(dir, 'src/app/find.cpp', 'for (const auto& c : shown().controls) if (c.id == id) return &c;\n').status, 2);
  assert.equal(lessonWrite(dir, 'src/app/find.cpp', 'const auto it = std::ranges::find (controls, id, &Control::id);\n').status, 0);
});

test('a gate that presses every control is refused; a walk of one, and a read of them all, pass', () => {
  const dir = fixture('cpp');
  const refused = lessonWrite(dir, 'tests/gates/press.h', 'for (const auto& c : L.controls) if (c.visible) pressIds.push_back(c.id);\n');
  assert.equal(refused.status, 2);
  assert.match(refused.stderr, /one-walk-per-template/);
  assert.equal(lessonWrite(dir, 'tests/gates/one.h', 'pressAt (first.box.getCentre());\nfor (const auto& d : kDefs) check (d.bind != nullptr);\n').status, 0);
});
