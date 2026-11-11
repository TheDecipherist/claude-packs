#!/usr/bin/env node
// PreToolUse (Write|Edit|MultiEdit|NotebookEdit|Bash): a NEW source file may only be created inside a layout folder,
// by any route that creates a file: the Write tool, or the shell (>, >>, tee, cp, mv, touch, a heredoc into a file;
// lib/writes.mjs). An Edit, MultiEdit, NotebookEdit or sed -i never creates a file, so it is never judged here.
// The layout lives in .claude/layout.json and is summarised in CLAUDE.md; this makes it structural.
// Existing files can always be edited; moving them is a separate, deliberate job. `--selftest` proves it.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkoutRoot, claudeRoot } from './lib/project.mjs';
import { codeFolders, readLayout } from './lib/layout.mjs';
import { bashOf, editOf, runHook, scratchProject, verdicts, writeOf } from './lib/selftest.mjs';
import { judgeEvent } from './lib/writes.mjs';
import { asHook, isMain, projectRoot } from './lib/hook-log.mjs';

const SOURCE = /\.(c|cc|cpp|cxx|h|hh|hpp|mm|m|wgsl|metal|glsl|hlsl|slang)$/i;

// What is source: layout.json "sourceFiles" (a regex the configuration writes, e.g. full-stack's TypeScript; KWB-37), else SOURCE.
export const isSource = (file) => { const re = readLayout(claudeRoot(projectRoot(), file, process.cwd())).sourceFiles; return (re ? new RegExp(re, 'i') : SOURCE).test(file); };

const main = (text) => judgeEvent(text, {
  name: 'folder-law',
  write: (w) => (w.op === 'delete' || w.op === 'edit' || existsSync(w.path) || !isSource(w.path) ? null : judge(w.path)),
}, process);

function judge(file) {
  if (relative(projectRoot(), file).startsWith('..')) return null;
  const root = checkoutRoot(projectRoot(), file, process.cwd());
  const rel = relative(root, file).replace(/\\/g, '/');
  if (rel.startsWith('..')) return null;

  const layout = readLayout(claudeRoot(projectRoot(), file, process.cwd()));
  const folders = codeFolders(layout);
  if (folders.length === 0) return null;
  if (folders.some((f) => rel.startsWith(`${f}/`))) {
    // Inside src/, the file must be in one of the named subfolders, not loose in src/ itself.
    return null;
  }

  const list = Object.values(layout.folders)
    .filter((f) => folders.includes(f.path))
    .map((f) => `  ${f.path}/  ${f.purpose}`)
    .join('\n');
  return `BLOCKED by folder-law: ${rel} is outside the project layout.\nNew source files go in one of:\n${list}\n` +
    'If none fits, ask the user; a new folder is added to .claude/layout.json, then `npx --no-install @thedecipherist/claude-packs update`.\n';
}

function selftest() {
  const hook = fileURLToPath(import.meta.url);
  const dir = scratchProject({ 'stray/Old.cpp': '// old\n', 'x.txt': 'int x;\n' }, { folders: { core: { path: 'src/core', purpose: 'core code' }, docs: { path: 'docs', purpose: 'docs' } }, concepts: {} });
  const w = (file) => runHook(hook, dir, writeOf(join(dir, file))).status;
  const sh = (cmd) => runHook(hook, dir, bashOf(cmd, dir)).status;
  const ts = scratchProject({}, { folders: { api: { path: 'api/src', purpose: 'the API' } }, concepts: {}, sourceFiles: '\\.(ts|tsx)$' });
  const plain = scratchProject({}, { folders: { src: { path: 'src', purpose: 'the code' } }, concepts: {}, sourceFiles: '\\.py$' });
  return verdicts('folder-law', [
    ['TypeScript is not source where the layout does not say so', w('stray/x.ts'), 0],
    ['a layout whose sourceFiles name TypeScript: a new .ts outside its folders (KWB-37)', runHook(hook, ts, writeOf(join(ts, 'stray/x.ts'))).status, 2],
    ['and inside them', runHook(hook, ts, writeOf(join(ts, 'api/src/x.ts'))).status, 0],
    ['a new file in a layout folder', w('src/core/Svf.cpp'), 0],
    ['a new file outside the layout', w('stray/New.cpp'), 2],
    ['a new file loose in src/', w('src/Loose.cpp'), 2],
    ['a layout that names nothing inside src/: a file in src/ (KWB-78)', runHook(hook, plain, writeOf(join(plain, 'src/app.py'))).status, 0],
    ['and a file outside it', runHook(hook, plain, writeOf(join(plain, 'stray/app.py'))).status, 2],
    ['an existing file outside the layout', w('stray/Old.cpp'), 0],
    ['an edit is never a new file', runHook(hook, dir, editOf(join(dir, 'stray/New.cpp'))).status, 0],
    ['a doc is not source', w('stray/notes.md'), 0],
    ['another project is not ours', runHook(hook, dir, writeOf(join(dirname(dir), 'elsewhere/x.cpp'))).status, 0],
    ['a heredoc into a new file outside the layout', sh("cat > stray/B.cpp <<'EOF'\nint b;\nEOF"), 2],
    ['a copy into a layout folder', sh('cp x.txt src/core/C.cpp'), 0],
    ['a move outside the layout', sh('mv x.txt stray/D.cpp'), 2],
    ['words about a file are no write', sh("echo 'cat > stray/E.cpp'"), 0],
  ]);
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? selftest() : await asHook('folder-law', main));
