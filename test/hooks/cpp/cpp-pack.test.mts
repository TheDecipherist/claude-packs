// The cpp pack's install and what the kit finds in a C++ project: no hook of its own (its hooks' refusals are in test/hooks/cpp/lesson-checks
// and test/hooks/base/template-law). 0.24.0: "maybe make a specific c++ pack".
import { join } from 'node:path';
import { put } from '../../../packs/base/hooks/lib/files.mts';
import { fixture } from '../../fixtures/installs.mts';
import { assert, cli, existsSync, fresh, readFileSync, test } from '../../kit-cli.mts';

const reader = (f: string, id: string): string => `auto ${f} = [this](const std::string& ${id}) {\n  const auto& L = shown(); float best = 0.0f;\n  for (size_t i = 0; i < L.controls.size(); i++) best += L.controls[i].box.getCentreX() * float(getWidth());\n  if (best > 10.0f) log(best, "${id}");\n  const auto p = at(best, 2.5f); pressAt(p); releaseAt(p); return best;\n};\n`;
const descriptor = (n: string, label: string): string => `  wgpu::BufferDescriptor ${n}; ${n}.label = "${label}"; ${n}.size = 64; ${n}.usage = kUsage;\n`;

test('the cpp pack installs its rules, skill and check; the configuration is the smallest that takes it', () => {
  const dir = fixture('cpp');
  for (const f of ['rules/cpp-repeats-become-templates.md', 'rules/cpp-gates-share-one-reader.md', 'skills/cpp-extract-template/SKILL.md', 'skills/make-it-a-template/SKILL.md', 'checks/cpp-find-with-the-library.json', 'checks/one-walk-per-template.json']) {
    assert.ok(existsSync(join(dir, '.claude', f)), f);
  }
  assert.equal((JSON.parse(readFileSync(join(dir, '.claude/layout.json'), 'utf8')) as { configuration: string }).configuration, 'cpp');
  assert.equal(cli(dir, 'doctor', '--strict').status, 0);
});

test('the synth preset takes the cpp pack too', () => {
  const dir = fresh('cpp-synth-');   // the preset is the subject, so it is installed here
  cli(dir, 'init', 'synth');   // a synth's doctor also asks for design/shape.json, which is not this test's
  assert.ok(existsSync(join(dir, '.claude/rules/cpp-repeats-become-templates.md')));
});

test('scan on C++: the cpp configuration, and every repeat with what it becomes and what differs', () => {
  const dir = fresh('cpp-scan-');
  put(join(dir, 'src/a.h'), reader('pressOf', 'id'));
  put(join(dir, 'src/b.h'), reader('tapOf', 'key'));
  put(join(dir, 'src/c.cpp'), `void f() {\n${descriptor('one', 'a')}\n${descriptor('two', 'b')}}\n`);
  put(join(dir, 'src/d.cpp'), `void seed(Entry& e) {\n${[...'abcdef'].map((k) => `  set(e, "${k}", 0.0f);\n`).join('')}}\n`);
  const r = cli(dir, 'scan');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const text = readFileSync(r.stdout.match(/Report: (\S+)/)?.[1] ?? '', 'utf8');
  assert.match(text, /cpp/);
  assert.match(text, /2x this code: src\/a\.h:\d+, src\/b\.h:\d+\. Make it one function, with the differences as parameters \(differs in: /);
  assert.match(text, /2x one: src\/c\.cpp:\d+, src\/c\.cpp:\d+\. Make it one factory/);
  assert.match(text, /1x set \(\.\.\.\): src\/d\.cpp:\d+\. Make it one table/);
});
