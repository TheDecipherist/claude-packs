#!/usr/bin/env node
// PreToolUse (Write|Edit|MultiEdit|NotebookEdit|Bash): a kind is dispatched in ONE place (v7 additions, 0.11.0).
// When a write ADDS a `switch` on some kind (mode, type, action, format…) and another code file of the same checkout already
// switches on that kind, the kind's behaviour is being spread out: the next new kind then needs an edit in every one of those
// places. Refused: the kind's behaviour belongs in one object, table or class (rule: behaviour-lives-with-its-kind).
// Every write route (lib/writes.mjs judgeEvent); a file is judged against its own checkout (a worktree against the worktree);
// tests, `protected` globs, vendored and built folders are never scanned. `--selftest` proves it.
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { blankCode } from './lib/cpp-scan.mjs';
import { lookupMatches } from './lib/rust-scan.mjs';
import { CODE, TESTS, codeFiles } from './lib/elements.mjs';
import { matchesAny } from './lib/glob.mjs';
import { readLayout } from './lib/layout.mjs';
import { checkoutRoot, claudeRoot } from './lib/project.mjs';
import { bashOf, editOf, runHook, scratchProject, verdicts, writeOf } from './lib/selftest.mjs';
import { judgeEvent } from './lib/writes.mjs';
import { asHook, isMain, projectRoot } from './lib/hook-log.mjs';
import { fileURLToPath } from 'node:url';


