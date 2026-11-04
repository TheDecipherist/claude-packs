// 0.25.0: every language has repetition and template things, because AI writes the same thing over and over. One row per language: a copy with
// other names has the shape of the original, and a comment or a data table has none. The language table is packs/base/hooks/lib/languages.mjs.
import { assert, cli, existsSync, fresh, hookRun, join, mkdirSync, readFileSync, test, writeFileSync } from './kit-cli.mjs';
import { codeShapes } from '../packs/base/hooks/lib/code-shapes.mjs';
import { definesOf } from '../packs/base/hooks/lib/near-copies.mjs';
import { LANGUAGES } from '../packs/base/hooks/lib/languages.mjs';

const steps = (call, assign, n, v) => [0, 1, 2, 3, 4, 5, 6, 7].map((i) => assign(`${v}${i}`, call(`${n}.compute${i % 2 ? 'A' : 'B'}`, `${v}${i}`, i))).join('\n');
const CLike = (head, tail, semi = ';') => (n, v) => `${head(n)}\n${steps((f, a, i) => `${f}(${a}, ${i}, "k${i}", other(${a}))`, (x, c) => `  ${x} = ${c}${semi}`, n, v)}\n${tail}\n`;

const SAMPLES = {
  '.py': (n, v) => `def ${n}(rows):\n${steps((f, a, i) => `${f}(${a}, ${i}, "k${i}", other(${a}))`, (x, c) => `    ${x} = ${c}`, n, v)}\n    return rows\n`,
  '.sh': (n, v) => `${n}() {\n${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `  curl -fsS --retry ${i} -o "$${v}${i}" "$url/${n}/${i}" || fail "${n} ${i}"`).join('\n')}\n}\n`,
  '.go': CLike((n) => `func ${n}(rows []Row) {`, '}', ''),
  '.rs': CLike((n) => `fn ${n}(rows: &[Row]) {`, '}'),
  '.java': CLike((n) => `  public void ${n}(Row rows) {`, '  }'),
  '.cs': CLike((n) => `  public void ${n}(Row rows) {`, '  }'),
  '.kt': CLike((n) => `fun ${n}(rows: Row) {`, '}', ''),
  '.swift': CLike((n) => `func ${n}(rows: Row) {`, '}', ''),
  '.rb': (n, v) => `def ${n}(rows)\n${steps((f, a, i) => `${f}(${a}, ${i}, "k${i}", other(${a}))`, (x, c) => `  ${x} = ${c}`, n, v)}\nend\n`,
  '.php': CLike((n) => `function ${n}($rows) {`, '}'),
  '.lua': (n, v) => `function ${n}(rows)\n${steps((f, a, i) => `${f}(${a}, ${i}, "k${i}", other(${a}))`, (x, c) => `  local ${x} = ${c}`, n, v)}\nend\n`,
};
const COMMENT = { '.py': '#', '.sh': '#', '.rb': '#', '.lua': '--' };
const idsOf = (text, ext) => new Set(codeShapes(text, ext).filter((s) => s.kind === 'run').map((s) => s.id));

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

test('suggest reads the project and init --auto installs exactly that', () => {
  const dir = fresh('auto-');
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'src/a.py'), 'print(1)\n');
  writeFileSync(join(dir, 'src/b.py'), 'print(2)\n');
  writeFileSync(join(dir, 'src/run.sh'), '#!/usr/bin/env bash\nset -euo pipefail\n');
  writeFileSync(join(dir, 'Dockerfile'), 'FROM x\n');
  const said = cli(dir, 'suggest');
  assert.equal(said.status, 0, said.stderr);
  assert.match(said.stdout, /configuration: python/);
  assert.match(said.stdout, /python +Python source: src\/a\.py/);
  assert.match(said.stdout, /shell +shell script: src\/run\.sh/);
  assert.match(said.stdout, /docker +file: Dockerfile/);
  assert.ok(!existsSync(join(dir, '.claude')), 'suggest writes nothing');
  const r = cli(dir, 'init', '--auto');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const lock = JSON.parse(readFileSync(join(dir, '.claude/claude-packs.lock.json'), 'utf8'));
  for (const p of ['python', 'shell', 'docker']) assert.ok(lock.packs.includes(p), p);
  assert.ok(!lock.packs.includes('mongo'));
});

test('the python and shell packs refuse what they say they refuse', () => {
  const dir = fresh('langs-');
  assert.equal(cli(dir, 'init', 'python', 'shell').status, 0);
  mkdirSync(join(dir, 'src'), { recursive: true });
  const write = (rel, content) => hookRun(dir, 'lesson-checks.mjs', { tool_name: 'Write', tool_input: { file_path: join(dir, rel), content } }).status;
  assert.equal(write('src/a.py', 'try:\n    run()\nexcept:\n    log()\n'), 2);
  assert.equal(write('src/b.py', 'try:\n    run()\nexcept ValueError:\n    log()\n'), 0);
  assert.equal(write('src/a.sh', '#!/usr/bin/env bash\nset -euo pipefail\nnow=`date`\n'), 2);
  assert.equal(write('src/b.sh', '#!/usr/bin/env bash\nset -euo pipefail\nnow=$(date)\n'), 0);
});
