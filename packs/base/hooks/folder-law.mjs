#!/usr/bin/env node
// PreToolUse (Write|Edit|MultiEdit|NotebookEdit|Bash): a NEW source file may only be created inside a layout folder,
// by any route: the Write tool, or the shell (>, >>, tee, cp, mv, a heredoc into a file; lib/writes.mjs).
// The layout lives in .claude/layout.json and is summarised in CLAUDE.md; this makes it structural.
// Existing files can always be edited; moving them is a separate, deliberate job.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkoutRoot, claudeRoot, insideProject } from './lib/project.mjs';
import { writesOf } from './lib/writes.mjs';
import { codeFolders, readLayout } from './lib/layout.mjs';

const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const SOURCE = /\.(c|cc|cpp|cxx|h|hh|hpp|mm|m|wgsl|metal|glsl|hlsl|slang)$/i;

function main() {
  let payload;
  try {
    payload = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return 0;
  }
  for (const w of writesOf(payload)) {
    if (w.op === 'delete' || existsSync(w.path) || !SOURCE.test(w.path) || !insideProject(w.path)) continue;
    const code = judge(w.path);
    if (code) return code;
  }
  return 0;
}

function judge(file) {
  if (relative(ROOT, file).startsWith('..')) return 0;
  const root = checkoutRoot(file);
  const rel = relative(root, file).replace(/\\/g, '/');
  if (rel.startsWith('..')) return 0;

  const layout = readLayout(claudeRoot(file));
  const folders = codeFolders(layout);
  if (folders.length === 0) return 0;
  if (folders.some((f) => rel.startsWith(`${f}/`))) {
    // Inside src/, the file must be in one of the named subfolders, not loose in src/ itself.
    return 0;
  }

  const list = Object.values(layout.folders)
    .filter((f) => folders.includes(f.path))
    .map((f) => `  ${f.path}/  ${f.purpose}`)
    .join('\n');
  process.stderr.write(
    `BLOCKED by folder-law: ${rel} is outside the project layout.\nNew source files go in one of:\n${list}\n` +
      'If none fits, ask the user; a new folder is added to .claude/layout.json, then `npx claude-packs update`.\n',
  );
  return 2;
}

// A right and a wrong new file, by a tool and by the shell, in a throwaway project.
function selftest() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'fl-')));
  mkdirSync(join(root, '.claude'));
  writeFileSync(join(root, '.claude/layout.json'), JSON.stringify({ folders: { dsp: { path: 'src/dsp', purpose: 'DSP' } } }));
  const fire = (p) => spawnSync('node', [fileURLToPath(import.meta.url)], { cwd: root, input: JSON.stringify({ ...p, cwd: root }), env: { ...process.env, CLAUDE_PROJECT_DIR: root } }).status;
  const W = (f) => ({ tool_name: 'Write', tool_input: { file_path: join(root, f), content: 'int x;' } });
  const B = (c) => ({ tool_name: 'Bash', tool_input: { command: c } });
  const cases = [
    ['a new file in a layout folder', W('src/dsp/Svf.cpp'), 0], ['a new file outside the layout', W('stray/Svf.cpp'), 2],
    ['a heredoc into a new file outside the layout', B("cat > stray/B.cpp <<'EOF'\nint b;\nEOF"), 2],
    ['a copy into a layout folder', B('cp /tmp/x.cpp src/dsp/C.cpp'), 0], ['a move outside the layout', B('mv /tmp/x.cpp stray/D.cpp'), 2],
    ['words about a file are no write', B("echo 'cat > stray/E.cpp'"), 0],
  ];
  const bad = cases.filter(([, p, want]) => fire(p) !== want);
  for (const [name] of bad) console.error(`folder-law selftest FAILED: ${name}`);
  rmSync(root, { recursive: true, force: true });
  console.log(`folder-law selftest: ${bad.length ? 'FAIL' : 'OK'} (${cases.length} cases)`);
  return bad.length ? 1 : 0;
}

process.exit(process.argv.includes('--selftest') ? selftest() : main());
