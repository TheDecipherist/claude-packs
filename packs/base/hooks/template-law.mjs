#!/usr/bin/env node
// PreToolUse (Write|Edit|MultiEdit|NotebookEdit|Bash): anything "component" used more than once is a template (0.23.0: html, c++ and apps;
// a change, an update or a test is then made once, never per copy). A write that adds an element built by hand, in the shape of one that already
// exists in this file or another of this checkout, is refused (lib/elements.mjs: names and text stripped). A line marked `one-off:` with its
// reason is left alone, and so are tests, `protected` globs, generated and built code. The other files' shapes are kept between calls, keyed by
// time and size, so a write reads only what changed. `--selftest` proves it.
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { parametersOf } from './lib/code-shapes.mjs';
import { languageOf } from './lib/languages.mjs';
import { nearCopy } from './lib/near-copies.mjs';
import { EXTS, readText, repoIndex } from './lib/repo-index.mjs';
import { TEMPLATE, TESTS, copiesNeeded, skippedBy } from './lib/elements.mjs';
import { asHook, isMain } from './lib/hook-log.mjs';
import { judgeEvent } from './lib/writes.mjs';
import { checkoutRoot, claudeRoot } from './lib/project.mjs';
import { readLayout } from './lib/layout.mjs';
import { matchesAny } from './lib/glob.mjs';
import { bashOf, editOf, runHook, scratchProject, verdicts, writeOf } from './lib/selftest.mjs';


// { id: [{ file, line, what }] } over every other file.
function copiesElsewhere(entries, rel) {
  const by = new Map();
  for (const [file, e] of Object.entries(entries)) {
    if (file === rel) continue;
    for (const [id, line, what] of e.shapes) { if (!by.has(id)) by.set(id, []); by.get(id).push({ file, line, what }); }
  }
  return by;
}

const AGAIN = { markup: (s) => `${s.what} built by hand again, the same element with other names and text`, setup: (s) => `${s.what} set up by hand again, the same set-up with other names`,
  run: () => 'code the repo already has, the same statements with other names', rows: (s) => `${s.nodes} calls of ${s.what} in a row, a table written as code` };

function refusal(s, w, rel, root, elsewhere, after) {
  const where = [...after.filter((x) => x.id === s.id).map((x) => `${rel}:${x.line}`), ...elsewhere.map((x) => `${x.file}:${x.line}`)];
  const differs = s.kind === 'run' && elsewhere.length ? parametersOf(s.id, w.after, readFileSync(join(root, elsewhere[0].file), 'utf8'), extname(rel)) : [];
  const params = s.kind !== 'run' || !elsewhere.length ? '' : differs.length ? `It differs only in: ${differs.slice(0, 6).join(', ')}. Those are the parameters.\n` : 'It is the same, every name: move it to one place and call it.\n';
  return `this is ${AGAIN[s.kind](s)}:\n  ${where.slice(0, 6).join('\n  ')}\n${params}` +
    `Anything used more than once is one template: make it ${TEMPLATE[s.kind]}, so a change or a test is made once (skill: make-it-a-template).\n` +
    'Take the copies out first, then write the template: it is refused while they stand. If this one truly differs, say so above it: `one-off: <reason>`.\n';
}

const sameLanguage = (rel, file) => languageOf(extname(rel)) === languageOf(extname(file));
const COMPOUND = /[a-z0-9][A-Z]|[a-z0-9]_[a-z0-9]/;   // a plain word (`count`, `read`) is in many files by chance
const CONVENTION = 3;                                  // a name in this many other files is a convention: `selftest`, `handler`

// What the write adds that was not there: the statements, in order, and the new definitions.
function addedTo(before, after) {
  const left = before.st.reduce((m, [h]) => m.set(h, (m.get(h) ?? 0) + 1), new Map());
  const statements = after.st.filter(([h]) => { const n = left.get(h) ?? 0; left.set(h, n - 1); return n <= 0; });
  const had = new Set(before.defs.map(([name]) => name));
  return { statements, defs: after.defs.filter(([name]) => !had.has(name) && COMPOUND.test(name)) };
}

function nearRefusal(hit) {
  return `this is close to code the repo already has: ${hit.matched} of ${hit.of} statements from line ${hit.line} match ${hit.file}:${hit.from}-${hit.to}, in order, with other names.\n` +
    `Anything used more than once is one template: make it ${TEMPLATE.run}, so a change or a test is made once (skill: make-it-a-template).\n` +
    'Take the copies out first, then write the template. If this one truly differs, say so above it: `one-off: <reason>`.\n';
}

