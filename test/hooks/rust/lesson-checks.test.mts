// The rust pack's lesson checks, fired through the base lesson-checks hook in a copy of the rust configuration's install
// (1.1.0, KWB-75 to KWB-80). Each case was met on a real crate. The hook's own contract is in test/hooks/base/lesson-checks.test.mts.
import { assert, lessonWrite, test } from '../../kit-cli.mts';
import { fixture } from '../hook-rig.mts';
import { holdsEachCaseIn, reviewPacksInstall } from '../lesson-cases.mts';

test('.unwrap() is refused in library code, and left alone in a test, in main.rs and behind a lifetime is no hiding place', () => {
  const dir = fixture('rust');
  assert.equal(lessonWrite(dir, 'src/a.rs', "pub fn f<'a>(x: &'a str) -> u32 {\n    x.parse().unwrap()\n}\n").status, 2);
  assert.equal(lessonWrite(dir, 'src/b.rs', 'pub fn f(x: &str) -> u32 {\n    x.parse().expect("checked in new()")\n}\n').status, 0);
  assert.equal(lessonWrite(dir, 'src/c.rs', 'pub fn f() {}\n#[cfg(test)]\nmod tests {\n    #[test]\n    fn t() {\n        "1".parse::<u32>().unwrap();\n    }\n}\n').status, 0);
  assert.equal(lessonWrite(dir, 'src/main.rs', 'fn main() {\n    "1".parse::<u32>().unwrap();\n}\n').status, 0);
  assert.equal(lessonWrite(dir, 'src/d.rs', 'pub fn f(m: &std::sync::Mutex<u32>) -> u32 {\n    *m.lock().unwrap()\n}\n').status, 0);
});

test('a SAFETY comment may run over lines, sit above a let, or name the block on its own line', () => {
  const dir = fixture('rust');
  const body = (lines: string): string => `pub fn f(p: *const u8) -> u8 {\n${lines}\n}\n`;
  assert.equal(lessonWrite(dir, 'src/a.rs', body('    unsafe { *p }')).status, 2);
  assert.equal(lessonWrite(dir, 'src/a.rs', body('    // some other comment\n    unsafe { *p }')).status, 2);
  assert.equal(lessonWrite(dir, 'src/a.rs', body('    // SAFETY: new() checked p.\n    unsafe { *p }')).status, 0);
  assert.equal(lessonWrite(dir, 'src/a.rs', body('    // SAFETY: new() checked p,\n    // and nothing frees it.\n    let v = unsafe { *p };\n    v')).status, 0);
  assert.equal(lessonWrite(dir, 'src/a.rs', body('    unsafe { *p } // SAFETY: new() checked p.')).status, 0);
});

test('blocking in an async fn is refused, and handing it off is not', () => {
  const dir = fixture('rust');
  assert.equal(lessonWrite(dir, 'src/a.rs', 'pub async fn f() {\n    std::thread::sleep(WAIT);\n}\n').status, 2);
  assert.equal(lessonWrite(dir, 'src/a.rs', 'pub async fn f() {\n    let _ = std::fs::read(PATH);\n}\n').status, 2);
  assert.equal(lessonWrite(dir, 'src/b.rs', 'pub async fn f() {\n    asyncify(move || std::fs::read(PATH)).await;\n}\n').status, 0);
  assert.equal(lessonWrite(dir, 'src/c.rs', 'pub async fn f() {\n    tokio::spawn(async move { std::fs::read(PATH) });\n}\n').status, 0);
  assert.equal(lessonWrite(dir, 'src/d.rs', 'pub fn f() {\n    std::thread::sleep(WAIT);\n}\n').status, 0);
});

test('a public function returns an error a caller can match on; a generic that holds a String is no error type', () => {
  const dir = fixture('rust');
  assert.equal(lessonWrite(dir, 'src/a.rs', 'pub fn f() -> Result<u8, String> {\n    Ok(1)\n}\n').status, 2);
  assert.equal(lessonWrite(dir, 'src/a.rs', 'pub fn f() -> Result<u8, Box<dyn std::error::Error>> {\n    Ok(1)\n}\n').status, 2);
  assert.equal(lessonWrite(dir, 'src/b.rs', 'pub fn f() -> Result<HashMap<Oid, String>> {\n    todo_free()\n}\n').status, 0);
  assert.equal(lessonWrite(dir, 'src/c.rs', 'pub(crate) fn f() -> Result<u8, String> {\n    Ok(1)\n}\n').status, 0);
});

test('a stub, a lint off with no reason, a static mut and a * version are refused', () => {
  const dir = fixture('rust');
  assert.equal(lessonWrite(dir, 'src/a.rs', 'pub fn f() -> u8 {\n    todo!()\n}\n').status, 2);
  assert.equal(lessonWrite(dir, 'src/b.rs', 'pub fn f() -> u8 {\n    unimplemented!()\n}\n').status, 0);
  assert.equal(lessonWrite(dir, 'src/c.rs', '#[allow(dead_code)]\nfn old() {}\n').status, 2);
  assert.equal(lessonWrite(dir, 'src/d.rs', '#[expect(dead_code, reason = "the FFI side calls it")]\nfn old() {}\n').status, 0);
  assert.equal(lessonWrite(dir, 'src/e.rs', 'static mut COUNT: u32 = 0;\n').status, 2);
  assert.equal(lessonWrite(dir, 'src/f.rs', 'extern "C" {\n    static mut errno: i32;\n}\n').status, 0);
  assert.equal(lessonWrite(dir, 'Cargo.toml', '[dependencies]\nserde = "*"\n').status, 2);
  assert.equal(lessonWrite(dir, 'Cargo.toml', '[dependencies]\nserde = "1.0"\n').status, 0);
});

// 0.25.0 (review-packs): a public function returns an error a caller can match on, with the pack taken in a mixed install.
holdsEachCaseIn(reviewPacksInstall, [
  ['rust', 'src/a.rs', 'pub fn f(x: &str) -> u32 {\n    x.parse().unwrap()\n}\n', 'pub fn f(x: &str) -> Result<u32, E> {\n    Ok(x.parse()?)\n}\n'],
]);

// 1.1.0 (KWB-81, KWB-82): the repetition laws on Rust; three branches on one value are a match.
test('three branches on one value are a match, and two are not', () => {
  const dir = fixture('rust');
  assert.equal(lessonWrite(dir, 'src/a.rs', 'pub fn name(kind: u8) -> u8 {\n    if kind == Kind::A {\n        1\n    } else if kind == Kind::B {\n        2\n    } else if kind == Kind::C {\n        3\n    } else {\n        4\n    }\n}\n').status, 2);
  assert.equal(lessonWrite(dir, 'src/b.rs', 'pub fn name(kind: u8) -> u8 {\n    if kind == Kind::A {\n        1\n    } else if kind == Kind::B {\n        2\n    } else {\n        4\n    }\n}\n').status, 0);
  assert.equal(lessonWrite(dir, 'src/d.rs', 'pub fn name(p: &Path) -> u8 {\n    if p == RENAME {\n        1\n    } else if p == SKIP {\n        2\n    } else if p == OTHER {\n        3\n    } else {\n        4\n    }\n}\n').status, 0, 'a pattern cannot compare these');
  assert.equal(lessonWrite(dir, 'src/c.rs', 'pub fn name(a: u8, b: u8, c: u8) -> u8 {\n    if a == 1 {\n        1\n    } else if b == 2 {\n        2\n    } else if c == 3 {\n        3\n    } else {\n        4\n    }\n}\n').status, 0);
});
