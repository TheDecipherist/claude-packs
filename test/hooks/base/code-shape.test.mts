// code-shape: a statement count, a line width and a parameter count that a function may not pass. The hook's contract (its selftest,
// its worktree case, the emitted verdict equal to the source's), then the refusals that sat in the old root test files.
import { join } from 'node:path';
import { codeShapes, statementsOf } from '../../../packs/base/hooks/lib/code-shapes.mts';
import { LANGUAGES, languageOf } from '../../../packs/base/hooks/lib/languages.mts';
import { definesOf } from '../../../packs/base/hooks/lib/near-copies.mts';
import { write } from '../../fixtures/installs.mts';
import { assert, test } from '../../kit-cli.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';
import { workProject, writeAt } from '../work-project.mts';

holdsTheContract({
  hook: 'code-shape.mjs',
  dir: () => fixture('audio-core'),
  same: (project) => ({ payload: write(join(project, 'src/app/packed.h'), 'void p() { a(); b(); c(); d(); }\n'), status: 2 }),
});

// 0.25.0: every language has repetition and template things, because AI writes the same thing over and over. One row per language: a copy
// with other names has the shape of the original, and a comment or a data table has none. The language table is lib/languages.mts.
type Call = (name: string, arg: string, i: number) => string;
type Sample = (name: string, variable: string) => string;
const steps = (call: Call, assign: (target: string, value: string) => string, n: string, v: string): string =>
  [0, 1, 2, 3, 4, 5, 6, 7].map((i) => assign(`${v}${i}`, call(`${n}.compute${i % 2 ? 'A' : 'B'}`, `${v}${i}`, i))).join('\n');
const callOf: Call = (f, a, i) => `${f}(${a}, ${i}, "k${i}", other(${a}))`;
const CLike = (head: (n: string) => string, tail: string, semi = ';'): Sample => (n, v) => `${head(n)}\n${steps(callOf, (x, c) => `  ${x} = ${c}${semi}`, n, v)}\n${tail}\n`;

const SAMPLES: Readonly<Record<string, Sample>> = {
  '.py': (n, v) => `def ${n}(rows):\n${steps(callOf, (x, c) => `    ${x} = ${c}`, n, v)}\n    return rows\n`,
  '.sh': (n, v) => `${n}() {\n${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `  curl -fsS --retry ${i} -o "$${v}${i}" "$url/${n}/${i}" || fail "${n} ${i}"`).join('\n')}\n}\n`,
  '.go': CLike((n) => `func ${n}(rows []Row) {`, '}', ''),
  '.rs': CLike((n) => `fn ${n}(rows: &[Row]) {`, '}'),
  '.java': CLike((n) => `  public void ${n}(Row rows) {`, '  }'),
  '.cs': CLike((n) => `  public void ${n}(Row rows) {`, '  }'),
  '.kt': CLike((n) => `fun ${n}(rows: Row) {`, '}', ''),
  '.swift': CLike((n) => `func ${n}(rows: Row) {`, '}', ''),
  '.rb': (n, v) => `def ${n}(rows)\n${steps(callOf, (x, c) => `  ${x} = ${c}`, n, v)}\nend\n`,
  '.php': CLike((n) => `function ${n}($rows) {`, '}'),
  '.lua': (n, v) => `function ${n}(rows)\n${steps(callOf, (x, c) => `  local ${x} = ${c}`, n, v)}\nend\n`,
};
const COMMENT: Readonly<Record<string, string>> = { '.py': '#', '.sh': '#', '.rb': '#', '.lua': '--' };
const idsOf = (text: string, ext: string): Set<string> => new Set(codeShapes(text, ext).filter((s) => s.kind === 'run').map((s) => s.id));

