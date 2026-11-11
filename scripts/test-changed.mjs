#!/usr/bin/env node
// The changed-only test run for working runs ("the kit's test suite should only test things that have changed?").
// Run against the trunk (--base origin/<trunk>), it is the gate before landing and before a release (1.3.0); the full `npm test`
// runs only when the user asks for a full run, and this run says so every time.
//
//   npm run test:changed            or   node scripts/test-changed.mjs [--base <ref>] [--dry-run] [--root <repo>]
//
// The files changed since the base (git diff against it: committed, staged and unstaged; plus untracked files) are mapped to the
// test files that cover them, and each choice is printed with its reason:
//   - a test file that changed runs;
//   - a test covers a file it imports (static import, import(), new URL(..., import.meta.url)), directly or through other modules
//     (the CLI's bin imports lib/, so every test that runs the CLI covers lib/);
//   - a test covers a file it names: a path literal ('../packs/gpu-painter/skills/', 'packs/base/pack.json') covers what is under
//     it, a distinctive basename ('git-guard.mjs') covers the file of that name;
//   - the table below, for what no import or name shows: pack files reach a project only through an install.
// Every run uses the fresh-tmp preload (running without it was KWB-2's cause).
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson } from '../packs/base/hooks/lib/json.mjs';
import { coreBudget, projectLayout } from '../packs/base/hooks/lib/core-budget.mjs';
import { PRESETS } from '../lib/packs.mjs';
import { changedNames, usesAny } from './changed-functions.mjs';
export { changedNames };

const SELF = fileURLToPath(import.meta.url);
const posix = (p) => p.split(sep).join('/');

