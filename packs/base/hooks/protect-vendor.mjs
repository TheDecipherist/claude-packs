#!/usr/bin/env node
// PreToolUse (Write|Edit|MultiEdit|NotebookEdit|Bash): code this project did not write is read-only.
//  - Vendored and generated code (JUCE, third_party, _deps, build output) and the project's own read-only paths
//    (.claude/layout.json "protected"): a tool write there is refused. Agents "fixing" a bug inside JUCE is a reported
//    failure mode; fix our code or wrap the library instead.
//  - COPY TREES: every layout folder whose "kind" is "copy" (another project's code, copied unchanged and proved, from
//    the copy-and-prove skill). A tool write there is refused, and so is a shell command that writes there (sed -i,
//    perl -i, a > or >> redirect, tee, cp, mv, ln, rsync, install, rm, truncate, touch, patch, dd of=). Let through:
//    git, and EXACTLY the project's sanctioned copy tools, run as `python3 <tool>` (or node, bash, sh):
//    .claude/layout.json "guards": { "copy": { "tools": ["tools/copy_x.py", ...] } }. A new copy tree is guarded the
//    moment its folder is declared with "kind": "copy".
// One law, read-only paths: the separate copy-tree guard (copy-tree-guard.py) is merged in here.
// A path in an agent worktree (.claude/worktrees/<name>/...) is judged as the same path in the project.
// `--selftest` plants a write into each kind of read-only path and lets the allowed ones through.
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { matchesAny } from './lib/glob.mjs';
import { foldersOfKind, readLayout } from './lib/layout.mjs';
import * as project from './lib/project.mjs';

const DEFAULT_GLOBS = ['JUCE/**', '**/JUCE/modules/**', 'JuceLibraryCode/**', 'libs/**', 'third_party/**', 'external/**', '_deps/**', 'build/**'];
const WRITERS = new Set(['cp', 'mv', 'ln', 'rsync', 'install']); // their last argument is what they write
const TOUCHERS = new Set(['rm', 'truncate', 'touch', 'patch', 'tee', 'unlink', 'shred']); // every argument is
const RUNNERS = new Set(['python3', 'python', 'node', 'bash', 'sh']);
const REDIRECT = /\d?>{1,2}\s*([^\s;&|]+)/g;

