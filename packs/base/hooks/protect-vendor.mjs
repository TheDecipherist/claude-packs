#!/usr/bin/env node
// PreToolUse (Write|Edit|MultiEdit|NotebookEdit|Bash): code this project did not write is read-only, to every
// route that writes (WB-69): a tool, or a shell command that writes, copies, moves or deletes there.
//  - Vendored and generated code (JUCE, third_party, _deps, build output) and the project's own read-only paths
//    (.claude/layout.json "protected"). Agents "fixing" a bug inside JUCE is a reported
//    failure mode; fix our code or wrap the library instead.
//  - COPY TREES: every layout folder whose "kind" is "copy" (another project's code, copied unchanged and proved, from
//    the copy-and-prove skill). Let through: git, and the project's sanctioned copy tools, run as `python3 <tool>`:
//    .claude/layout.json "guards": { "copy": { "tools": ["tools/copy_x.py", ...] } }. A new copy tree is guarded the
//    moment its folder is declared with "kind": "copy".
// One law, read-only paths: the separate copy-tree guard (copy-tree-guard.py) is merged in here.
// A path in an agent worktree (.claude/worktrees/<name>/...) is judged as the same path in the project.
// A nested clone under build/_deps is vendored code too (Sub37 WB-2: checkoutRoot counts only this repo's worktrees).
// `--selftest` plants a write into each kind of read-only path and lets the allowed ones through.
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { matchesAny } from './lib/glob.mjs';
import { foldersOfKind, readLayout } from './lib/layout.mjs';
import * as project from './lib/project.mjs';
import { editOf, git, put, runHook, scratchProject, verdicts } from './lib/selftest.mjs';
import { writesOf } from './lib/writes.mjs';

const DEFAULT_GLOBS = ['JUCE/**', '**/JUCE/modules/**', 'JuceLibraryCode/**', 'libs/**', 'third_party/**', 'external/**', '_deps/**'];
// The build output; a project whose build lives elsewhere names it in layout.json "buildOutput" (a build in out/, while build/
// holds the report and the pictures, which agents write). Any nested clone under build/_deps stays vendored either way.
const buildGlobs = (layout) => [...(layout.buildOutput ?? ['build/**']), 'build/_deps/**'];
// What makes a write to this file wrong, or null. `p` is the project library (lib/project.mjs).
function judge(p, file, base) {
  const abs = resolve(base, file);
  if (!p.insideProject(abs)) return null;
  const rel = p.relInCheckout(abs).replace(/^\.claude\/worktrees\/[^/]+\//, '');
  const layout = readLayout(p.claudeRoot(abs));
  const tree = foldersOfKind(layout, 'copy').find((t) => rel === t || rel.startsWith(`${t}/`));
  if (tree) return { rel, tree, layout };
  if (matchesAny(rel, [...DEFAULT_GLOBS, ...buildGlobs(layout), ...(layout.protected ?? [])])) return { rel, layout };
  return null;
}

// Every file the call writes, by any route (lib/writes.mjs): Write, Edit, MultiEdit, NotebookEdit, and the
// shell's >, >>, tee, sed -i, perl -i, cp, mv (its source too), ln, rm, truncate, touch, dd of=, a heredoc.
export function verdict(payload, p = project) {
  for (const w of writesOf(payload, payload.cwd ?? p.ROOT)) {
    const hit = judge(p, w.path, p.ROOT);
    if (hit) return { ...hit, why: payload.tool_name === 'Bash' ? `the command writes ${hit.rel}` : hit.rel };
  }
  return null;
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
    B('cp /tmp/x.h lib/app/tabula/tabula/src/engine/'), B("cd lib && perl -pi -e 's/a/b/' engines/src/tabula/dspblocks/include/dsp/Drive.h"), B('mv lib/app/tabula/a.h lib/app/src/a.h'), B("cat > build/x.h <<'EOF'\nx\nEOF"),
    B('rm lib/app/tabula/tabula/tools/piano_prebuild.cpp'), B('cat a | tee -a lib/effects/src/tabula/x.h'),
    B('python3 tools/my_copy_tabula.py; rm lib/app/tabula/tabula/tools/piano_prebuild.cpp'), B('python3 out/copy_promote.py && cp x lib/app/tabula/y.h'),
    B('dd if=/dev/zero of=lib/app/tabula/z.bin bs=1 count=1'),
  ];
  const passed = [
    W('lib/app/src/pianos.h'), E('lib/engines/src/engines.cpp'), W('lib/app/tabulax/y.h'), W('/elsewhere/lib/app/tabula/x.h'),
    B('python3 tools/copy_tabula.py'), B('python3 tools/copy_reimport.py --no-proofs'), B('python3 tools/copy_promote.py lib/engines/src/tabula/tabula/src/engine/FireSaw.h --proof true'),
    B('grep -rn loadFrom lib/app/tabula > out/grep.txt'), B('cp lib/app/tabula/tabula/src/engine/PianoBridge.h /tmp/x.h'),
    B('git rm -q lib/app/tabula/tabula/tools/old.cpp'), B('cat lib/engines/src/tabula/tabula/src/engine/Voice.h 2>&1 | head'),
    B('cmake --build build -j8 > out/log.txt'), B('cd /elsewhere/other && rm lib/app/tabula/x.h'), B("echo 'rm lib/app/tabula/x.h'"),
  ];
  const cwd = process.cwd();
  process.chdir(root); // a hook runs in the project's folder
  const bad = [...refused.filter((x) => !verdict(x, p)), ...passed.filter((x) => verdict(x, p))];
  process.chdir(cwd);
  for (const x of bad) console.error(`protect-vendor selftest FAILED on ${JSON.stringify(x.tool_input)}`);
  rmSync(root, { recursive: true, force: true });
  console.log(`protect-vendor routes: ${refused.length} writes into read-only paths refused, ${passed.length} others let through: ${bad.length ? 'FAIL' : 'PASS'}`);
  return bad.length ? 1 : 0;
}

