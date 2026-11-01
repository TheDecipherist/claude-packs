#!/usr/bin/env node
// The generated gate shape_symmetry (the shape law, 0.9.0). For every MANY concept in design/shape.json:
//   members: every instance has the same set of members (the concept's `symmetry.members` command, run once per instance,
//            prints that instance's members one per line; {i} is replaced by the instance);
//   swap:    every unordered pair, all N·(N-1)/2 of them, swaps the same (`symmetry.swap`, {i} and {j} replaced, exit 0).
// The project only declares the commands in shape.json; this file never holds a project's test. It was the instances-by-index
// swap check, which a folder list scoped to the engine and which let a world-side difference through.
//
//   node .claude/tools/shape-symmetry.mjs run <concept> [--dir <root>]     the gate for one concept (what the generated test calls)
//   node .claude/tools/shape-symmetry.mjs gen --cmake <out.cmake> [--dir <root>]   add_test lines, one per many concept
//   node .claude/tools/shape-symmetry.mjs gen --list [--dir <root>]        "<name>\t<command>" lines, for any other build system
//   node .claude/tools/shape-symmetry.mjs --selftest
// The kit's CLI runs the same: `npx claude-packs symmetry run|gen ...`.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const TIMEOUT_S = 600;

export function readManifest(root) {
  const file = join(root, 'design', 'shape.json');
  if (!existsSync(file)) throw new Error(`no design/shape.json in ${root} (every synth declares its concepts there: one or many)`);
  return JSON.parse(readFileSync(file, 'utf8'));
}

export const manyConcepts = (shape) => Object.entries(shape.concepts ?? {}).filter(([, c]) => c.shape === 'many').map(([name]) => name);
export const testName = (concept) => `shape_symmetry.${concept}`;

const sh = (cmd, root, vars) => {
  const line = cmd.replace(/\{([ij])\}/g, (_, k) => String(vars[k]));
  const r = spawnSync(line, { shell: true, cwd: root, encoding: 'utf8', timeout: TIMEOUT_S * 1000, maxBuffer: 64 << 20 });
  return { line, code: r.status ?? (r.error ? 127 : 1), out: r.stdout ?? '', err: `${r.stderr ?? ''}${r.error ? r.error.message : ''}` };
};
const tail = (text, n = 4) => text.trim().split('\n').filter(Boolean).slice(-n).map((l) => `\n      ${l}`).join('');

// The instances, in order: count from the concept (many(N)), or the symmetry block's `instances` command (many, no fixed N).
function instancesOf(name, concept, root) {
  const sym = concept.symmetry;
  let n = concept.count;
  if (n === undefined && sym.instances) {
    const r = sh(sym.instances, root, {});
    n = r.code === 0 ? Number(r.out.trim()) : NaN;
    if (!Number.isInteger(n)) throw new Error(`${name}: the instances command "${sym.instances}" printed no count (exit ${r.code})`);
  }
  if (!Number.isInteger(n) || n < 1) throw new Error(`${name} is many with no count: give it "count": N, or "symmetry": { "instances": "<command printing N>" }`);
  const first = sym.first ?? 0;
  return Array.from({ length: n }, (_, k) => first + k);
}

// Runs the gate for one concept; prints every reading; returns 0 (same) or 1 (red).
export function runConcept(root, name, log = console.log) {
  const shape = readManifest(root);
  const concept = shape.concepts?.[name];
  const head = `shape_symmetry ${name}`;
  if (!concept) { log(`${head}: RED: no concept "${name}" in design/shape.json`); return 1; }
  if (concept.shape !== 'many') { log(`${head}: RED: "${name}" is ${concept.shape}, not many; only a many concept has symmetry`); return 1; }
  const sym = concept.symmetry;
  if (!sym?.members || !sym?.swap) {
    log(`${head}: RED: "${name}" is many but design/shape.json gives it no symmetry block. Add "symmetry": { "members": "<command printing instance {i}'s members, one per line>", "swap": "<command: exit 0 when instances {i} and {j} swap the same>" }`);
    return 1;
  }
  let ids;
  try { ids = instancesOf(name, concept, root); } catch (e) { log(`${head}: RED: ${e.message}`); return 1; }
  log(`${head}: ${ids.length} instances (${ids.join(', ')}); owns: ${(concept.owns ?? []).join(', ') || '(not listed)'}`);
  let red = 0;

  // (a) members
  const sets = new Map();
  for (const i of ids) {
    const r = sh(sym.members, root, { i });
    const members = new Set(r.out.split('\n').map((l) => l.trim()).filter(Boolean));
    if (r.code !== 0) { red += 1; log(`  members ${i}: RED: "${r.line}" exited ${r.code}${tail(r.err || r.out)}`); continue; }
    if (members.size === 0) { red += 1; log(`  members ${i}: RED: "${r.line}" printed no members`); continue; }
    sets.set(i, members);
    log(`  members ${i}: ${members.size}`);
  }
  let diffs = 0;
  for (const i of sets.keys()) for (const j of sets.keys()) {
    if (i === j) continue;
    const lacks = [...sets.get(i)].filter((m) => !sets.get(j).has(m)).sort();
    if (lacks.length) { diffs += 1; log(`  members DIFFER: instance ${i} has ${lacks.join(', ')} that instance ${j} lacks`); }
  }
  if (diffs) red += 1;
  else if (sets.size === ids.length) log(`  members: every instance has the same ${sets.values().next().value.size} members`);

  // (b) swap, every unordered pair
  let pairs = 0, differ = 0;
  for (let a = 0; a < ids.length; a += 1) for (let b = a + 1; b < ids.length; b += 1) {
    const [i, j] = [ids[a], ids[b]];
    const r = sh(sym.swap, root, { i, j });
    pairs += 1;
    if (r.code === 0) log(`  swap ${i}<->${j}: same`);
    else { differ += 1; log(`  swap ${i}<->${j}: DIFFERS: "${r.line}" exited ${r.code}${tail(r.out + r.err)}`); }
  }
  const want = (ids.length * (ids.length - 1)) / 2;
  log(`  swap: ${pairs} pairs checked (N·(N-1)/2 = ${want} for N = ${ids.length}), ${differ} differ`);
  if (differ || pairs !== want) red += 1;
  log(`${head}: ${red ? 'RED' : 'GREEN'}`);
  return red ? 1 : 0;
}