function words(text) {
  const out = [];
  for (const m of text.matchAll(/'([^']*)'|"((?:\\.|[^"\\])*)"|(\S+)/g)) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

// The paths a shell command writes, as well as they can be read from its words.
export function shellTargets(cmd, sanctioned = []) {
  const out = [];
  for (const part of cmd.split(/&&|\|\||;|\|(?!\|)|\n/)) {
    for (const m of part.matchAll(REDIRECT)) out.push(m[1]);
    let w = words(part.replace(REDIRECT, ' '));
    while (w.length && (['sudo', 'env', 'command', 'builtin'].includes(w[0]) || /^\w+=/.test(w[0]))) w = w.slice(1);
    if (!w.length) continue;
    const exe = basename(w[0]);
    const args = w.slice(1).filter((a) => !a.startsWith('-'));
    if (RUNNERS.has(exe) && w.length > 1 && sanctioned.some((t) => w[1] === t || w[1].endsWith(`/${t}`))) continue;
    if (exe === 'git') continue;
    if (WRITERS.has(exe) && args.length) out.push(args.at(-1));
    else if (TOUCHERS.has(exe)) out.push(...args);
    else if (exe === 'sed' && w.slice(1).some((a) => a.startsWith('-i') || a === '--in-place')) out.push(...args.slice(1));
    else if (exe === 'perl' && w.slice(1).some((a) => /^-\w*i/.test(a))) out.push(...args);
    else if (exe === 'dd') out.push(...w.slice(1).filter((a) => a.startsWith('of=')).map((a) => a.slice(3)));
  }
  return out;
}

// What makes a write to this file wrong, or null. `p` is the project library (lib/project.mjs).
function judge(p, file, base) {
  const abs = resolve(base, file);
  if (!p.insideProject(abs)) return null;
  const rel = p.relInCheckout(abs).replace(/^\.claude\/worktrees\/[^/]+\//, '');
  const layout = readLayout(p.claudeRoot(abs));
  const tree = foldersOfKind(layout, 'copy').find((t) => rel === t || rel.startsWith(`${t}/`));
  if (tree) return { rel, tree, layout };
  if (matchesAny(rel, [...DEFAULT_GLOBS, ...(layout.protected ?? [])])) return { rel, layout };
  return null;
}

export function verdict(payload, p = project) {
  const input = payload.tool_input ?? {};
  if (payload.tool_name === 'Bash') {
    const command = input.command ?? '';
    if (p.commandLeavesProject(command)) return null;
    const base = payload.cwd ?? p.ROOT;
    const tools = readLayout(p.claudeRoot(base)).guards?.copy?.tools ?? [];
    for (const t of shellTargets(command, tools)) {
      const hit = judge(p, t, base);
      if (hit?.tree) return { ...hit, why: `the command writes ${t}` };
    }
    return null;
  }
  const file = input.file_path ?? input.notebook_path;
  if (!file) return null;
  const hit = judge(p, file, p.ROOT);
  return hit && { ...hit, why: hit.rel };
}

function message({ why, tree, layout }) {
  if (!tree) {
    return `BLOCKED by protect-vendor: ${why} is vendored/generated code and is read-only.\n` +
      'Fix our own code, wrap the library, or ask the user if the library itself must change.\n';
  }
  const tools = layout.guards?.copy?.tools ?? [];
  return `BLOCKED by protect-vendor: ${why}, in the copy tree ${tree}. A copy tree (a folder of kind "copy" in .claude/layout.json) is read-only:\n` +
    `its files come only from the project's copy tools${tools.length ? ` (${tools.map((t) => `python3 ${t}`).join(', ')})` : ''}, each with its origin line and licence row.\n` +
    'Fix the code that uses the copy. If the copy itself must change, that is the user\'s to say, then a pinned change under null tests (.claude/rules/copy-trees-read-only.md).\n';
}

function main() {
  let payload;
  try {
    payload = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return 0;
  }
  const v = verdict(payload);
  if (!v) return 0;
  process.stderr.write(message(v));
  return 2;
}

async function selftest() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'pv-')));
  mkdirSync(join(root, '.claude'));
  writeFileSync(join(root, '.claude/layout.json'), JSON.stringify({
    folders: { a: { path: 'lib/engines/src/tabula', kind: 'copy' }, b: { path: 'lib/app/tabula', kind: 'copy' }, c: { path: 'lib/effects/src/tabula', kind: 'copy' }, d: { path: 'lib/app' } },
    protected: ['design/reference/**'],
    guards: { copy: { tools: ['tools/copy_tabula.py', 'tools/copy_reimport.py', 'tools/copy_promote.py'] } },
  }));
  const saved = process.env.CLAUDE_PROJECT_DIR;
  process.env.CLAUDE_PROJECT_DIR = root;
  const p = await import(`${pathToFileURL(join(import.meta.dirname, 'lib', 'project.mjs')).href}?selftest`);
  process.env.CLAUDE_PROJECT_DIR = saved;
  const W = (f) => ({ tool_name: 'Write', tool_input: { file_path: join(root, f) } });
  const E = (f) => ({ tool_name: 'Edit', tool_input: { file_path: join(root, f), old_string: 'a', new_string: 'b' } });
  const N = (f) => ({ tool_name: 'NotebookEdit', tool_input: { notebook_path: join(root, f) } });
  const B = (c) => ({ tool_name: 'Bash', tool_input: { command: c } });
  const refused = [
    W('lib/app/tabula/tabula/src/engine/PianoBridge.cpp'), E('lib/engines/src/tabula/tabula/src/engine/Voice.h'), W('lib/effects/src/tabula/x/New.h'),
    W('.claude/worktrees/agent-x/lib/app/tabula/tabula/tools/p.cpp'), N('lib/app/tabula/n.ipynb'), W('JUCE/modules/juce_core/x.h'), E('design/reference/look.md'),
    B("sed -i 's/0.5f/0.6f/' lib/app/tabula/tabula/src/engine/PianoBridge.cpp"), B('echo x > lib/engines/src/tabula/tabula/src/util/Dev.h'),
    B('cp /tmp/x.h lib/app/tabula/tabula/src/engine/'), B("cd w && perl -pi -e 's/a/b/' lib/engines/src/tabula/dspblocks/include/dsp/Drive.h"),
    B('rm lib/app/tabula/tabula/tools/piano_prebuild.cpp'), B('cat a | tee -a lib/effects/src/tabula/x.h'),
    B('python3 tools/my_copy_tabula.py; rm lib/app/tabula/tabula/tools/piano_prebuild.cpp'), B('python3 out/copy_promote.py && cp x lib/app/tabula/y.h'),
    B('dd if=/dev/zero of=lib/app/tabula/z.bin bs=1 count=1'),
  ];
  const passed = [
    W('lib/app/src/pianos.h'), E('lib/engines/src/engines.cpp'), W('lib/app/tabulax/y.h'), W('/elsewhere/lib/app/tabula/x.h'),
    B('python3 tools/copy_tabula.py'), B('python3 tools/copy_reimport.py --no-proofs'), B('python3 tools/copy_promote.py lib/engines/src/tabula/tabula/src/engine/FireSaw.h --proof true'),
    B('grep -rn loadFrom lib/app/tabula > out/grep.txt'), B('cp lib/app/tabula/tabula/src/engine/PianoBridge.h /tmp/x.h'),
    B('git rm -q lib/app/tabula/tabula/tools/old.cpp'), B('cat lib/engines/src/tabula/tabula/src/engine/Voice.h 2>&1 | head'),
    B('cmake --build build -j8 > build/log.txt'), B('cd /elsewhere/other && rm lib/app/tabula/x.h'),
  ];
  const cwd = process.cwd();
  process.chdir(root); // a hook runs in the project's folder
  const bad = [...refused.filter((x) => !verdict(x, p)), ...passed.filter((x) => verdict(x, p))];
  process.chdir(cwd);
  for (const x of bad) console.error(`protect-vendor selftest FAILED on ${JSON.stringify(x.tool_input)}`);
  rmSync(root, { recursive: true, force: true });
  console.log(`protect-vendor selftest: ${refused.length} writes into read-only paths refused, ${passed.length} others let through: ${bad.length ? 'FAIL' : 'PASS'}`);
  return bad.length ? 1 : 0;
}

process.exit(process.argv.includes('--selftest') ? await selftest() : main());
