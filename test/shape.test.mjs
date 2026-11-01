// The shape law (0.9.0, KWB-1): design/shape.json per synth, doctor's checks on it, `shape scan`, and the law switched on
// in a project that already had the kit.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../bin/claude-packs.mjs', import.meta.url));
const cli = (...a) => spawnSync('node', [CLI, ...a], { encoding: 'utf8' });
const put = (file, text) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text); };
const SLOT = { shape: 'many', count: 4, generator: 'slotId(i, field)', words: ['slot', 'slots'], selectors: { selectedSlot: 'the open slot' }, constants: { initSlot: { instance: 1, reason: 'INIT plays in it' } } };

test('new writes an empty design/shape.json and commits it; doctor passes', () => {
  const parent = mkdtempSync(join(tmpdir(), 'cps-new-'));
  const r = cli('new', 'synth', '--dir', parent);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const dir = join(parent, 'synth');
  assert.deepEqual(JSON.parse(readFileSync(join(dir, 'design/shape.json'), 'utf8')).concepts, {});
  assert.match(execFileSync('git', ['ls-files'], { cwd: dir, encoding: 'utf8' }), /^design\/shape\.json$/m);
});

test('doctor fails a synth with no manifest, one that does not parse, and rows that break the contract', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cps-doc-'));
  assert.equal(cli('init', 'audio-core', '--dir', dir).status, 0, 'init writes the empty manifest');
  const file = join(dir, 'design/shape.json');
  assert.ok(existsSync(file));
  rmSync(file);
  let r = cli('doctor', '--dir', dir);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /PROBLEM: no design\/shape\.json: a synth writes down/);
  writeFileSync(file, '{ "concepts": ');
  assert.match(cli('doctor', '--dir', dir).stdout, /PROBLEM: design\/shape\.json does not parse/);
  writeFileSync(file, JSON.stringify({ concepts: { slot: { ...SLOT, generator: undefined, constants: { initSlot: { instance: 1 } } }, mixer: { shape: 'single' } }, exclude: [] }));
  r = cli('doctor', '--dir', dir);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /"slot": a many concept needs its generator/);
  assert.match(r.stdout, /"slot": constant initSlot has no reason/);
  assert.match(r.stdout, /"mixer": shape must be "one" or "many"/);
  writeFileSync(file, JSON.stringify({ concepts: { slot: SLOT, mixer: { shape: 'one', id: 'mixer' } }, exclude: [] }));
  r = cli('doctor', '--dir', dir);
  assert.doesNotMatch(r.stdout, /shape\.json/, r.stdout);
});

test('a project that is not a synth needs no manifest', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cps-gpu-'));
  assert.equal(cli('init', 'gpu-painter', '--dir', dir).status, 0);
  assert.ok(!existsSync(join(dir, 'design/shape.json')));
});

test('shape scan lists every finding by file and concept, with a count, in code, tests, docs and inbox briefs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cps-scan-'));
  put(join(dir, 'design/shape.json'), JSON.stringify({ concepts: { slot: SLOT }, exclude: ['build/**'] }));
  put(join(dir, 'src/world/Space.cpp'), 'void f() { if (slotIx == 1) go(); }\nfor (int s = 0; s < kSlots; ++s) run(s);\n');
  put(join(dir, 'tests/slot_test.cpp'), 'TEST(S, P) { e.playSlot(2); }\n');
  put(join(dir, 'docs/spec.md'), 'The PAD slot plays.\nseen in: slot 3, built for all slots\n');
  put(join(dir, 'inbox/brief-1.md'), 'Drive slot 2.\n');
  put(join(dir, 'build/gen.cpp'), 'slots[1];\n');
  let r = cli('shape', 'scan', '--dir', dir);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  for (const at of ['src/world/Space.cpp:1:', 'tests/slot_test.cpp:1:', 'docs/spec.md:1:', 'inbox/brief-1.md:1:']) assert.ok(r.stdout.includes(at), at);
  assert.doesNotMatch(r.stdout, /build\/gen\.cpp|docs\/spec\.md:2/);
  assert.match(r.stdout, /^slot: 4 finding\(s\) in 4 file\(s\)$/m);
  assert.match(r.stdout, /example, rule, or constant\?/);
  for (const f of ['src/world/Space.cpp', 'tests/slot_test.cpp', 'docs/spec.md', 'inbox/brief-1.md']) rmSync(join(dir, f));
  r = cli('shape', 'scan', '--dir', dir);
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /no findings/);
});

test('the shape hooks are the law: on in a new install and switched on by update in a project that had the kit', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cps-upd-'));
  assert.equal(cli('init', 'audio-core', '--dir', dir).status, 0);
  const lockFile = join(dir, '.claude/claude-packs.lock.json');
  const lock = JSON.parse(readFileSync(lockFile, 'utf8'));
  for (const h of ['shape-law.mjs', 'brief-guard.mjs']) { delete lock.files[`.claude/hooks/${h}`]; rmSync(join(dir, '.claude/hooks', h)); }
  writeFileSync(lockFile, JSON.stringify(lock));
  const sf = join(dir, '.claude/settings.json');
  const before = JSON.parse(readFileSync(sf, 'utf8'));
  for (const ev of Object.keys(before.hooks)) before.hooks[ev] = before.hooks[ev].map((g) => ({ ...g, hooks: g.hooks.filter((h) => !/shape-law|brief-guard/.test(h.command)) })).filter((g) => g.hooks.length);
  writeFileSync(sf, JSON.stringify(before));
  const r = cli('update', '--dir', dir);
  assert.match(r.stdout, /switching on \(new to this project\): .*hooks\/brief-guard\.mjs/);
  assert.match(r.stdout, /switching on \(new to this project\): .*hooks\/shape-law\.mjs/);
  const s = readFileSync(join(dir, '.claude/settings.json'), 'utf8');
  assert.match(s, /hooks\/shape-law\.mjs/);
  const agent = JSON.parse(s).hooks.PreToolUse.find((g) => g.matcher === 'Agent|Task');
  assert.ok(agent?.hooks.some((h) => h.command.includes('brief-guard.mjs')), 'brief-guard reads every agent brief');
});
