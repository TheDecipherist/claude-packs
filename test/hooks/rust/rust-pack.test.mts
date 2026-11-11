// 1.1.0: the rust pack, and what a project that is not C++ or JS needed from the kit (KWB-75 to KWB-80). Each case was met on a real
// crate. No hook owns these: the language row the lesson checks read (its blanker, its test attributes, its definitions), and what
// suggest, init and doctor do for a crate. The rust checks fired through the hook are in lesson-checks.test.mts beside this file.
import { languageOf } from '../../../packs/base/hooks/lib/languages.mts';
import type { Language } from '../../../packs/base/hooks/lib/languages.mts';
import { put } from '../../../packs/base/hooks/lib/files.mts';
import { readJson } from '../../../packs/base/hooks/lib/json.mts';
import { assert, cli, existsSync, fresh, join, mkdirSync, readFileSync, run, test, writeFileSync } from '../../kit-cli.mts';
import { fixture } from '../hook-rig.mts';

const rustRow = (): Language => {
  const row = languageOf('.rs');
  if (!row) throw new Error('the language table has no row for .rs');
  return row;
};
const rust = rustRow();
const countOf = (text: string, pattern: RegExp): number => (text.match(pattern) ?? []).length;

/** A crate with no install: a manifest and one library file. */
function crate(): string {
  const dir = fresh('crate-');
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'Cargo.toml'), '[package]\nname = "demo"\nversion = "0.1.0"\nedition = "2021"\n');
  writeFileSync(join(dir, 'src/lib.rs'), 'pub fn one() -> u32 {\n    1\n}\n');
  return dir;
}

test('a lifetime is no char literal: the code after it is read (KWB-75)', () => {
  assert.match(rust.blank("fn f<'a>(x: &'a str) -> u32 { x.parse().unwrap() }"), /\.unwrap\(\)/);
});

test("a quote in a char literal opens no string, and an escape closes it (KWB-75)", () => {
  const lines = rust.blank(`let q = '"';\nlet c = '\\'';\nlet u = '\\u{1F600}';\ny.unwrap();`).split('\n');
  assert.equal(lines.length, 4);
  assert.equal(lines[3], 'y.unwrap();');
});

test('a raw string and a nested comment are read to their real end (KWB-75)', () => {
  const blanked = rust.blank('let s = r#"a " b.unwrap()"#; w.unwrap();\n/* a /* b */ c.unwrap() */ d.unwrap();');
  assert.equal(countOf(blanked, /\.unwrap\(\)/g), 2);
  assert.match(blanked, /w\.unwrap/);
  assert.match(blanked, /d\.unwrap/);
});

test('blanking keeps every offset, so a match reports the file\'s own line', () => {
  const src = `let s = r#"two\nlines"#;\n/* a\n/* b */ */\nlet c = 'é';\n`;
  assert.equal(rust.blank(src).length, src.length);
  assert.equal(rust.blank(src).split('\n').length, src.split('\n').length);
});

test('what a test attribute marks goes, and the code after it stays', () => {
  const src = '#[cfg(test)]\nmod tests {\n    #[test]\n    fn t() { x.unwrap(); }\n}\nfn after() { a.unwrap(); }\n#[tokio::test(flavor = "multi_thread")]\nasync fn u() -> [u8; 2] { b.unwrap() }\nfn last() { c.unwrap(); }\n';
  assert.ok(rust.withoutTests, 'the rust row removes tests');
  const left = rust.withoutTests(rust.blank(src));
  assert.deepEqual(left.match(/\w\.unwrap/g), ['a.unwrap', 'c.unwrap']);
});

test('a method in an impl is a definition, in every form a function takes (KWB-75)', () => {
  const src = 'impl X {\n    pub(crate) async fn load_all(&self) {}\n    const unsafe fn raw() {}\n}\npub extern "C" fn exported() {}\n';
  assert.ok(rust.define, 'the rust row defines a function');
  assert.deepEqual([...src.matchAll(rust.define)].map((m) => m[1]), ['load_all', 'raw', 'exported']);
});

test('suggest reads a new crate, and init --auto installs the rust configuration', () => {
  const dir = crate();
  const said = cli(dir, 'suggest').stdout;
  assert.match(said, /configuration: rust/);
  assert.match(said, /rust +Rust crate: Cargo\.toml/);
  run(dir, 'init', '--auto');
  assert.equal(readJson<{ configuration?: string }>(join(dir, '.claude/layout.json'), {})?.configuration, 'rust');
  assert.ok(existsSync(join(dir, '.claude/rules/rust-errors-are-returned.md')));
  assert.ok(existsSync(join(dir, '.claude/tools/rust-lints.toml')));
  assert.ok(existsSync(join(dir, 'clippy.toml')), 'clippy reads its file from the root');
  assert.ok(!existsSync(join(dir, 'crates')), 'a planned folder waits for its first file');
});

test('a new crate passes doctor --strict: no planned folder is missing, and no universal rule is dead (KWB-78, KWB-79)', () => {
  const dir = fixture('rust');
  put(join(dir, 'Cargo.toml'), '[package]\nname = "demo"\nversion = "0.1.0"\nedition = "2021"\n');
  put(join(dir, 'src/lib.rs'), 'pub fn one() -> u32 {\n    1\n}\n');
  const r = cli(dir, 'doctor', '--strict');
  assert.equal(r.status, 0, r.stdout);
  assert.match(readFileSync(join(dir, '.claude/rules/bug-fix-starts-red.md'), 'utf8'), /\*\*\/\*\.rs/);
});

test("a project's own clippy.toml is never replaced", () => {
  const dir = crate();
  writeFileSync(join(dir, 'clippy.toml'), 'msrv = "1.80"\n');
  run(dir, 'init', '--auto');
  assert.equal(readFileSync(join(dir, 'clippy.toml'), 'utf8'), 'msrv = "1.80"\n');
});

test('a project with no package.json is told the command that works there (KWB-76)', () => {
  const dir = crate();
  assert.match(cli(dir, 'suggest').stdout, /Install exactly this: npx @thedecipherist\/claude-packs init --auto/);
  run(dir, 'init', '--auto');
  assert.match(readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), /no package\.json: run the kit as `npx @thedecipherist\/claude-packs <command>`/);
});

test('a project with the kit in node_modules keeps the --no-install form, and no extra line', () => {
  const dir = crate();
  mkdirSync(join(dir, 'node_modules/@thedecipherist/claude-packs'), { recursive: true });
  writeFileSync(join(dir, 'node_modules/@thedecipherist/claude-packs/package.json'), '{}\n');
  writeFileSync(join(dir, 'package.json'), '{}\n');
  assert.match(cli(dir, 'suggest').stdout, /Install exactly this: npx --no-install @thedecipherist/);
  run(dir, 'init', '--auto');
  assert.doesNotMatch(readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), /no package\.json/);
});

test('`init <pack>` takes the project\'s own configuration when it takes that pack (KWB-80)', () => {
  const dir = fresh('node-');
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'src/a.ts'), 'export const a = 1;\n');
  run(dir, 'init', 'mongo');
  assert.equal(readJson<{ configuration?: string }>(join(dir, '.claude/layout.json'), {})?.configuration, 'node');
});

test('no configuration names a folder on one machine (KWB-77)', () => {
  const dir = fixture('rust');
  assert.doesNotMatch(readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), /~\/projects/);
});
