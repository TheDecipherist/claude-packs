// rust-scan.mts: Rust's own reading (KWB-75): blanking, the tests a file holds, the free functions, and lookup tables.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blankRust, lookupMatches, ownDefinitions, withoutTests } from '../../../packs/base/hooks/lib/rust-scan.mts';

test('comments (nested too) go, strings keep two quotes, and every offset stays', () => {
  const src = 'let a = "x // y"; /* one /* two */ still */ let b = 1; // tail\n';
  const out = blankRust(src);
  assert.equal(out.length, src.length);
  assert.equal(out.indexOf('let b'), src.indexOf('let b'));
  assert.doesNotMatch(out, /two|tail|x \/\/ y/);
  assert.match(out, /let a = "    {0,}";/);
});

test('a lifetime is not a char literal, a raw string with hashes closes on its hashes, a char is blanked', () => {
  const lifetime = "fn f<'a>(x: &'a str) -> &'a str { x } // c\n";
  assert.match(blankRust(lifetime), /fn f<'a>\(x: &'a str\) -> &'a str \{ x \}/);
  const raw = 'let s = r#"a "quoted" // b"#; let t = 1;';
  const out = blankRust(raw);
  assert.match(out, /let t = 1;/);
  assert.doesNotMatch(out, /quoted/);
  assert.doesNotMatch(blankRust("let c = 'z';"), /z/);
});

test('an unterminated string or comment is blanked to the end, never a throw', () => {
  assert.equal(blankRust('let a = "open').length, 'let a = "open'.length);
  assert.equal(blankRust('/* never closed').trim(), '');
});

test('what #[cfg(test)] or #[test] marks goes, the free code stays; own definitions drop impls and traits too', () => {
  const code = blankRust('fn keep() {}\n#[cfg(test)]\nmod tests { fn inner() {} }\n#[test]\nfn t() { assert!(true); }\nimpl Foo { fn method() {} }\ntrait T { fn m(); }\nfn free() {}\n');
  const noTests = withoutTests(code);
  assert.match(noTests, /fn keep/);
  assert.doesNotMatch(noTests, /inner|fn t\(/);
  assert.match(noTests, /fn method/);
  const own = ownDefinitions(code);
  assert.match(own, /fn keep/);
  assert.match(own, /fn free/);
  assert.doesNotMatch(own, /method|fn m\(/);
});

test('a match that only maps variants of one enum to literals is a lookup; one that does work, or a two-variant one, is not', () => {
  const table = 'enum Kind { A, B, C }\nfn n(k: Kind) -> u32 { match k { Kind::A => 1, Kind::B => 2, Kind::C => 3 } }\n';
  const found = lookupMatches(table);
  assert.equal(found.length, 1);
  assert.equal(found[0]?.kind, 'Kind');
  assert.deepEqual([...(found[0]?.labels ?? [])].sort(), ['A', 'B', 'C']);
  assert.equal(found[0]?.owned, true);
  assert.equal(lookupMatches('fn n(k: Other) -> u32 { match k { Kind::A => 1, Kind::B => 2, Kind::C => 3 } }')[0]?.owned, false);
  assert.deepEqual(lookupMatches('fn n(k: Kind) { match k { Kind::A => run(), Kind::B => stop(), Kind::C => 3 } }'), []);
  assert.deepEqual(lookupMatches('fn n(k: Kind) -> u32 { match k { Kind::A => 1, Kind::B => 2 } }'), []);
  // planted: a table inside a test module is not the file's own
  assert.deepEqual(lookupMatches(`#[cfg(test)]\nmod t { ${table} }\n`), []);
});