// One test per many concept. A many concept with no symmetry block still gets its test, which is red until it has one.
export function generate(root, { cmake, list } = {}, log = console.log) {
  const shape = readManifest(root);
  const names = manyConcepts(shape);
  const abs = resolve(root);
  const argv = (n) => [process.execPath, SELF, 'run', n, '--dir', abs];
  if (list) for (const n of names) log(`${testName(n)}\t${argv(n).map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ')}`);
  if (cmake) {
    const q = (s) => `"${s.replace(/\\/g, '/').replace(/"/g, '\\"')}"`;
    const lines = [
      '# Generated by claude-packs (shape-symmetry.mjs gen) from design/shape.json at configure time. Never edit, never commit:',
      '# a change to the manifest re-runs the configure step, which writes this file again.',
      `set_property(DIRECTORY APPEND PROPERTY CMAKE_CONFIGURE_DEPENDS ${q(join(abs, 'design', 'shape.json'))})`,
      ...names.flatMap((n) => [
        `add_test(NAME ${testName(n)} COMMAND ${argv(n).map(q).join(' ')})`,
        `set_tests_properties(${testName(n)} PROPERTIES LABELS shape_symmetry TIMEOUT 3600)`,
      ]),
      '',
    ];
    mkdirSync(dirname(resolve(cmake)), { recursive: true });
    writeFileSync(resolve(cmake), lines.join('\n'));
    const none = names.filter((n) => !shape.concepts[n].symmetry);
    log(`shape_symmetry: ${names.length} test(s) in ${cmake}: ${names.map(testName).join(', ') || '(no many concept)'}${none.length ? `; red until they have a symmetry block: ${none.join(', ')}` : ''}`);
  }
  return 0;
}

function args(argv) {
  const o = { rest: [], dir: process.env.CLAUDE_PROJECT_DIR ?? process.cwd() };
  for (let k = 0; k < argv.length; k += 1) {
    if (argv[k] === '--dir') o.dir = argv[++k];
    else if (argv[k] === '--cmake') o.cmake = argv[++k];
    else if (argv[k] === '--list') o.list = true;
    else o.rest.push(argv[k]);
  }
  o.dir = resolve(o.dir);
  return o;
}

export const USAGE = `usage: shape-symmetry run <concept> [--dir <root>]
       shape-symmetry gen --cmake <out.cmake> | --list [--dir <root>]
In CMakeLists.txt (configure time):
  execute_process(COMMAND node \${CMAKE_SOURCE_DIR}/.claude/tools/shape-symmetry.mjs gen --dir \${CMAKE_SOURCE_DIR}
                  --cmake \${CMAKE_BINARY_DIR}/shape_symmetry.cmake COMMAND_ERROR_IS_FATAL ANY)
  include(\${CMAKE_BINARY_DIR}/shape_symmetry.cmake)`;

export async function main(argv) {
  if (argv[0] === '--selftest') return (await import('./shape-symmetry-selftest.mjs')).selftest(SELF);
  const o = args(argv);
  const [cmd, concept] = o.rest;
  try {
    if (cmd === 'run' && concept) return runConcept(o.dir, concept);
    if (cmd === 'gen' && (o.cmake || o.list)) return generate(o.dir, o);
  } catch (e) {
    console.error(`shape_symmetry: ${e.message}`);
    return 2;
  }
  console.error(USAGE);
  return 2;
}

// realpath: the module's own URL is the real path, the command line may go through a symlink (/var is /private/var on macOS),
// and a tool that silently does nothing reads as green.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(SELF)) main(process.argv.slice(2)).then((c) => process.exit(c));
