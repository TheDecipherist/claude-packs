// template-law: a copy of a template, a helper or an element the project already has is refused, naming what differs. The hook's
// contract, then its refusals.
import { join } from 'node:path';
import { put } from '../../../packs/base/hooks/lib/files.mts';
import { write } from '../../fixtures/installs.mts';
import { assert, hookRun, mkdirSync, test, writeFileSync } from '../../kit-cli.mts';
import { definesOf } from '../../../packs/base/hooks/lib/near-copies.mts';
import { enable, fixture, holdsTheContract } from '../hook-rig.mts';
import { COPY, ORDERS, crate, writeRs } from '../rust-crate.mts';

const EL = (t: string): string => `<div class="tile"><h3 class="name">${t}</h3><p>${t}</p></div>\n`;

holdsTheContract({
  hook: 'template-law.mjs',
  dir: () => fixture('base'),
  same: (project) => {
    put(join(project, 'src/app/one.html'), EL('One'));
    return { payload: write(join(project, 'src/app/two.html'), EL('Two')), status: 2 };
  },
});

// 0.24.0: "we need to thoroughly do c++", "anything you find that is repeated should have something that makes it reuseable and
// template like". The fixtures are the shapes measured on Stellix: helpers copied from gate to gate with other names.
const reader = (f: string, id: string): string => `auto ${f} = [this](const std::string& ${id}) {\n  const auto& L = shown(); float best = 0.0f;\n  for (size_t i = 0; i < L.controls.size(); i++) best += L.controls[i].box.getCentreX() * float(getWidth());\n  if (best > 10.0f) log(best, "${id}");\n  const auto p = at(best, 2.5f); pressAt(p); releaseAt(p); return best;\n};\n`;

/** A copy of the cpp configuration's install with template-law switched on (it is opt-in there) and the first gate written. */
function cppWithGate(): string {
  const dir = fixture('cpp');
  enable(dir, 'hooks/template-law.mjs');
  mkdirSync(join(dir, 'src/app'), { recursive: true });
  writeFileSync(join(dir, 'src/app/gate_a.h'), reader('pressOf', 'id'));
  return dir;
}
const gateWrite = (dir: string, rel: string, content: string) => hookRun(dir, 'template-law.mjs', write(join(dir, rel), content));

test('template-law refuses a copied helper and names what differs: the parameters of the template', () => {
  const dir = cppWithGate();
  const r = gateWrite(dir, 'src/app/gate_b.h', reader('tapOf', 'key'));
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /src\/app\/gate_a\.h:1/);
  assert.match(r.stderr, /differs only in: tapOf \/ pressOf, key \/ id/);
  assert.match(r.stderr, /Take the copies out first/);
  assert.match(r.stderr, /make-it-a-template/);
});

test('template-law: an exact copy says to move it; a marked one-off passes; a data table passes', () => {
  const dir = cppWithGate();
  const same = gateWrite(dir, 'src/app/gate_b.h', reader('pressOf', 'id'));
  assert.equal(same.status, 2);
  assert.match(same.stderr, /It is the same, every name/);
  assert.equal(gateWrite(dir, 'src/app/gate_c.h', `// one-off: the window's own reader, it runs before the harness\n${reader('tapOf', 'key')}`).status, 0);
  const rows = (n: string): string => `constexpr Row ${n}[] = {\n${Array.from({ length: 12 }, (_, i) => `  { "row.${i}", ${i}, 0.5f, true },\n`).join('')}};\n`;
  writeFileSync(join(dir, 'src/app/rows_a.h'), rows('kA'));
  assert.equal(gateWrite(dir, 'src/app/rows_b.h', rows('kB')).status, 0);
});

// 1.1.0: the repetition laws, true on Rust (KWB-81, KWB-82). A trait method must repeat, and a `match` that does work is good Rust,
// so a port of the C++ law refused both.
test('only a free function can be made again by name: a method lives in its type', () => {
  const defined = definesOf(`${ORDERS}\nimpl Other {\n    pub fn is_none(&self) -> bool {\n        true\n    }\n}\ntrait T {\n    fn run_all(&self);\n}\n`, '.rs').map(([name]) => name);
  assert.deepEqual(defined, ['load_order_rows']);
});

test('template-law: a trait method on a second type passes, a free function made again does not (KWB-81)', () => {
  const dir = crate();
  const port = 'pub struct Port(u16);\nimpl FromStr for Port {\n    type Err = PortError;\n    fn from_str(text: &str) -> Result<Self, Self::Err> {\n        text.trim().parse().map(Port).map_err(PortError::from)\n    }\n}\n';
  assert.equal(writeRs(dir, 'template-law.mjs', 'src/port.rs', port).status, 0);
  assert.equal(writeRs(dir, 'template-law.mjs', 'src/other.rs', 'pub fn load_order_rows(key: &str) -> usize {\n    key.len()\n}\n').status, 2);
});

test('template-law: a copy with other names is refused, and a real exception says so above it', () => {
  const dir = crate();
  assert.equal(writeRs(dir, 'template-law.mjs', 'src/invoices.rs', COPY).status, 2);
  assert.equal(writeRs(dir, 'template-law.mjs', 'src/invoices.rs', `// one-off: billing diverges in the next release\n${COPY}`).status, 0);
});

test('template-law: one method called six times is a table, and the refusal names the call', () => {
  const dir = crate();
  const rows = ['users', 'orders', 'invoices', 'ports', 'items', 'teams'].map((r) => `    app.route("/${r}", get(${r}), Auth::Required, Limit::Default);\n`).join('');
  const r = writeRs(dir, 'template-law.mjs', 'src/routes.rs', `pub fn register(app: &mut App) {\n${rows}}\n`);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /6 calls of app\.route \(\.\.\.\)/);
});
