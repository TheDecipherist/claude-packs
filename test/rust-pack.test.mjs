// 1.1.0: the rust pack, and what a project that is not C++ or JS needed from the kit (KWB-75 to KWB-80). Each case was met on a real crate.
import { assert, cli, existsSync, fresh, hookRun, join, lessonWrite, mkdirSync, readFileSync, run, test, writeFileSync } from './kit-cli.mjs';
import { languageOf } from '../packs/base/hooks/lib/languages.mjs';

const rust = languageOf('.rs');
const write = (dir, hook, rel, content) => hookRun(dir, hook, { tool_name: 'Write', tool_input: { file_path: join(dir, rel), content } }).status;

function crate() {
  const dir = fresh('crate-');
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'Cargo.toml'), '[package]\nname = "demo"\nversion = "0.1.0"\nedition = "2021"\n');
  writeFileSync(join(dir, 'src/lib.rs'), 'pub fn one() -> u32 {\n    1\n}\n');
  return dir;
}
const installed = () => { const dir = crate(); run(dir, 'init', '--auto'); return dir; };

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
  assert.equal(blanked.match(/\.unwrap\(\)/g).length, 2);
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
  const left = rust.withoutTests(rust.blank(src));
  assert.deepEqual(left.match(/\w\.unwrap/g), ['a.unwrap', 'c.unwrap']);
});

test('a method in an impl is a definition, in every form a function takes (KWB-75)', () => {
  const src = 'impl X {\n    pub(crate) async fn load_all(&self) {}\n    const unsafe fn raw() {}\n}\npub extern "C" fn exported() {}\n';
  assert.deepEqual([...src.matchAll(rust.define)].map((m) => m[1]), ['load_all', 'raw', 'exported']);
});

test('suggest reads a new crate, and init --auto installs the rust configuration', () => {
  const dir = crate();
  const said = cli(dir, 'suggest').stdout;
  assert.match(said, /configuration: rust/);
  assert.match(said, /rust +Rust crate: Cargo\.toml/);
  run(dir, 'init', '--auto');
  const layout = JSON.parse(readFileSync(join(dir, '.claude/layout.json'), 'utf8'));
  assert.equal(layout.configuration, 'rust');
  assert.ok(existsSync(join(dir, '.claude/rules/rust-errors-are-returned.md')));
  assert.ok(existsSync(join(dir, '.claude/tools/rust-lints.toml')));
  assert.ok(existsSync(join(dir, 'clippy.toml')), 'clippy reads its file from the root');
  assert.ok(!existsSync(join(dir, 'crates')), 'a planned folder waits for its first file');
});

