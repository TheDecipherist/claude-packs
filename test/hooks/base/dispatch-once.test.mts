// dispatch-once: one switch on a kind lives in one place. The hook's contract (its selftest, its worktree case, the emitted verdict
// equal to the source's), then the refusals that sat in the old root test files.
import { join } from 'node:path';
import { write } from '../../fixtures/installs.mts';
import { assert, hookRun, put, test } from '../../kit-cli.mts';
import type { Spawned } from '../../kit-cli.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';
import { lookupMatches } from '../../../packs/base/hooks/lib/rust-scan.mts';
import { ORDERS, crate, writeRs } from '../rust-crate.mts';
import { workProject, writeAt } from '../work-project.mts';

holdsTheContract({
  hook: 'dispatch-once.mjs',
  dir: () => fixture('audio-core'),
  same: (project) => {
    put(join(project, 'src/core/Blend.cpp'), 'float blend (Layer& l) { switch (l.blendStyle) { default: return 0.0f; } }\n');
    return { payload: write(join(project, 'src/core/Label.cpp'), 'const char* label (Layer& l) { switch (l.blendStyle) { default: return ""; } }\n'), status: 2 };
  },
});

test('dispatch-once: a second switch on the same kind in another file is refused', () => {
  const dir = fixture('audio-core');
  const hook = (rel: string, content: string): Spawned => hookRun(dir, 'dispatch-once.mjs', write(join(dir, rel), content));
  put(join(dir, 'src/dsp/Osc.cpp'), 'float render (Osc& o) { switch (o.mode) { case Mode::saw: return 1.0f; } return 0.0f; }\n');
  const r = hook('src/app/Label.cpp', 'juce::String label (Osc& o) { switch (o.mode) { case Mode::saw: return "SAW"; } return {}; }\n');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /"mode" is already switched on in: src\/dsp\/Osc\.cpp/);
  assert.equal(hook('src/app/Arp.cpp', 'void step (Arp& a) { switch (a.direction) { case Dir::up: break; } }\n').status, 0);
  assert.equal(hook('tests/osc_test.cpp', 'switch (o.mode) { case Mode::saw: break; }\n').status, 0);
  assert.equal(hook('../elsewhere/Label.cpp', 'switch (o.mode) { case Mode::saw: break; }\n').status, 0);
});

const SWITCH = (expr: string, ...labels: string[]): string =>
  `void f()\n{\n    switch (${expr})\n    {\n${labels.map((l) => `        case ${l}: run (); break;\n`).join('')}    }\n}\n`;

test('KF-35: a switch on another type\'s kind is another kind, told by its cases', () => {
  const dir = workProject();
  put(join(dir, 'src/Engine.cpp'), SWITCH('block.kind', 'BlockKind::delay', 'BlockKind::reverb'));
  assert.equal(writeAt(dir, 'dispatch-once.mjs', 'src/Glyph.cpp', SWITCH('step.kind', 'StepKind::line', 'StepKind::curve')).status, 0);
  assert.equal(writeAt(dir, 'dispatch-once.mjs', 'src/Other.cpp', SWITCH('other.kind', 'BlockKind::delay', 'BlockKind::chorus')).status, 2, 'one case shared: the same kind');
  assert.equal(writeAt(dir, 'dispatch-once.mjs', 'src/Plain.cpp', 'void g()\n{\n    switch (block.kind) { default: break; }\n}\n').status, 2, 'no case to read: the name decides, as before');
});

test('KF-35: two switches on one kind in one new file are refused, with a true reason', () => {
  const dir = workProject();
  const r = writeAt(dir, 'dispatch-once.mjs', 'src/Glyph.cpp', `${SWITCH('step.kind', 'StepKind::line', 'StepKind::curve')}${SWITCH('step.kind', 'StepKind::line', 'StepKind::curve').replace('void f', 'void g')}`);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /twice in this file/);
});

// 1.1.0 (KWB-82): a `match` that does work is good Rust, so a port of the C++ law refused it.
test('dispatch-once: a lookup table on an enum outside it is refused; real work, and the enum\'s own methods, are not (KWB-82)', () => {
  const dir = crate();
  const table = 'use crate::orders::State;\npub fn colour(state: &State) -> u32 {\n    match state {\n        State::Open => 1,\n        State::Paid => 2,\n        State::Shipped => 3,\n        State::Closed => 4,\n    }\n}\n';
  const refused = writeRs(dir, 'dispatch-once.mjs', 'src/colour.rs', table);
  assert.equal(refused.status, 2);
  assert.match(refused.stderr, /a method on the enum/);
  assert.equal(writeRs(dir, 'dispatch-once.mjs', 'src/advance.rs', table.replace(/=> \d,/g, '=> store.step(),')).status, 0);
  assert.equal(writeRs(dir, 'dispatch-once.mjs', 'src/orders.rs', ORDERS.replace('impl State {', `impl State {\n    pub fn colour(&self) -> u32 {\n        match self {\n            State::Open => 1,\n            State::Paid => 2,\n            State::Shipped => 3,\n            State::Closed => 4,\n        }\n    }\n`)).status, 0);
});

test('a table on the standard library\'s own enums, a true-false table and a two-variant table are no kind', () => {
  assert.equal(lookupMatches('fn f(o: Ordering) -> u8 {\n    match o {\n        Ordering::Less => 1,\n        Ordering::Equal => 2,\n        Ordering::Greater => 3,\n    }\n}\n').length, 0);
  assert.equal(lookupMatches('fn f(s: S) -> bool {\n    match s {\n        S::A => true,\n        S::B => false,\n        S::C => true,\n    }\n}\n').length, 0);
  assert.equal(lookupMatches('fn f(s: S) -> u8 {\n    match s {\n        S::A => 1,\n        S::B => 2,\n    }\n}\n').length, 0);
});