// What no import or name shows. `tests` picks the test files by their text. A test installs through the CLI itself or through
// a test helper that runs it (kit-cli for most; worktree-rig, whose project() runs init, for the worktree tests).
const INSTALLING_HELPERS = ['bin/claude-packs.mjs', './kit-cli.mjs', './worktree-rig.mjs'];
const installs = (text) => INSTALLING_HELPERS.some((h) => text.includes(h)) && /['"](init|new|add|update|update-all)['"]/.test(text);

// The text of a test that brings a pack in: its name, a preset that holds it, a configuration that takes it (by --config; a
// configuration's own pack also comes with the packs it offers), or a walk over every configuration (KWB-41).
function brings(root, pack) {
  const words = new Set([pack]);
  const configs = [];
  const dir = join(root, 'configurations');
  for (const name of existsSync(dir) ? readdirSync(dir) : []) {
    const c = readJson(join(dir, name, 'config.json'));
    if (c.packs.always.includes(pack)) for (const p of c.packs.choose) words.add(p);
    if ([...c.packs.always, ...c.packs.choose].includes(pack)) configs.push(name);
  }
  for (const [preset, packs] of Object.entries(PRESETS)) if (packs.some((p) => words.has(p))) words.add(preset);
  return new RegExp(`['"](?:${[...words].join('|')})['"]|--config['"]?,?\\s*['"]?(?:${configs.join('|') || '$^'})\\b|['"]configurations['"]`);
}

// What a change can break, by what kind of change it is (KWB-166); a changed hook also proves its own selftest (selftestsOf).
const SHAPE = (status) => status === 'A' || status === 'D' || status === 'R';
const packOf = (c) => (c.startsWith('packs/') ? c.split('/')[1] : 'base');
const noopOf = (text, changed, root) => /noop/.test(text) && /updated\(/.test(text) && (packOf(changed) === 'base' || brings(root, packOf(changed)).test(text));
// No change picks every test that installs (the user: "There is no way we touch every single file every time just because we touch
// base"). A pack's file changes what an install holds, and only noop (every installed file listed), the counts (a file gained or
// lost) and the worktree cases (every installed hook has one) read that; a configuration or a profile reaches the tests that bring
// it in; the installer's own code (lib/) reaches its tests through their imports and names.
export const TABLE = [
  { files: /^package\.json$/, why: 'runs every test (its scripts, its dependencies)', tests: () => true },
  { files: /^test\/fresh-tmp\.mjs$/, why: 'the preload: its own test (every test loads it; this one checks what it gives them)', tests: (text) => /test\/fresh-tmp\.mjs itself|The preload itself/.test(text) },
  { files: /^packs\//, why: 'an installed file changed: noop holds every installed file and every change to one listed', tests: noopOf },
  { files: /^packs\/[\w-]+\/(rules|checks|hooks|skills)\//, when: (c, status) => SHAPE(status), why: 'a pack gained or lost a rule, check, hook or skill: the tests that hold the true counts',
    tests: (text) => /true counts/.test(text) },
  { files: /^packs\/[\w-]+\/(hooks\/[\w-]+\.(mjs|py)|pack\.json)$/, when: (c, status) => SHAPE(status) || c.endsWith('pack.json'), why: 'a hook added, removed or registered: every installed hook has its worktree case',
    tests: (text) => /every installed hook needs a worktree case/.test(text) },
  { files: /^configurations\//, why: 'a configuration: the tests that bring it in', tests: (text, changed, root) => installs(text) && new RegExp(`--config['"]?,?\\s*['"]?${changed.split('/')[1]}\\b|['"]configurations['"]`).test(text) },
  // a module of the CLI: the tests about it (named after it); a test that only runs its command on the way (every install runs
  // doctor) uses it and does not check it (KWB-166)
  { files: /^lib\/[\w-]+\.mjs$/, why: 'a module of the CLI: the tests named after it', tests: (text, changed, root, test) => new RegExp(`^test/${changed.slice(4, -4)}[.-]`).test(test) },
  { files: /^test\/fixtures\/[\w-]+\//, why: 'a fixture: the tests that read its folder', tests: (text, changed) => text.includes(`fixtures/${changed.split('/')[2]}`) },
  { files: /^planner\//, why: 'the planner skills claude.ai takes: the tests that read the planner folder (KWB-141)', tests: (text) => /join\(KIT, 'planner'\)/.test(text) },
  { files: /^global\//, why: 'the global part: the tests that run `global`', tests: (text) => /['"]global['"]/.test(text) },
];
// the CLI: it imports nearly all of lib/, so a chain through it reaches everything (KWB-166); and how far an import chain counts
const HUBS = new Set(['bin/claude-packs.mjs']);
const MAX_HOPS = 2;
const GENERIC = new Set(['SKILL.md', 'pack.json', 'package.json', 'layout.json', 'settings.json', 'README.md', 'CHANGELOG.md', 'selftest.mjs', 'index.mjs']);
const SKIP_DIRS = new Set(['.git', 'node_modules', 'worktrees', '.claude-packs-backup']);

function walk(root, dir = root) {
  return readdirSync(dir).flatMap((e) => {
    if (SKIP_DIRS.has(e)) return [];
    const abs = join(dir, e);
    return statSync(abs).isDirectory() ? walk(root, abs) : [posix(relative(root, abs))];
  });
}

// Relative specifiers a module reaches: imports and new URL(..., import.meta.url); a template keeps its text before `${`.
function references(root, rel) {
  const text = readFileSync(join(root, rel), 'utf8');
  const specs = [
    ...text.matchAll(/\bfrom\s+['"](\.{1,2}\/[^'"]*)['"]/g), ...text.matchAll(/\bimport\s*\(\s*['"`](\.{1,2}\/[^'"`$]*)/g),
    ...text.matchAll(/\bimport\s+['"](\.{1,2}\/[^'"]*)['"]/g), ...text.matchAll(/new URL\(\s*['"`](\.{1,2}\/?[^'"`$]*)/g),
  ].map((m) => m[1]);
  return specs.map((s) => posix(relative(root, resolve(root, dirname(rel), s)))).filter((p) => p && !p.startsWith('..'));
}

export function graph(root) {
  const files = walk(root);
  const modules = files.filter((f) => /\.(mjs|js)$/.test(f));
  const importers = new Map(); // file → [modules that reference it]
  for (const m of modules) {
    for (const ref of references(root, m)) {
      const targets = files.filter((f) => f === ref || (ref !== '' && f.startsWith(`${ref.replace(/\/$/, '')}/`)));
      for (const t of targets) importers.set(t, [...(importers.get(t) ?? []), m]);
    }
  }
  return { files, importers };
}

// changed: repo-relative paths; status: { path: 'A' | 'M' | 'D' | 'R' } from git (an untracked file is 'A'). Returns { chosen: Map(test → [reasons]), uncovered: [paths], tests: [all test files] }.
export function choose(root, changed, g = graph(root), status = {}, fnNames = {}) {
  const tests = g.files.filter((f) => /^test\/.*\.test\.mjs$/.test(f)).sort();
  const text = Object.fromEntries(tests.map((t) => [t, readFileSync(join(root, t), 'utf8')]));
  const chosen = new Map();
  const add = (t, why) => { if (!chosen.has(t)) chosen.set(t, []); if (!chosen.get(t).includes(why)) chosen.get(t).push(why); };
  const uncovered = [];
  const helpers = g.files.filter((f) => /^test\/.*\.mjs$/.test(f) && !/\.test\.mjs$/.test(f));
  const helperText = Object.fromEntries(helpers.map((h) => [h, readFileSync(join(root, h), 'utf8')]));
  const importsOf = (t) => new Set([...g.importers.entries()].filter(([, by]) => by.includes(t)).map(([f]) => f));
  const namesIt = (text, c) => { const b = c.split('/').pop(); return !GENERIC.has(b) && b.length > 5 && new RegExp(`['"\`]${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`).test(text); };
  for (const c of changed) {
    let hit = false;
    if (tests.includes(c)) { add(c, 'changed'); hit = true; }
    // importers, transitively, with the chain kept for the reason
    // a test covers what it imports itself or through one helper, never through the CLI hub, which imports nearly all of lib/ (KWB-166:
    // every test that runs the CLI "reached" every module; a module used everywhere is not a module every test checks)
    const seen = new Map([[c, null]]);
    const depth = new Map([[c, 0]]);
    const queue = [c];
    while (queue.length) {
      const f = queue.shift();
      if (HUBS.has(f) || depth.get(f) >= MAX_HOPS) continue;
      for (const m of g.importers.get(f) ?? []) if (!seen.has(m)) { seen.set(m, f); depth.set(m, depth.get(f) + 1); queue.push(m); }
    }
    const names = fnNames?.[c];   // KWB-166: the functions the diff touched in this module, when known
    // a bare or namespace import of the module uses all of it (`import '../lib/b.mjs'`, `import * as m from ...`)
    const whole = (t) => new RegExp(`import\\s*(?:\\*\\s*as\\s+\\w+\\s+from\\s*)?['"][^'"]*${c.split('/').pop().replace(/\./g, '\\.')}['"]`).test(text[t]);
    const usesChanged = (t) => !names || whole(t) || usesAny(text[t] + [...importsOf(t)].map((h) => helperText[h] ?? '').join('\n'), names);
    if (names && names.size === 0) { uncovered.push(`${c} (imports or comments only)`); continue; }
    for (const t of tests) if (t !== c && seen.has(t) && usesChanged(t)) {
      const chain = [];
      for (let f = seen.get(t); f; f = seen.get(f)) chain.push(f);
      add(t, chain.length > 1 ? `reaches ${c} through ${chain.slice(0, -1).join(' → ')}` : `reaches ${c}`); hit = true;
    }
    const base = c.split('/').pop();
    for (const t of tests) {
      if (seen.has(t)) continue; // already reached by import
      // a named FILE covers it; a folder a test builds a path from (`packs/`, `${KIT}/packs/base/`) covers nothing by itself (KWB-166)
      const named = [...text[t].matchAll(/['"`]((?:\.\.\/)?(?:packs|lib|bin|global|profiles|prompts|scripts|test|\.claude)\/[^'"`$]*)(.)/g)]
        .filter((m) => m[2] !== '$' && !m[1].endsWith('/') && /\.[\w]+$/.test(m[1]))
        .map((m) => m[1].replace(/^\.\.\//, '')).find((p) => c === p);
      if (named) { add(t, `names ${named === c ? c : `${named} (holds ${c})`}`); hit = true; }
      else if (!GENERIC.has(base) && base.length > 5 && new RegExp(`[/'"\`\\s]${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`\\s)]`).test(text[t])) { add(t, `names ${base} (${c})`); hit = true; }
    }
    // a helper under test/ that names the file (worktree-cases-commands.mjs names each hook) covers it for every test importing it
    for (const h of helpers) if (namesIt(helperText[h], c)) for (const t of tests) if (importsOf(t).has(h)) { add(t, `names ${c} through ${h}`); hit = true; }
    for (const row of TABLE) if (row.files.test(c) && (row.when?.(c, status[c] ?? 'M') ?? true)) for (const t of tests) if (row.tests(text[t], c, root, t)) { add(t, `${c}: ${row.why}`); hit = true; }
    if (!hit) uncovered.push(c);
  }
  return { chosen, uncovered, tests };
}

const git = (root, ...a) => spawnSync('git', ['-C', root, ...a], { encoding: 'utf8' });


// The hooks a change must prove with their own selftests (KWB-166): a changed hook, and every hook that imports a changed lib.
export function selftestsOf(root, changed, g = graph(root)) {
  const isHook = (f) => /^packs\/[\w-]+\/hooks\/[\w-]+\.(mjs|py)$/.test(f);
  const hooks = new Set(changed.filter(isHook));
  for (const c of changed.filter((f) => /^packs\/[\w-]+\/hooks\/lib\//.test(f))) {
    const seen = new Set([c]); const queue = [c];
    while (queue.length) for (const m of g.importers.get(queue.shift()) ?? []) if (!seen.has(m)) { seen.add(m); queue.push(m); if (isHook(m)) hooks.add(m); }
  }
  return [...hooks].filter((h) => existsSync(join(root, h))).sort();
}

// Each hook's selftest in a scratch .claude/hooks laid out as an install lays it (base's hooks and lib, then each pack's own),
// with no install and no doctor: seconds, not the 166 s a fresh install's doctor takes on the Mac. Returns the failures.
export function proveHooks(root, hooks, concurrency = 4) {
  if (!hooks.length) return [];
  const dir = join(mkdtempSync(join(tmpdir(), 'test-changed-hooks-')), '.claude', 'hooks');
  mkdirSync(dir, { recursive: true });
  for (const pack of ['base', ...new Set(hooks.map((h) => h.split('/')[1]))]) cpSync(join(root, 'packs', pack, 'hooks'), dir, { recursive: true });
  const run = (h) => new Promise((done) => {
    const file = join(dir, basename(h));
    const child = spawn(h.endsWith('.py') ? 'python3' : process.execPath, [file, '--selftest'], { cwd: dirname(dir), env: process.env });
    let out = '';
    child.stdout.on('data', (d) => { out += d; }); child.stderr.on('data', (d) => { out += d; });
    child.on('close', (code) => done({ hook: h, code, out: out.trim() }));
  });
  return (async () => {
    const results = [];
    const queue = [...hooks];
    await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, async () => { while (queue.length) results.push(await run(queue.shift())); }));
    return results;
  })();
}

/** { path: 'A' | 'M' | 'D' | 'R' } since base: git's name-status (a rename counts for both its paths), untracked files 'A' (KWB-166). */
export function changeStatus(root, base) {
  const status = {};
  for (const line of git(root, 'diff', '--name-status', '-M', base).stdout.split('\n').filter(Boolean)) {
    const [code, ...paths] = line.split('\t');
    for (const p of paths) status[p] = code[0];
  }
  for (const f of git(root, 'ls-files', '--others', '--exclude-standard').stdout.split('\n').filter(Boolean)) status[f] = 'A';
  return status;
}

export function changedFiles(root, base) {
  const diff = git(root, 'diff', '--name-only', base);
  if (diff.status !== 0) throw new Error(`git diff ${base} failed: ${diff.stderr.trim()}`);
  const untracked = git(root, 'ls-files', '--others', '--exclude-standard').stdout;
  return [...new Set(`${diff.stdout}\n${untracked}`.split('\n').map((l) => l.trim()).filter(Boolean))]
    .filter((f) => !f.startsWith('.claude/worktrees/') && f !== '.claude-packs-lock' && !f.startsWith('node_modules/')).sort();
}

// A manifest whose only change is its version lines: a release's bump, which no test depends on (KWB-41: it chose every test).
export function versionBumpOnly(root, base, file) {
  if (!/(^|\/)package(-lock)?\.json$/.test(file)) return false;
  const lines = git(root, 'diff', '-U0', base, '--', file).stdout.split('\n').filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l));
  return lines.length > 0 && lines.every((l) => /^[+-]\s*"version":/.test(l));
}

function defaultBase(root) {
  for (const trunk of ['main', 'master']) {
    const mb = git(root, 'merge-base', 'HEAD', trunk);
    if (mb.status === 0) return { ref: mb.stdout.trim(), label: `merge-base with ${trunk}` };
  }
  return { ref: 'HEAD', label: 'HEAD' };
}

export async function main(argv) {
  const o = { root: resolve(dirname(SELF), '..'), base: null, dry: false };
  for (let k = 0; k < argv.length; k += 1) {
    if (argv[k] === '--base') o.base = argv[++k];
    else if (argv[k] === '--root') o.root = resolve(argv[++k]);
    else if (argv[k] === '--dry-run') o.dry = true;
    else { console.error('usage: test-changed.mjs [--base <ref>] [--dry-run] [--root <repo>]'); return 2; }
  }
  const base = o.base ? { ref: o.base, label: o.base } : defaultBase(o.root);
  const touched = changedFiles(o.root, base.ref);
  const bumped = touched.filter((f) => versionBumpOnly(o.root, base.ref, f));
  const changed = touched.filter((f) => !bumped.includes(f));
  const status = changeStatus(o.root, base.ref);
  const fnNames = Object.fromEntries(changed.map((c) => [c, changedNames(o.root, base.ref, c)]).filter(([, n]) => n !== null));
  const { chosen, uncovered, tests } = choose(o.root, changed, undefined, status, fnNames);
  const proofs = selftestsOf(o.root, changed);
  const gate = 'This is a changed-only run. With --base origin/<trunk> this is the gate before landing and before a release; the full `npm test` runs only when the user asks.';
  console.log(`test:changed: base ${base.label} (${git(o.root, 'rev-parse', '--short', base.ref).stdout.trim()}), ${changed.length} changed file(s)`);
  for (const c of changed) console.log(`  ${c}`);
  if (bumped.length) console.log(`version bump only: ${bumped.join(', ')} (no test reads a version)`);
  console.log(`chose ${chosen.size} of ${tests.length} test files:`);
  for (const [t, why] of chosen) {
    const more = why.length > 3 ? `\n    (+${why.length - 3} more)` : '';
    console.log(`  ${t}\n    ${why.slice(0, 3).join('\n    ')}${more}`);
  }
  if (uncovered.length) console.log(`no test covers: ${uncovered.join(', ')}`);
  if (proofs.length) console.log(`selftests to prove (${proofs.length}): ${proofs.map((h) => basename(h)).join(', ')}`);
  if ((!chosen.size && !proofs.length) || o.dry) { console.log(gate); return 0; }
  // the changed hooks prove themselves first, in seconds; a red one stops the gate before the tests (the first error first)
  const proved = await proveHooks(o.root, proofs, coreBudget(process.env, projectLayout(o.root)));
  for (const r of proved) console.log(`  ${r.code === 0 ? 'ok  ' : 'FAIL'} ${basename(r.hook)}: ${r.out.split('\n').pop()}`);
  const red = proved.filter((r) => r.code !== 0);
  if (red.length) { for (const r of red) console.log(`\n${r.hook}:\n${r.out}`); console.log(gate); return 1; }
  if (!chosen.size) { console.log(gate); return 0; }
  // KWB-111: node runs test files at one less than the core count by default (17 here), and each file installs the kit and
  // runs its selftests: the gate timed out on load. It takes the machine's core budget instead.
  const concurrency = coreBudget(process.env, projectLayout(o.root));
  const args = ['--import', './test/fresh-tmp.mjs', '--test', `--test-concurrency=${concurrency}`, ...chosen.keys()];
  console.log(`running: node ${args.join(' ')}`);
  // NODE_TEST_CONTEXT is set when this runs under a test runner; passed on, the nested run reports to it and exits 0 on a failure.
  const { NODE_TEST_CONTEXT, ...env } = process.env;
  const r = spawnSync(process.execPath, args, { cwd: o.root, stdio: 'inherit', env });
  console.log(gate);
  return r.status ?? 1;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(SELF)) process.exit(await main(process.argv.slice(2)));