function remadeRefusal(name, line, where) {
  return `${name} (line ${line}) already exists: ${where.map((x) => `${x.file}:${x.line}`).join(', ')}.\nCall it, and move it somewhere both can reach if it cannot be reached. ` +
    'If it does a different job, give it a name that says so. If it truly must exist twice, say so above it: `one-off: <reason>`.\n';
}

function remade(defs, entries, rel) {
  for (const [name, line] of defs) {
    const where = Object.entries(entries).filter(([f]) => f !== rel && sameLanguage(rel, f)).flatMap(([file, e]) => (e.defs ?? []).filter(([n]) => n === name).map(([, l]) => ({ file, line: l })));
    if (where.length && where.length < CONVENTION) return remadeRefusal(name, line, where);
  }
  return null;
}

function judgeWrite(w, rel) {
  if (w.op === 'delete' || w.after === null || w.after === undefined || !EXTS.has(extname(w.path)) || matchesAny(rel, TESTS)) return null;
  const before = readText(w.before ?? '', rel);
  const after = readText(w.after, rel);
  const count = (list) => list.reduce((m, s) => m.set(s.id, (m.get(s.id) ?? 0) + 1), new Map());
  const was = count(before.shapes);
  const here = count(after.shapes);
  const fresh = after.shapes.filter((s, i) => after.shapes.findIndex((x) => x.id === s.id) === i && here.get(s.id) > (was.get(s.id) ?? 0));
  const { statements, defs } = addedTo(before, after);
  if (!fresh.length && !statements.length && !defs.length) return null;
  const skip = skippedBy(readLayout(claudeRoot(w.path)));
  if (matchesAny(rel, skip)) return null;
  const root = checkoutRoot(w.path);
  const entries = repoIndex(root, [...TESTS, ...skip]);
  const others = copiesElsewhere(entries, rel);
  for (const s of fresh) {
    const elsewhere = others.get(s.id) ?? [];
    const oneName = new Set([s.what, ...elsewhere.map((x) => x.what)]).size === 1;
    if (here.get(s.id) + elsewhere.length >= copiesNeeded(s, oneName)) return refusal(s, w, rel, root, elsewhere, after.shapes);
  }
  const near = nearCopy(statements, Object.entries(entries).filter(([f]) => f !== rel && sameLanguage(rel, f)).map(([file, e]) => ({ file, st: e.st ?? [] })));
  return near ? nearRefusal(near) : remade(defs, entries, rel);
}

const main = (text) => judgeEvent(text, { name: 'template-law', write: judgeWrite });