for (const [ext, sample] of Object.entries(SAMPLES)) {
  test(`${ext}: a copy with other names has the original's shape, and a function is seen by name`, () => {
    const a = idsOf(sample('loadOrders', 'row'), ext);
    const b = idsOf(sample('readInvoices', 'item'), ext);
    assert.ok(a.size > 0, 'a run is read');
    assert.ok([...a].some((id) => b.has(id)), 'the copy matches');
    assert.ok(definesOf(sample('loadOrders', 'row'), ext).some(([name]) => name === 'loadOrders'), 'its definition is read');
  });
  test(`${ext}: code in comments is nothing`, () => {
    const mark = COMMENT[ext] ?? '//';
    const commented = sample('loadOrders', 'row').split('\n').map((l) => `${mark} ${l}`).join('\n');
    assert.equal(idsOf(commented, ext).size, 0);
  });
}

test('every language in the table has its sample here, or is a family already sampled', () => {
  const sampled = new Set(Object.keys(SAMPLES));
  for (const l of LANGUAGES.filter((x) => !['c', 'js'].includes(x.name))) assert.ok(l.exts.some((e) => sampled.has(e)), l.name);
});

test('shell: the command and its flags are the shape; other commands are not a copy', () => {
  const a = '[ -f "$a" ] || fail\ncurl -fsS -o "$a" "$b"\ntar -xzf "$a" -C "$c"\ncp "$c/x" "$d"\nmv "$d/y" "$e"\nchmod +x "$e"\nln -s "$e" "$f"\n'.repeat(2);
  const b = a.replace(/curl -fsS/g, 'wget -q').replace(/tar -xzf/g, 'unzip -q');
  assert.equal([...idsOf(a, '.sh')].filter((id) => idsOf(b, '.sh').has(id)).length, 0);
});

// 1.1.0 (KF-14, KF-27): what counts as a statement.
const statementsOnLine = (text: string, ext: string, line: number): number => {
  const language = languageOf(ext);
  if (!language) throw new Error(`no language row for ${ext}`);
  return statementsOf(text, language).filter((s) => s.line === line).length;
};

test('KF-14: a Python brace is data, not a statement end', () => {
  assert.equal(statementsOnLine('used = {row.kind for row in rows if row.kind}\n', '.py', 1), 1);
  assert.equal(statementsOnLine('table = {"a": f(1), "b": g(2)}\n', '.py', 1), 1);
  const dir = workProject();
  assert.equal(writeAt(dir, 'code-shape.mjs', 'tools/a.py', 'kinds = {row.kind for row in table(rows) if keep(row)}\nprint(kinds)\n').status, 0);
  assert.equal(writeAt(dir, 'code-shape.mjs', 'tools/b.py', 'a = f(1); b = g(2); c = h(3)\n').status, 2);
});

test('KF-27: a one-statement lambda counts the same in a list as in a call', () => {
  const text = 'void f()\n{\n    judge ("signal", base, [&] { return timeProgram (*engine, plan, blocks, 0.25f); }),\n    judge ("silence", base, [&] { return timeProgram (*engine, plan, blocks, 0.0f); }),\n}\n';
  assert.equal(statementsOnLine(text, '.cpp', 3), 2);
  assert.equal(statementsOnLine(text, '.cpp', 4), 2);
  const dir = workProject();
  assert.equal(writeAt(dir, 'code-shape.mjs', 'src/a.cpp', text).status, 0);
  assert.equal(writeAt(dir, 'code-shape.mjs', 'src/b.cpp', 'void f()\n{\n    a(); b(); c();\n}\n').status, 2);
});

test('code-shape reports every line at fault at once, so one resend answers them all', () => {
  const dir = workProject();
  const wide = `    int x = ${'value + '.repeat(40)}1;\n`;
  const r = writeAt(dir, 'code-shape.mjs', 'src/a.cpp', `void f()\n{\n${wide}    ok();\n${wide}    a(); b(); c();\n}\n`);
  assert.equal(r.status, 2);
  for (const n of [3, 5]) assert.match(r.stderr, new RegExp(`line ${n} is \\d+ columns`));
  assert.match(r.stderr, /line 6 holds 3 statements/);
});