// A git project with FetchContent's JUCE clone under build/_deps and an agent worktree.
function selftestRepo() {
  const hook = fileURLToPath(import.meta.url);
  const dir = scratchProject({ 'src/dsp/Svf.cpp': '// svf\n', 'design/ref.md': 'x\n' }, { folders: {}, concepts: {}, protected: ['design/**'] });
  git(dir, 'init', '-q');
  git(dir, 'add', 'src', '.claude');
  git(dir, 'commit', '-qm', 'init');
  git(dir, 'worktree', 'add', '-q', '.claude/worktrees/agent-x', '-b', 'work/x');
  put(join(dir, 'build/_deps/juce-src/modules/juce_core/juce_core.h'), '// juce\n');
  git(join(dir, 'build/_deps/juce-src'), 'init', '-q');
  const wt = join(dir, '.claude/worktrees/agent-x');
  const e = (file) => runHook(hook, dir, editOf(join(dir, file)));
  return verdicts('protect-vendor', [
    ['our own source', e('src/dsp/Svf.cpp'), 0],
    ['JUCE modules', e('JUCE/modules/juce_core/juce_core.h'), 2],
    ['a nested clone under build/_deps (Sub37 WB-2)', e('build/_deps/juce-src/modules/juce_core/juce_core.h'), 2],
    ['a layout "protected" glob', e('design/ref.md'), 2],
    ['a worktree file is judged in the worktree', runHook(hook, dir, editOf(join(wt, 'src/dsp/Svf.cpp'))), 0],
    ['a worktree\'s vendored folder', runHook(hook, dir, editOf(join(wt, 'third_party/lib/lib.h'))), 2],
    ['another project is not ours', runHook(hook, dir, editOf(join(dirname(dir), 'elsewhere/JUCE/x.h'))), 0],
    ['build/ is the build output by default', e('build/report.md'), 2],
  ]) | selftestBuildOutput(hook);
}

// A layout that names its build output as out/ may write build/ (a report, pictures); out/ and build/_deps stay read-only.
function selftestBuildOutput(hook) {
  const dir = scratchProject({ 'src/a.cpp': '//\n' }, { folders: {}, concepts: {}, buildOutput: ['out/**'] });
  git(dir, 'init', '-q');
  const e = (file) => runHook(hook, dir, editOf(join(dir, file)));
  return verdicts('protect-vendor buildOutput', [
    ['build/for-tim.md under buildOutput out/**', e('build/for-tim.md'), 0],
    ['out/ under buildOutput out/**', e('out/lib/x.o'), 2],
    ['build/_deps stays vendored', e('build/_deps/juce-src/x.h'), 2],
  ]);
}

process.exit(process.argv.includes('--selftest') ? ((await selftest()) | selftestRepo()) : main());
