// 1.1.0: the repetition laws, true on Rust (KWB-81, KWB-82). The DRY laws were written on C++ and JS, and a language row alone did not make them hold:
// each case here was met on a real crate. A trait method must repeat, and a `match` that does work is good Rust, so a port of the C++ law refused both.
import { assert, fresh, hookRun, join, lessonWrite, mkdirSync, run, test, writeFileSync } from './kit-cli.mjs';
import { definesOf } from '../packs/base/hooks/lib/near-copies.mjs';
import { lookupMatches } from '../packs/base/hooks/lib/rust-scan.mjs';

const ORDERS = `use std::str::FromStr;

pub struct Order { pub id: u64, pub total: u64, pub state: State }
pub enum State { Open, Paid, Shipped, Closed }

impl FromStr for Order {
    type Err = ParseError;
    fn from_str(text: &str) -> Result<Self, Self::Err> {
        let parts: Vec<&str> = text.split(',').collect();
        Ok(Order { id: first(&parts)?, total: second(&parts)?, state: State::Open })
    }
}

pub fn load_order_rows(store: &Store, key: &str) -> Result<Vec<Order>, StoreError> {
    let rows = store.fetch(key)?;
    let mut found = Vec::with_capacity(rows.len());
    for row in rows {
        let parsed = row.text().parse::<Order>().map_err(StoreError::Parse)?;
        found.push(parsed);
    }
    found.sort_by_key(|o| o.id);
    found.dedup_by_key(|o| o.id);
    store.touch(key)?;
    store.log("orders", found.len())?;
    Ok(found)
}

impl State {
    pub fn label(&self) -> &'static str {
        match self {
            State::Open => "open",
            State::Paid => "paid",
            State::Shipped => "shipped",
            State::Closed => "closed",
        }
    }
}
`;

function crate() {
  const dir = fresh('rust-dry-');
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'Cargo.toml'), '[package]\nname = "demo"\nversion = "0.1.0"\nedition = "2021"\n');
  writeFileSync(join(dir, 'src/lib.rs'), 'pub mod orders;\n');
  writeFileSync(join(dir, 'src/orders.rs'), ORDERS);
  run(dir, 'init', '--auto');
  return dir;
}
const write = (dir, hook, rel, content) => hookRun(dir, hook, { tool_name: 'Write', tool_input: { file_path: join(dir, rel), content } });
const COPY = ORDERS.slice(ORDERS.indexOf('pub fn load_order_rows'), ORDERS.indexOf('impl State')).replace(/Order/g, 'Invoice').replace('load_order_rows', 'load_invoice_rows').replace(/parsed/g, 'item').replace(/found/g, 'kept');

test('only a free function can be made again by name: a method lives in its type', () => {
  const defined = definesOf(`${ORDERS}\nimpl Other {\n    pub fn is_none(&self) -> bool {\n        true\n    }\n}\ntrait T {\n    fn run_all(&self);\n}\n`, '.rs').map(([name]) => name);
  assert.deepEqual(defined, ['load_order_rows']);
});

test('template-law: a trait method on a second type passes, a free function made again does not (KWB-81)', () => {
  const dir = crate();
  const port = 'pub struct Port(u16);\nimpl FromStr for Port {\n    type Err = PortError;\n    fn from_str(text: &str) -> Result<Self, Self::Err> {\n        text.trim().parse().map(Port).map_err(PortError::from)\n    }\n}\n';
  assert.equal(write(dir, 'template-law.mjs', 'src/port.rs', port).status, 0);
  assert.equal(write(dir, 'template-law.mjs', 'src/other.rs', 'pub fn load_order_rows(key: &str) -> usize {\n    key.len()\n}\n').status, 2);
});

test('template-law: a copy with other names is refused, and a real exception says so above it', () => {
  const dir = crate();
  assert.equal(write(dir, 'template-law.mjs', 'src/invoices.rs', COPY).status, 2);
  assert.equal(write(dir, 'template-law.mjs', 'src/invoices.rs', `// one-off: billing diverges in the next release\n${COPY}`).status, 0);
});

test('template-law: one method called six times is a table, and the refusal names the call', () => {
  const dir = crate();
  const rows = ['users', 'orders', 'invoices', 'ports', 'items', 'teams'].map((r) => `    app.route("/${r}", get(${r}), Auth::Required, Limit::Default);\n`).join('');
  const r = write(dir, 'template-law.mjs', 'src/routes.rs', `pub fn register(app: &mut App) {\n${rows}}\n`);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /6 calls of app\.route \(\.\.\.\)/);
});

test('dispatch-once: a lookup table on an enum outside it is refused; real work, and the enum\'s own methods, are not (KWB-82)', () => {
  const dir = crate();
  const table = 'use crate::orders::State;\npub fn colour(state: &State) -> u32 {\n    match state {\n        State::Open => 1,\n        State::Paid => 2,\n        State::Shipped => 3,\n        State::Closed => 4,\n    }\n}\n';
  const refused = write(dir, 'dispatch-once.mjs', 'src/colour.rs', table);
  assert.equal(refused.status, 2);
  assert.match(refused.stderr, /a method on the enum/);
  assert.equal(write(dir, 'dispatch-once.mjs', 'src/advance.rs', table.replace(/=> \d,/g, '=> store.step(),')).status, 0);
  assert.equal(write(dir, 'dispatch-once.mjs', 'src/orders.rs', ORDERS.replace('impl State {', `impl State {\n    pub fn colour(&self) -> u32 {\n        match self {\n            State::Open => 1,\n            State::Paid => 2,\n            State::Shipped => 3,\n            State::Closed => 4,\n        }\n    }\n`)).status, 0);
});

test('a table on the standard library\'s own enums, a true-false table and a two-variant table are no kind', () => {
  assert.equal(lookupMatches('fn f(o: Ordering) -> u8 {\n    match o {\n        Ordering::Less => 1,\n        Ordering::Equal => 2,\n        Ordering::Greater => 3,\n    }\n}\n').length, 0);
  assert.equal(lookupMatches('fn f(s: S) -> bool {\n    match s {\n        S::A => true,\n        S::B => false,\n        S::C => true,\n    }\n}\n').length, 0);
  assert.equal(lookupMatches('fn f(s: S) -> u8 {\n    match s {\n        S::A => 1,\n        S::B => 2,\n    }\n}\n').length, 0);
});

test('three branches on one value are a match, and two are not', () => {
  const dir = crate();
  assert.equal(lessonWrite(dir, 'src/a.rs', 'pub fn name(kind: u8) -> u8 {\n    if kind == Kind::A {\n        1\n    } else if kind == Kind::B {\n        2\n    } else if kind == Kind::C {\n        3\n    } else {\n        4\n    }\n}\n').status, 2);
  assert.equal(lessonWrite(dir, 'src/b.rs', 'pub fn name(kind: u8) -> u8 {\n    if kind == Kind::A {\n        1\n    } else if kind == Kind::B {\n        2\n    } else {\n        4\n    }\n}\n').status, 0);
  assert.equal(lessonWrite(dir, 'src/d.rs', 'pub fn name(p: &Path) -> u8 {\n    if p == RENAME {\n        1\n    } else if p == SKIP {\n        2\n    } else if p == OTHER {\n        3\n    } else {\n        4\n    }\n}\n').status, 0, 'a pattern cannot compare these');
  assert.equal(lessonWrite(dir, 'src/c.rs', 'pub fn name(a: u8, b: u8, c: u8) -> u8 {\n    if a == 1 {\n        1\n    } else if b == 2 {\n        2\n    } else if c == 3 {\n        3\n    } else {\n        4\n    }\n}\n').status, 0);
});
