// 1.1.0: the repetition laws, true on Rust (KWB-81, KWB-82). A small crate the template-law, dispatch-once and lookup tests share:
// a free function, a trait method, an enum with a label table, and a copy of the free function under other names.
import { join } from 'node:path';
import { put } from '../../packs/base/hooks/lib/files.mts';
import { fixture } from '../fixtures/installs.mts';
import { hookRun } from '../kit-cli.mts';
import type { Spawned } from '../kit-cli.mts';

export const ORDERS = `use std::str::FromStr;

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

/** The free function above, copied under other names. */
export const COPY = ORDERS.slice(ORDERS.indexOf('pub fn load_order_rows'), ORDERS.indexOf('impl State')).replace(/Order/g, 'Invoice').replace('load_order_rows', 'load_invoice_rows').replace(/parsed/g, 'item').replace(/found/g, 'kept');

/** A copy of the rust configuration's install holding that crate. */
export function crate(): string {
  const dir = fixture('rust');
  put(join(dir, 'Cargo.toml'), '[package]\nname = "demo"\nversion = "0.1.0"\nedition = "2021"\n');
  put(join(dir, 'src/lib.rs'), 'pub mod orders;\n');
  put(join(dir, 'src/orders.rs'), ORDERS);
  return dir;
}

/** A Write of `content` to `rel`, fired at one hook of the crate. */
export const writeRs = (dir: string, hook: string, rel: string, content: string): Spawned =>
  hookRun(dir, hook, { tool_name: 'Write', tool_input: { file_path: join(dir, rel), content } });
