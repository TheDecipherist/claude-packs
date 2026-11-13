// docs/workorders/typescript/report.md, showcase.md and docs/whats-new-in-2.0.md (W11 items 2 and 3): the report's rows cite files that exist,
// every step has its rows, and the two public pages carry no number that is not in a report row they cite.
// Evidence under build/ exists only on the machine that ran the order: it is read when build/evidence is present
// (REPORT_BUILD_DIR names another build folder to read it from), and only the tracked files are checked otherwise.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { gitLines } from '../../../packs/base/hooks/lib/git-run.mts';
import { readText } from '../../../packs/base/hooks/lib/files.mts';

const KIT = fileURLToPath(new URL('../../..', import.meta.url));
const ORDER = join(KIT, 'docs/workorders/typescript');
const BUILD = process.env['REPORT_BUILD_DIR'] ?? join(KIT, 'build');
const HAS_EVIDENCE = existsSync(join(BUILD, 'evidence'));
const STEPS = ['W0', 'W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W8.8', 'W9', 'W10', 'W10b', 'W11.0', 'W11.1'];

const text = (path: string): string => readText(path) ?? assert.fail(`${path} is missing`);
const report = text(join(ORDER, 'report.md'));
const tracked = new Set(gitLines(['ls-files'], { cwd: KIT, env: process.env }));
const trackedNames = new Set([...tracked].map((p) => basename(p)));

/** A row of the report: its id, its text (the continuation lines too) and the section it belongs to. */
interface Row { id: string; section: string; body: string }

/** Numbered rows under a heading that starts with a step id (`## W3. ...` gives W3-1), and table rows that start with `| T-x |`. */
function rowsOf(md: string): Row[] {
  const rows: Row[] = [];
  let section = '';
  let current: Row | null = null;
  for (const line of md.split('\n')) {
    const heading = /^## ((?:W\d+b?(?:\.\d+)?|[A-Z])(?=\.? ))/.exec(line);
    if (line.startsWith('## ')) { section = heading ? heading[1]! : ''; current = null; continue; }
    const numbered = /^(\d+)\. /.exec(line);
    const table = /^\| ([A-Z]-[a-z0-9]+) \|/.exec(line);
    if (section && numbered) { current = { id: `${section}-${numbered[1]}`, section, body: line }; rows.push(current); }
    else if (table) { current = { id: table[1]!, section: 'T', body: line }; rows.push(current); }
    else if (current && /^\s+\S/.test(line)) current.body += `\n${line}`;
    else current = null;
  }
  return rows;
}

const rows = rowsOf(report);
const byId = new Map(rows.map((r) => [r.id, r]));

/** The backticked tokens of a text that name a file: they have a known extension and no placeholder. */
function filesIn(md: string): string[] {
  const out: string[] = [];
  for (const m of md.matchAll(/`([^`\s]+)`/g)) {
    const token = m[1]!.replace(/[,;:)]+$/, '');
    if (token.startsWith('.') || /[<>*]|\.\.\./.test(token)) continue;
    if (/^[\w./-]+\.(md|json|txt|log|mts|cts|mjs|go|py|tsv|jsonl|svg|sh)$/.test(token) || /^(build|docs|test|scripts|packs|lib)\/[\w./-]+\/$/.test(token)) out.push(token);
  }
  return out;
}

/** Where a cited name lives. Returns null when it must not be checked here (build/ evidence on a machine without it). */
function exists(token: string): boolean | null {
  if (token.startsWith('build/')) return HAS_EVIDENCE ? existsSync(join(BUILD, token.slice('build/'.length))) : null;
  const candidates = [token, `docs/workorders/typescript/${token}`, `docs/workorders/typescript/agents/${token}`];
  if (candidates.some((c) => existsSync(join(KIT, c)))) return true;
  return !token.includes('/') && trackedNames.has(token);
}

test('every file the report cites exists (build/ evidence only where build/evidence is present)', () => {
  const missing = [...new Set(filesIn(report))].filter((t) => exists(t) === false);
  assert.deepEqual(missing, [], `report.md cites ${missing.length} files that do not exist`);
});

test('every step has at least three numbered rows and each row cites a file', () => {
  for (const step of STEPS) {
    const own = rows.filter((r) => r.section === step);
    assert.ok(own.length >= 3, `${step} has ${own.length} rows, wanted 3 or more`);
    const bare = own.filter((r) => filesIn(r.body).length === 0).map((r) => r.id);
    assert.deepEqual(bare, [], `${step}: rows citing no file`);
  }
});

test('the comparison table holds the twelve rows (a) to (l), each with a before, an after and a ratio', () => {
  const table = rows.filter((r) => r.section === 'T');
  for (const letter of 'abcdefghijkl') {
    const own = table.filter((r) => r.body.includes(`(${letter})`));
    assert.ok(own.length >= 1, `row (${letter}) is missing from the comparison table`);
  }
  for (const row of table) {
    const cells = row.body.split('|').map((c) => c.trim());
    assert.ok(cells.slice(3, 6).every((c) => c.length > 0), `${row.id} has an empty cell`);
  }
  assert.match(report, /^row \(a\): measured by the lead, build\/evidence\/W11\/suite-runs\.txt$/m);
});

test('the missed targets have their own rows', () => {
  assert.ok(rows.filter((r) => r.section === 'M').length >= 10);
});

/** A public page's line is held to its cited rows: `<!-- row: T-d, W9-1 -->` at the end names them. */
const SKIP = new Set(['2.0', '2.0.0', '2.0.1', '1.9', '1.9.0', '1.8.2', '22']);

function numbersOf(line: string): string[] {
  const bare = line.replace(/<!--.*?-->/g, '').replace(/\b\d+\.\d+\.\d+\b/g, '').replace(/`[^`]*`/g, '').replace(/\]\([^)]*\)/g, ']');
  return [...bare.matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) => m[0].replace(/,$/, '').replace(/,/g, '')).filter((n) => !SKIP.has(n));
}

