// The layer-0 scanners (W3): glob, prose, audience, identifier-runs, cpp-scan, rust-scan, core-budget (build-slots retired: the governor owns the slots, W8.8).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addressedOutside } from '../../../packs/base/hooks/lib/audience.mts';
import { blankCode, findAudioBodies, lineAt } from '../../../packs/base/hooks/lib/cpp-scan.mts';
import { capJobs, coreBudget, gentle } from '../../../packs/base/hooks/lib/core-budget.mts';
import { globToRegExp, matchesAny } from '../../../packs/base/hooks/lib/glob.mts';
import { withRuns } from '../../../packs/base/hooks/lib/identifier-runs.mts';
import { blankProse } from '../../../packs/base/hooks/lib/prose.mts';
import { blankRust, lookupMatches, ownDefinitions, withoutTests } from '../../../packs/base/hooks/lib/rust-scan.mts';

test('glob: ** crosses folders, * stays in one, {a,b} alternates, a planted miss is a miss', () => {
  assert.ok(matchesAny('src/a/b.ts', ['**/*.ts']));
  assert.ok(matchesAny('b.ts', ['**/*.ts']));
  assert.ok(!matchesAny('src/a/b.ts', ['src/*.ts']));
  assert.ok(matchesAny('./x.{c,h}'.replace('./', '').replace('{c,h}', 'h'), ['x.{c,h}']));
  assert.ok(!matchesAny('x.js', ['x.{c,h}']));
  assert.equal(globToRegExp('a.b'), globToRegExp('a.b'));
  assert.ok(!globToRegExp('a.b').test('axb'));
});

test('prose blanks code, comments and links, keeping length and lines', () => {
  const text = 'a `x -- y` b\n```\ncode\n```\n[l](http://u) <!-- c -->';
  const out = blankProse(text);
  assert.equal(out.length, text.length);
  assert.equal(out.split('\n').length, text.split('\n').length);
  assert.ok(!out.includes('--') && !out.includes('code'));
});

test('audience: the marker counts in a document head only, never in source', () => {
  const marker = '<!-- audience: outside -->';
  assert.ok(addressedOutside('a.md', `${marker}\nx`));
  assert.ok(!addressedOutside('a.cpp', marker));
  assert.ok(!addressedOutside('a.md', 42));
  assert.ok(!addressedOutside('a.md', `1\n2\n3\n4\n5\n${marker}`));
});

test('identifier-runs: parts, then runs of two and three', () => {
  assert.deepEqual(withRuns(['pattern', 'slot', 'card']), ['pattern', 'slot', 'card', 'patternslot', 'patternslotcard', 'slotcard']);
  assert.deepEqual(withRuns([]), []);
});

test('cpp-scan: blanks comments and strings, finds an audio body, not a call', () => {
  const src = 'void A::processBlock (X& b) noexcept { // new\n auto s = "//"; }\nif (x.processSample (s)) { }';
  const code = blankCode(src);
  assert.equal(code.length, src.length);
  assert.ok(!code.includes('new'));
  const bodies = findAudioBodies(code);
  assert.deepEqual(bodies.map((b) => b.name), ['processBlock']);
  assert.equal(lineAt(src, src.indexOf('auto')), 2);
});

test('rust-scan: raw strings and lifetimes, tests dropped, a lookup match found', () => {
  const src = "fn f<'a>(x: &'a str) { let s = r#\"fn \" //\"#; /* /* n */ */ }\n#[cfg(test)]\nmod t { fn g() {} }\nimpl K { fn m() {} }\nfn free() {}";
  const code = blankRust(src);
  assert.equal(code.length, src.length);
  assert.ok(!code.includes('//') && code.includes("'a"));
  assert.ok(!withoutTests(code).includes('mod t'));
  const own = ownDefinitions(code);
  assert.ok(own.includes('fn free') && !own.includes('fn m'));
  const table = 'enum K { A, B, C }\nfn n(k: K) -> u32 { match k { K::A => 1, K::B => 2, K::C => 3 } }';
  const found = lookupMatches(table);
  assert.equal(found.length, 1);
  assert.equal(found[0]?.kind, 'K');
  assert.equal(found[0]?.owned, true);
  assert.equal(lookupMatches('fn n(k: K) { match k { K::A => work(), K::B => 2, K::C => 3 } }').length, 0);
});

test('core-budget: the environment and layout are parameters; planted bad values fall through', () => {
  assert.equal(coreBudget({ BUILDQ_CORES: '5' }, { guards: { buildq: { cores: 9 } } }, 18), 5);
  assert.equal(coreBudget({}, { guards: { buildq: { cores: 9 } } }, 18), 9);
  assert.equal(coreBudget({ BUILDQ_CORES: 'x' }, {}, 4), 2);
  assert.deepEqual(capJobs(['ninja'], 3), ['ninja', '-j3']);
  assert.deepEqual(capJobs(['make', '-j18'], 3), ['make', '-j3']);
  assert.deepEqual(gentle(['a'], { platform: 'win32', env: {} }), ['a']);
  assert.deepEqual(gentle(['a'], { platform: 'linux', env: {} }), ['nice', '-n', '10', 'a']);
});