test('a new crate passes doctor --strict: no planned folder is missing, and no universal rule is dead (KWB-78, KWB-79)', () => {
  const dir = installed();
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

test('.unwrap() is refused in library code, and left alone in a test, in main.rs and behind a lifetime is no hiding place', () => {
  const dir = installed();
  assert.equal(lessonWrite(dir, 'src/a.rs', "pub fn f<'a>(x: &'a str) -> u32 {\n    x.parse().unwrap()\n}\n").status, 2);
  assert.equal(lessonWrite(dir, 'src/b.rs', 'pub fn f(x: &str) -> u32 {\n    x.parse().expect("checked in new()")\n}\n').status, 0);
  assert.equal(lessonWrite(dir, 'src/c.rs', 'pub fn f() {}\n#[cfg(test)]\nmod tests {\n    #[test]\n    fn t() {\n        "1".parse::<u32>().unwrap();\n    }\n}\n').status, 0);
  assert.equal(lessonWrite(dir, 'src/main.rs', 'fn main() {\n    "1".parse::<u32>().unwrap();\n}\n').status, 0);
  assert.equal(lessonWrite(dir, 'src/d.rs', 'pub fn f(m: &std::sync::Mutex<u32>) -> u32 {\n    *m.lock().unwrap()\n}\n').status, 0);
});

test('a SAFETY comment may run over lines, sit above a let, or name the block on its own line', () => {
  const dir = installed();
  const body = (lines) => `pub fn f(p: *const u8) -> u8 {\n${lines}\n}\n`;
  assert.equal(lessonWrite(dir, 'src/a.rs', body('    unsafe { *p }')).status, 2);
  assert.equal(lessonWrite(dir, 'src/a.rs', body('    // some other comment\n    unsafe { *p }')).status, 2);
  assert.equal(lessonWrite(dir, 'src/a.rs', body('    // SAFETY: new() checked p.\n    unsafe { *p }')).status, 0);
  assert.equal(lessonWrite(dir, 'src/a.rs', body('    // SAFETY: new() checked p,\n    // and nothing frees it.\n    let v = unsafe { *p };\n    v')).status, 0);
  assert.equal(lessonWrite(dir, 'src/a.rs', body('    unsafe { *p } // SAFETY: new() checked p.')).status, 0);
});

test('blocking in an async fn is refused, and handing it off is not', () => {
  const dir = installed();
  assert.equal(lessonWrite(dir, 'src/a.rs', 'pub async fn f() {\n    std::thread::sleep(WAIT);\n}\n').status, 2);
  assert.equal(lessonWrite(dir, 'src/a.rs', 'pub async fn f() {\n    let _ = std::fs::read(PATH);\n}\n').status, 2);
  assert.equal(lessonWrite(dir, 'src/b.rs', 'pub async fn f() {\n    asyncify(move || std::fs::read(PATH)).await;\n}\n').status, 0);
  assert.equal(lessonWrite(dir, 'src/c.rs', 'pub async fn f() {\n    tokio::spawn(async move { std::fs::read(PATH) });\n}\n').status, 0);
  assert.equal(lessonWrite(dir, 'src/d.rs', 'pub fn f() {\n    std::thread::sleep(WAIT);\n}\n').status, 0);
});

test('a public function returns an error a caller can match on; a generic that holds a String is no error type', () => {
  const dir = installed();
  assert.equal(lessonWrite(dir, 'src/a.rs', 'pub fn f() -> Result<u8, String> {\n    Ok(1)\n}\n').status, 2);
  assert.equal(lessonWrite(dir, 'src/a.rs', 'pub fn f() -> Result<u8, Box<dyn std::error::Error>> {\n    Ok(1)\n}\n').status, 2);
  assert.equal(lessonWrite(dir, 'src/b.rs', 'pub fn f() -> Result<HashMap<Oid, String>> {\n    todo_free()\n}\n').status, 0);
  assert.equal(lessonWrite(dir, 'src/c.rs', 'pub(crate) fn f() -> Result<u8, String> {\n    Ok(1)\n}\n').status, 0);
});

test('a stub, a lint off with no reason, a static mut and a * version are refused', () => {
  const dir = installed();
  assert.equal(lessonWrite(dir, 'src/a.rs', 'pub fn f() -> u8 {\n    todo!()\n}\n').status, 2);
  assert.equal(lessonWrite(dir, 'src/b.rs', 'pub fn f() -> u8 {\n    unimplemented!()\n}\n').status, 0);
  assert.equal(lessonWrite(dir, 'src/c.rs', '#[allow(dead_code)]\nfn old() {}\n').status, 2);
  assert.equal(lessonWrite(dir, 'src/d.rs', '#[expect(dead_code, reason = "the FFI side calls it")]\nfn old() {}\n').status, 0);
  assert.equal(lessonWrite(dir, 'src/e.rs', 'static mut COUNT: u32 = 0;\n').status, 2);
  assert.equal(lessonWrite(dir, 'src/f.rs', 'extern "C" {\n    static mut errno: i32;\n}\n').status, 0);
  assert.equal(lessonWrite(dir, 'Cargo.toml', '[dependencies]\nserde = "*"\n').status, 2);
  assert.equal(lessonWrite(dir, 'Cargo.toml', '[dependencies]\nserde = "1.0"\n').status, 0);
});

test('a plain src/ takes new files, in every configuration that names nothing inside it (KWB-78)', () => {
  const dir = installed();
  assert.equal(write(dir, 'folder-law.mjs', 'src/parser.rs', 'pub fn f() {}\n'), 0);
  assert.equal(write(dir, 'folder-law.mjs', 'crates/core/src/lib.rs', 'pub fn f() {}\n'), 0);
  assert.equal(write(dir, 'folder-law.mjs', 'benches/speed.rs', 'fn main() {}\n'), 0);
  assert.equal(write(dir, 'folder-law.mjs', 'build.rs', 'fn main() {}\n'), 0);
  assert.equal(write(dir, 'folder-law.mjs', 'stray.rs', 'pub fn f() {}\n'), 2);
  const py = fresh('py-');
  mkdirSync(join(py, 'src'));
  writeFileSync(join(py, 'src/a.py'), 'print(1)\n');
  run(py, 'init', '--auto');
  assert.equal(write(py, 'folder-law.mjs', 'src/new.py', 'print(2)\n'), 0);
  assert.match(readFileSync(join(py, '.claude/rules/bug-fix-starts-red.md'), 'utf8'), /\*\*\/\*\.py/, 'a universal rule loads on Python (KWB-79)');
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
  assert.equal(JSON.parse(readFileSync(join(dir, '.claude/layout.json'), 'utf8')).configuration, 'node');
});

test('no configuration names a folder on one machine (KWB-77)', () => {
  const dir = installed();
  assert.doesNotMatch(readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), /~\/projects/);
});
