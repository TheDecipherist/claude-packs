// 0.24.0: "we need to thoroughly do c++", "anything you find that is repeated should have something that makes it reuseable and
// template like", "maybe make a specific c++ pack". The fixtures are the shapes measured on Stellix: many statements on a line, helpers copied
// from gate to gate with other names, descriptors filled field by field, tables written as calls, and a gate that presses every control.
import { assert, cli, existsSync, fresh, hookRun, join, lessonWrite, mkdirSync, readFileSync, test, writeFileSync } from './kit-cli.mts';

const reader = (f, id) => `auto ${f} = [this](const std::string& ${id}) {\n  const auto& L = shown(); float best = 0.0f;\n  for (size_t i = 0; i < L.controls.size(); i++) best += L.controls[i].box.getCentreX() * float(getWidth());\n  if (best > 10.0f) log(best, "${id}");\n  const auto p = at(best, 2.5f); pressAt(p); releaseAt(p); return best;\n};\n`;
const descriptor = (n, label) => `  wgpu::BufferDescriptor ${n}; ${n}.label = "${label}"; ${n}.size = 64; ${n}.usage = kUsage;\n`;

function cppProject(...packs) {
  const dir = fresh('cpp-');
  const r = cli(dir, 'init', ...packs);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return dir;
}

function withTemplateLaw(dir) {
  const file = join(dir, '.claude/layout.json');
  const layout = JSON.parse(readFileSync(file, 'utf8'));
  writeFileSync(file, JSON.stringify({ ...layout, enable: [...(layout.enable ?? []), 'hooks/template-law.mjs'] }, null, 2));
  assert.equal(cli(dir, 'update').status, 0);
}

const writeEvent = (dir, rel, content) => ({ tool_name: 'Write', tool_input: { file_path: join(dir, rel), content } });

test('the cpp pack installs its rules, skill and check; the configuration is the smallest that takes it', () => {
  const dir = cppProject('cpp');
  for (const f of ['rules/cpp-repeats-become-templates.md', 'rules/cpp-gates-share-one-reader.md', 'skills/cpp-extract-template/SKILL.md', 'skills/make-it-a-template/SKILL.md', 'checks/cpp-find-with-the-library.json', 'checks/one-walk-per-template.json']) {
    assert.ok(existsSync(join(dir, '.claude', f)), f);
  }
  assert.equal(JSON.parse(readFileSync(join(dir, '.claude/layout.json'), 'utf8')).configuration, 'cpp');
  assert.equal(cli(dir, 'doctor', '--strict').status, 0);
});

test('the synth preset takes the cpp pack too', () => {
  const dir = fresh('cpp-synth-');
  cli(dir, 'init', 'synth');   // a synth's doctor also asks for design/shape.json, which is not this test's
  assert.ok(existsSync(join(dir, '.claude/rules/cpp-repeats-become-templates.md')));
});

test('a hand-written search is refused; the library call passes', () => {
  const dir = cppProject('cpp');
  mkdirSync(join(dir, 'src/app'), { recursive: true });
  assert.equal(lessonWrite(dir, 'src/app/find.cpp', 'for (const auto& c : shown().controls) if (c.id == id) return &c;\n').status, 2);
  assert.equal(lessonWrite(dir, 'src/app/find.cpp', 'const auto it = std::ranges::find (controls, id, &Control::id);\n').status, 0);
});

test('a gate that presses every control is refused; a walk of one, and a read of them all, pass', () => {
  const dir = cppProject('cpp');
  mkdirSync(join(dir, 'tests/gates'), { recursive: true });
  const refused = lessonWrite(dir, 'tests/gates/press.h', 'for (const auto& c : L.controls) if (c.visible) pressIds.push_back(c.id);\n');
  assert.equal(refused.status, 2);
  assert.match(refused.stderr, /one-walk-per-template/);
  assert.equal(lessonWrite(dir, 'tests/gates/one.h', 'pressAt (first.box.getCentre());\nfor (const auto& d : kDefs) check (d.bind != nullptr);\n').status, 0);
});

test('template-law refuses a copied helper and names what differs: the parameters of the template', () => {
  const dir = cppProject('cpp');
  withTemplateLaw(dir);
  mkdirSync(join(dir, 'src/app'), { recursive: true });
  writeFileSync(join(dir, 'src/app/gate_a.h'), reader('pressOf', 'id'));
  const r = hookRun(dir, 'template-law.mjs', writeEvent(dir, 'src/app/gate_b.h', reader('tapOf', 'key')));
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /src\/app\/gate_a\.h:1/);
  assert.match(r.stderr, /differs only in: tapOf \/ pressOf, key \/ id/);
  assert.match(r.stderr, /Take the copies out first/);
  assert.match(r.stderr, /make-it-a-template/);
});

test('template-law: an exact copy says to move it; a marked one-off passes; a data table passes', () => {
  const dir = cppProject('cpp');
  withTemplateLaw(dir);
  mkdirSync(join(dir, 'src/app'), { recursive: true });
  writeFileSync(join(dir, 'src/app/gate_a.h'), reader('pressOf', 'id'));
  const same = hookRun(dir, 'template-law.mjs', writeEvent(dir, 'src/app/gate_b.h', reader('pressOf', 'id')));
  assert.equal(same.status, 2);
  assert.match(same.stderr, /It is the same, every name/);
  assert.equal(hookRun(dir, 'template-law.mjs', writeEvent(dir, 'src/app/gate_c.h', `// one-off: the window's own reader, it runs before the harness\n${reader('tapOf', 'key')}`)).status, 0);
  const rows = (n) => `constexpr Row ${n}[] = {\n${Array.from({ length: 12 }, (_, i) => `  { "row.${i}", ${i}, 0.5f, true },\n`).join('')}};\n`;
  writeFileSync(join(dir, 'src/app/rows_a.h'), rows('kA'));
  assert.equal(hookRun(dir, 'template-law.mjs', writeEvent(dir, 'src/app/rows_b.h', rows('kB'))).status, 0);
});

test('scan on C++: the cpp configuration, and every repeat with what it becomes and what differs', () => {
  const dir = fresh('cpp-scan-');
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'src/a.h'), reader('pressOf', 'id'));
  writeFileSync(join(dir, 'src/b.h'), reader('tapOf', 'key'));
  writeFileSync(join(dir, 'src/c.cpp'), `void f() {\n${descriptor('one', 'a')}\n${descriptor('two', 'b')}}\n`);
  writeFileSync(join(dir, 'src/d.cpp'), `void seed(Entry& e) {\n${[...'abcdef'].map((k) => `  set(e, "${k}", 0.0f);\n`).join('')}}\n`);
  const r = cli(dir, 'scan');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const text = readFileSync(r.stdout.match(/Report: (\S+)/)[1], 'utf8');
  assert.match(text, /cpp/);
  assert.match(text, /2x this code: src\/a\.h:\d+, src\/b\.h:\d+\. Make it one function, with the differences as parameters \(differs in: /);
  assert.match(text, /2x one: src\/c\.cpp:\d+, src\/c\.cpp:\d+\. Make it one factory/);
  assert.match(text, /1x set \(\.\.\.\): src\/d\.cpp:\d+\. Make it one table/);
});