function selftest() {
  const hook = new URL(import.meta.url).pathname;
  const card = (t) => `<div class="card"><h3 class="t">${t}</h3><p>${t} text</p><button type="button">Go</button></div>\n`;
  const knob = (n) => `  ${n}.setRange (0.0, 1.0);\n  ${n}.setValue (0.5);\n  ${n}.setSliderStyle (Rotary);\n  addAndMakeVisible (${n});\n`;
  // Stellix's way: many statements on one line, and a helper copied from file to file with other names.
  const oneLine = (n) => `  ${n}.setRange (0.0, 1.0); ${n}.setValue (0.5); ${n}.setSliderStyle (Rotary); addAndMakeVisible (${n});\n`;
  const reader = (f, id) => `auto ${f} = [this](const std::string& ${id}) {\n  const auto& L = shown(); float best = 0.0f;\n  for (const auto& c : L.controls) if (c.id == ${id}) best = c.box.getCentreX() * float(getWidth());\n  if (best > 10.0f) log(best, "${id}");\n  const auto p = at(best, 2.5f); pressAt(p); releaseAt(p); return best;\n};\n`;
  const rows = (s) => `void seed(Entry& e) {\n${[...'abcdef'].map((k) => `  set(e, "${s}.${k}", 0.0f);\n`).join('')}}\n`;
  const table = (t) => `const Row ${t}[] = {\n  { "a", 1, 2, 3 },\n  { "b", 4, 5, 6 },\n  { "c", 7, 8, 9 },\n  { "d", 1, 2, 3 },\n  { "e", 4, 5, 6 },\n  { "f", 7, 8, 9 },\n};\n`;
  // A near copy: the same steps with a line changed every few lines, so no stretch of it is exact.
  const steps = (n, odd) => `def ${n}(rows, limit):\n${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => `    value_${i} = compute_step(rows[${i}], limit, scale=${i}, name="k${i}") + other(rows, ${i})\n${i % 3 === 2 && odd ? `    note_${i}(limit)\n` : ''}`).join('')}    return rows\n`;
  const dir = scratchProject({ 'src/steps.py': steps('load_all', false), 'src/dates.ts': 'export function formatDateRange(a, b) {\n  return a + b;\n}\n', 'src/a.html': card('One'), 'src/ctl.cpp': `void build() {\n${knob('cutoff')}}\n`, 'tests/t.cpp': `void t() {\n${knob('probe')}}\n`, 'src/gate_a.h': reader('pressOf', 'id'), 'src/rows.cpp': table('kOne'), 'vendored/gate.h': reader('tapOf', 'key'), 'kept/gate.h': reader('holdOf', 'key'),
    '.claude/layout.json': JSON.stringify({ folders: { vendored: { path: 'vendored', kind: 'copy' } }, guards: { templates: { exclude: ['kept/**'] } } }) });
  const w = (file, content) => runHook(hook, dir, writeOf(join(dir, file), content));
  return verdicts('template-law', [
    ['a second card, in another file', w('src/b.html', card('Two')), 2],
    ['two cards in one new file', w('src/c.tsx', card('A') + card('B')), 2],
    ['a second hand-built control, other names', w('src/more.cpp', `void more() {\n${knob('resonance')}}\n`), 2],
    ['the same control twice in one file', w('src/two.cpp', `void two() {\n${knob('a1')}\n  int x;\n${knob('b1')}}\n`), 2],
    ['the same control, many statements on a line', w('src/line.cpp', `void line() {\n${oneLine('drive')}}\n`), 2],
    ['a helper copied with other names', w('src/gate_b.h', reader('tapOf', 'key')), 2],
    ['a table written as calls', w('src/seed.cpp', rows('seed')), 2],
    ['a table as data rows', w('src/rows2.cpp', table('kTwo')), 0],
    ['a copy tree', w('vendored/more.h', reader('dropOf', 'name')), 0],
    ['a tree the layout excludes', w('kept/more.h', reader('dropOf', 'name')), 0],
    ['a near copy, with a line added every few lines', w('src/steps2.py', steps('load_more', true)), 2],
    ['a function the repo already has, written again', w('src/other.ts', 'export function formatDateRange(x, y) {\n  return `${x} to ${y}`;\n}\n'), 2],
    ['a plain-word name is not judged', w('src/plain.ts', 'export function render(x) {\n  return x;\n}\n'), 0],
    ['the same name in another language', w('src/dates.py', 'def formatDateRange(a, b):\n    return a\n'), 0],
    ['the component used three times', w('src/use.tsx', '<Card t="a" />\n<Card t="b" />\n<Card t="c" />\n'), 0],
    ['a list from one .map()', w('src/list.tsx', 'rows.map((r) => (<tr key={r.id} class="row"><td class="t">{r.t}</td><td>{r.x}</td></tr>))\n'), 0],
    ['one element is no template', w('src/one.html', '<section class="hero"><h1 class="big">Hi</h1><p>x</p><a href="/">y</a></section>\n'), 0],
    ['a bare list', w('src/ul.html', '<ul><li>a</li><li>b</li><li>c</li></ul>\n'), 0],
    ['data rows are not elements', w('src/d.ts', "const R = [\n  { id: 'a', label: 'b' },\n  { id: 'c', label: 'd' },\n];\n"), 0],
    ['calls on one object are one set-up', w('src/ctx.ts', 'ctx.save();\nctx.fill();\nctx.restore();\nf();\nctx.save();\nctx.fill();\nctx.restore();\n'), 0],
    ['a marked one-off', w('src/odd.html', `<!-- one-off: the print view -->\n${card('Odd')}`), 0],
    ['a test file', w('tests/x_test.cpp', `void x() {\n${knob('q')}}\n`), 0],
    ['an edit that adds no copy', runHook(hook, dir, editOf(join(dir, 'src/a.html'), 'One text', 'Uno text')), 0],
    ['a heredoc that adds a copy', runHook(hook, dir, bashOf(`cat > src/h.html <<'EOF'\n${card('H')}EOF`, dir)), 2],
    ['another project is not ours', runHook(hook, dir, writeOf(join(dir, '..', 'elsewhere', 'x.html'), card('X'))), 0],
  ]);
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? selftest() : await asHook('template-law', main));
