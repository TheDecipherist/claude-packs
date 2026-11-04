#!/usr/bin/env node
// The changed-only test run for working runs (Tim: "the kit's test suite should only test things that have changed?").
// The full `npm test` stays the release gate; this one says so every time it runs.
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
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRESETS } from '../lib/packs.mjs';

const SELF = fileURLToPath(import.meta.url);
const posix = (p) => p.split(sep).join('/');

// What no import or name shows. `tests` picks the test files by their text.
const installs = (text) => (text.includes('bin/claude-packs.mjs') || text.includes('./kit-cli.mjs')) && /['"](init|new|add|update|update-all)['"]/.test(text);

// The text of a test that brings a pack in: its name, a preset that holds it, a configuration that takes it (by --config; a
// configuration's own pack also comes with the packs it offers), or a walk over every configuration (KWB-41).
function brings(root, pack) {
  const words = new Set([pack]);
  const configs = [];
  const dir = join(root, 'configurations');
  for (const name of existsSync(dir) ? readdirSync(dir) : []) {
    const c = JSON.parse(readFileSync(join(dir, name, 'config.json'), 'utf8'));
    if (c.packs.always.includes(pack)) for (const p of c.packs.choose) words.add(p);
    if ([...c.packs.always, ...c.packs.choose].includes(pack)) configs.push(name);
  }
  for (const [preset, packs] of Object.entries(PRESETS)) if (packs.some((p) => words.has(p))) words.add(preset);
  return new RegExp(`['"](?:${[...words].join('|')})['"]|--config['"]?,?\\s*['"]?(?:${configs.join('|') || '$^'})\\b|['"]configurations['"]`);
}

export const TABLE = [
  { files: /^(test\/fresh-tmp\.mjs|package\.json)$/, why: 'preloaded into, or runs, every test', tests: () => true },
  { files: /^packs\/(?!base\/)[\w-]+\//, why: 'a pack reaches a project through an install: the tests that bring this pack in',
    tests: (text, changed, root) => installs(text) && brings(root, changed.split('/')[1]).test(text) },
  { files: /^(packs\/base|profiles|prompts|configurations)\//, why: 'base, the seeds and the configurations reach every project: the tests that install packs', tests: (text) => installs(text) },
  { files: /^global\//, why: 'the global part: the tests that run `global`', tests: (text) => /['"]global['"]/.test(text) },
];
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

// changed: repo-relative paths. Returns { chosen: Map(test → [reasons]), uncovered: [paths], tests: [all test files] }.
export function choose(root, changed, g = graph(root)) {
  const tests = g.files.filter((f) => /^test\/.*\.test\.mjs$/.test(f)).sort();
  const text = Object.fromEntries(tests.map((t) => [t, readFileSync(join(root, t), 'utf8')]));
  const chosen = new Map();
  const add = (t, why) => { if (!chosen.has(t)) chosen.set(t, []); if (!chosen.get(t).includes(why)) chosen.get(t).push(why); };
  const uncovered = [];
  for (const c of changed) {
    let hit = false;
    if (tests.includes(c)) { add(c, 'changed'); hit = true; }
    // importers, transitively, with the chain kept for the reason
    const seen = new Map([[c, null]]);
    const queue = [c];
    while (queue.length) {
      const f = queue.shift();
      for (const m of g.importers.get(f) ?? []) if (!seen.has(m)) { seen.set(m, f); queue.push(m); }
    }
    for (const t of tests) if (t !== c && seen.has(t)) {
      const chain = [];
      for (let f = seen.get(t); f; f = seen.get(f)) chain.push(f);
      add(t, chain.length > 1 ? `reaches ${c} through ${chain.slice(0, -1).join(' → ')}` : `reaches ${c}`); hit = true;
    }
    const base = c.split('/').pop();
    for (const t of tests) {
      if (seen.has(t)) continue; // already reached by import
      const named = [...text[t].matchAll(/['"`]((?:\.\.\/)?(?:packs|lib|bin|global|profiles|prompts|scripts|test|\.claude)\/[^'"`$]*)/g)]
        .map((m) => m[1].replace(/^\.\.\//, '')).find((p) => c === p || c.startsWith(`${p.replace(/\/$/, '')}/`));
      if (named) { add(t, `names ${named === c ? c : `${named} (holds ${c})`}`); hit = true; }
      else if (!GENERIC.has(base) && base.length > 5 && new RegExp(`[/'"\`\\s]${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`\\s)]`).test(text[t])) { add(t, `names ${base} (${c})`); hit = true; }
    }
    for (const row of TABLE) if (row.files.test(c)) for (const t of tests) if (row.tests(text[t], c, root)) { add(t, `${c}: ${row.why}`); hit = true; }
    if (!hit) uncovered.push(c);
  }
  return { chosen, uncovered, tests };
}

const git = (root, ...a) => spawnSync('git', ['-C', root, ...a], { encoding: 'utf8' });

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

export function main(argv) {
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
  const { chosen, uncovered, tests } = choose(o.root, changed);
  const gate = 'This is a changed-only working run. The release gate is the full `npm test`, run before every release.';
  console.log(`test:changed: base ${base.label} (${git(o.root, 'rev-parse', '--short', base.ref).stdout.trim()}), ${changed.length} changed file(s)`);
  for (const c of changed) console.log(`  ${c}`);
  if (bumped.length) console.log(`version bump only: ${bumped.join(', ')} (no test reads a version)`);
  console.log(`chose ${chosen.size} of ${tests.length} test files:`);
  for (const [t, why] of chosen) {
    const more = why.length > 3 ? `\n    (+${why.length - 3} more)` : '';
    console.log(`  ${t}\n    ${why.slice(0, 3).join('\n    ')}${more}`);
  }
  if (uncovered.length) console.log(`no test covers: ${uncovered.join(', ')}`);
  if (!chosen.size || o.dry) { console.log(gate); return 0; }
  const args = ['--import', './test/fresh-tmp.mjs', '--test', ...chosen.keys()];
  console.log(`running: node ${args.join(' ')}`);
  // NODE_TEST_CONTEXT is set when this runs under a test runner; passed on, the nested run reports to it and exits 0 on a failure.
  const { NODE_TEST_CONTEXT, ...env } = process.env;
  const r = spawnSync(process.execPath, args, { cwd: o.root, stdio: 'inherit', env });
  console.log(gate);
  return r.status ?? 1;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(SELF)) process.exit(main(process.argv.slice(2)));