function untraced(md: string): string[] {
  const bad: string[] = [];
  let fenced = false;
  md.split('\n').forEach((line, i) => {
    if (line.startsWith('```')) { fenced = !fenced; return; }
    if (fenced || line.startsWith('#')) return;
    const nums = numbersOf(line);
    if (nums.length === 0) return;
    const cited = [...(/<!--\s*row:\s*([^>]*?)\s*-->/.exec(line)?.[1] ?? '').split(/[,\s]+/)].filter(Boolean);
    const unknown = cited.filter((id) => !byId.has(id));
    if (cited.length === 0 || unknown.length > 0) { bad.push(`line ${i + 1}: ${cited.length === 0 ? 'no row cited' : `unknown row ${unknown.join(', ')}`}`); return; }
    const source = cited.map((id) => byId.get(id)!.body.replace(/,(?=\d)/g, '')).join('\n');
    for (const n of nums) if (!source.includes(n)) bad.push(`line ${i + 1}: ${n} is in none of ${cited.join(', ')}`);
  });
  return bad;
}

test('the report check itself: a number with no row, and a number not in its row, are both found', () => {
  assert.equal(untraced('It took 99 s.').length, 1);
  assert.equal(untraced('It took 99 s. <!-- row: T-d -->').length, 1);
  assert.equal(untraced('It took 29.5 s. <!-- row: T-d -->').length, 0);
  assert.equal(untraced('It took 29.5 s. <!-- row: T-zz -->').length, 1);
});

test('showcase.md holds ten wins, each before, after and factor, each traced to a row', () => {
  const md = text(join(ORDER, 'showcase.md'));
  const wins = md.split('\n').filter((l) => /^## \d+\. /.test(l));
  assert.equal(wins.length, 10, 'ten wins');
  assert.deepEqual(untraced(md), [], 'numbers without a row in showcase.md');
  for (const part of ['Before', 'After', 'Factor']) assert.equal((md.match(new RegExp(`^\\*\\*${part}:\\*\\*`, 'gm')) ?? []).length, 10, `${part} on every win`);
});

test('whats-new-in-2.0.md traces every number to a report row and states every missed target', () => {
  const md = text(join(KIT, 'docs/whats-new-in-2.0.md'));
  assert.deepEqual(untraced(md), [], 'numbers without a row in whats-new-in-2.0.md');
  const missed = rows.filter((r) => r.section === 'M').map((r) => r.id);
  const left = missed.filter((id) => !new RegExp(`row:[^>]*\\b${id}\\b`).test(md));
  assert.deepEqual(left, [], 'missed targets the page does not state');
});

test('the public pages name no person', () => {
  for (const file of ['docs/workorders/typescript/showcase.md', 'docs/whats-new-in-2.0.md']) {
    assert.ok(!/\/Users\/|\/home\//.test(text(join(KIT, file))), `${file} holds a home path`);
  }
});