const SWITCH = /\bswitch\s*\(\s*([^()]*?(?:\([^()]*\))?)\s*\)\s*\{/g;
const JUDGED = new Set([...CODE, '.rs']);
const FIX = 'Give each kind its own object, table entry or class (rule: behaviour-lives-with-its-kind), and call it from both places,\n' +
  'so a new kind is one new entry instead of an edit in every switch. In Rust, a table on an enum is a method on the enum.\n';

// The last word of each `case` label of the switch body that opens at `open`: `Kind::line` -> line, `'line'` -> line.
function labelsOf(code, text, open) {
  let depth = 0;
  let close = open;
  for (; close < code.length; close += 1) {
    if (code[close] === '{') depth += 1;
    else if (code[close] === '}' && --depth === 0) break;
  }
  const labels = new Set();
  for (const m of code.slice(open, close).matchAll(/\bcase\s+([^:]*(?:::[^:]*)*?)\s*:(?!:)/g)) {
    const at = open + m.index + m[0].indexOf(m[1]);
    labels.add(text.slice(at, at + m[1].length).replace(/['"`]/g, '').split(/::|\./).pop().trim());
  }
  return labels;
}

// Each switch: the kind it dispatches on, the last name in its expression (args.kind -> kind, p->mode() -> mode), and its case labels.
// Rust's `match` is held to every variant by the compiler, so only a lookup table on an enum counts there (lib/rust-scan.mjs).
export function switchesOf(text, ext = '') {
  if (ext === '.rs') return lookupMatches(text);
  const out = [];
  const code = blankCode(text);
  for (const m of code.matchAll(SWITCH)) {
    const kind = m[1].replace(/\(\s*\)$/, '').split(/\?\.|\.|->|::/).pop().trim();
    if (/^[A-Za-z_$][\w$]{2,}$/.test(kind)) out.push({ kind, labels: labelsOf(code, text, m.index + m[0].length - 1) });
  }
  return out;
}

// One kind or two? The bare word `kind` says little: a path step and an engine block both have one (KF-35). Two switches that share a case are on one
// kind; two whose cases are all different are not; a switch with no case to read is judged by the name.
const sameKind = (a, b) => a.kind === b.kind && (!a.labels.size || !b.labels.size || [...a.labels].some((l) => b.labels.has(l)));
const count = (list) => list.reduce((m, s) => m.set(s.kind, (m.get(s.kind) ?? 0) + 1), new Map());

// The switches on a kind a write switches on more often than before.
export function newSwitches(before, after, ext = '') {
  const was = count(switchesOf(before, ext));
  const now = switchesOf(after, ext);
  const grown = new Set([...count(now)].filter(([k, n]) => n > (was.get(k) ?? 0)).map(([k]) => k));
  return now.filter((s) => grown.has(s.kind));
}

// { kind -> [files] }: the other code files of the checkout that already switch on each kind.
export function elsewhere(root, selfRel, switches, layout = readLayout(root)) {
  const skip = [...TESTS, ...(layout.protected ?? [])];
  const found = new Map();
  for (const rel of codeFiles(root, skip, JUDGED)) {
    if (rel === selfRel) continue;
    const there = switchesOf(readFileSync(join(root, rel), 'utf8'), extname(rel));
    for (const s of switches) if (there.some((t) => sameKind(s, t)) && !found.get(s.kind)?.includes(rel)) found.set(s.kind, [...(found.get(s.kind) ?? []), rel]);
  }
  return found;
}

// One write: null when it adds no second place for a kind; else the refusal.
function judgeWrite(w, rel) {
  if (w.op === 'delete' || w.after === null || w.after === undefined || !JUDGED.has(extname(w.path)) || matchesAny(rel, TESTS)) return null;
  const added = newSwitches(w.before ?? '', w.after, extname(w.path)).filter((s) => !s.owned); // a method on the enum is where the table belongs
  if (added.length === 0) return null;
  const twice = added.find((s, i) => added.some((t, j) => i !== j && sameKind(s, t) && s.labels.size && t.labels.size));
  if (twice) return `${rel} branches on "${twice.kind}" twice in this file.\n${FIX}`;
  const found = elsewhere(checkoutRoot(projectRoot(), w.path, process.cwd()), rel, added, readLayout(claudeRoot(projectRoot(), w.path, process.cwd())));
  if (found.size === 0) return null;
  const lines = [...found].map(([k, files]) => `  "${k}" is already switched on in: ${files.slice(0, 5).join(', ')}`).join('\n');
  return `${rel} adds a second place that branches on the same kind.\n${lines}\n${FIX}`;
}

const main = (text) => judgeEvent(text, { name: 'dispatch-once', write: judgeWrite });

function selftest() {
  const hook = fileURLToPath(import.meta.url);
  const rustTable = (kind, name) => `pub fn ${name}(s: &${kind}) -> u8 {\n    match s {\n        ${kind}::Open => 1,\n        ${kind}::Paid => 2,\n        ${kind}::Closed => 3,\n        ${kind}::Low => 4,\n        ${kind}::Mid => 5,\n    }\n}\n`;
  const dir = scratchProject({
    'src/state.rs': `pub enum State { Open, Paid, Closed, Low, Mid }\n${rustTable('State', 'label')}`,
    'src/render.cpp': 'float draw (Shape& s) { switch (s.mode) { case Mode::line: return 1.0f; default: return 0.0f; } }\n',
    'tests/render_test.cpp': 'void t (Shape& s) { switch (s.format) { default: break; } }\n',
  });
  const w = (file, content) => runHook(hook, dir, writeOf(join(dir, file), content)).status;
  return verdicts('dispatch-once', [
    ['a new switch on a kind switched in another file', w('src/label.cpp', 'void label (Shape& s) { switch (s.mode) { default: break; } }\n'), 2],
    ['a switch on a kind switched nowhere else', w('src/order.cpp', 'void order (Row& r) { switch (r.direction) { default: break; } }\n'), 0],
    ['the same file is not "elsewhere"', runHook(hook, dir, editOf(join(dir, 'src/render.cpp'), 'return 1.0f;', 'return 2.0f;')).status, 0],
    ['a kind switched only in a test is not dispatch', w('src/save.cpp', 'void save (Shape& s) { switch (s.format) { default: break; } }\n'), 0],
    ['a test file may switch on any kind', w('tests/label_test.cpp', 'void t (Shape& s) { switch (s.mode) { default: break; } }\n'), 0],
    ['a switch in a comment or string is not a switch', w('src/note.ts', '// switch (x.mode) {\nconst s = "switch (x.mode) {";\n'), 0],
    ['the kind is the last name in the expression', w('src/args.ts', 'function f(args) { switch (args?.shape.mode) { default: } }\n'), 2],
    ['a heredoc that adds a second switch', runHook(hook, dir, bashOf("cat > src/b.cpp <<'EOF'\nvoid b (Shape& s) { switch (s.mode) { default: break; } }\nEOF", dir)).status, 2],
    ['a kind of the same name with other cases is another kind (KF-35)', w('src/path.cpp', 'void p (Step& s) { switch (s.mode) { case Pen::up: break; } }\n'), 0],
    ['one case shared is the same kind', w('src/other.cpp', 'void o (Shape& s) { switch (s.mode) { case Mode::line: break; } }\n'), 2],
    ['twice in one new file', w('src/twice.cpp', 'void a (S& s) { switch (s.pen) { case Pen::up: break; } }\nvoid b (S& s) { switch (s.pen) { case Pen::up: break; } }\n'), 2],
    ['another project is not ours', runHook(hook, dir, writeOf(join(dir, '..', 'elsewhere', 'x.cpp'), 'void x (S& s) { switch (s.mode) {} }\n')).status, 0],
    ['Rust: a second lookup table on an enum, outside it', w('src/colour.rs', rustTable('State', 'colour')), 2],
    ['Rust: the enum\'s own file keeps its tables', w('src/state2.rs', `pub enum Level { Low, Mid, High }\n${rustTable('Level', 'label')}${rustTable('Level', 'rank')}`), 0],
    ['Rust: a match that does work is good Rust', w('src/step.rs', 'pub fn step(s: &State) {\n    match s {\n        State::Open => pay(),\n        State::Paid => ship(),\n        State::Closed => close(),\n    }\n}\n'), 0],
    ['Rust: a table of true and false is a predicate', w('src/open.rs', 'pub fn open(s: &State) -> bool {\n    match s {\n        State::Open => true,\n        State::Paid => false,\n        State::Closed => false,\n    }\n}\n'), 0],
  ]);
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? selftest() : await asHook('dispatch-once', main));
