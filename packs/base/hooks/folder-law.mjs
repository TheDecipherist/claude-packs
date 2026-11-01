#!/usr/bin/env node
// PreToolUse (Write): a NEW source file may only be created inside a layout folder.
// The layout lives in .claude/layout.json and is summarised in CLAUDE.md; this makes it structural.
// Existing files can always be edited; moving them is a separate, deliberate job. `--selftest` proves it.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { checkoutRoot, claudeRoot } from './lib/project.mjs';
import { codeFolders, readLayout } from './lib/layout.mjs';
import { fileURLToPath } from 'node:url';
import { editOf, runHook, scratchProject, verdicts, writeOf } from './lib/selftest.mjs';

const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const SOURCE = /\.(c|cc|cpp|cxx|h|hh|hpp|mm|m|wgsl|metal|glsl|hlsl|slang)$/i;

function main() {
  let payload;
  try {
    payload = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return 0;
  }
  if (payload.tool_name !== 'Write') return 0;
  const file = payload.tool_input?.file_path;
  if (!file || existsSync(file) || !SOURCE.test(file)) return 0;
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

function selftest() {
  const hook = fileURLToPath(import.meta.url);
  const dir = scratchProject({ 'stray/Old.cpp': '// old\n' }, { folders: { dsp: { path: 'src/dsp', purpose: 'DSP' }, docs: { path: 'docs', purpose: 'docs' } }, concepts: {} });
  const w = (file) => runHook(hook, dir, writeOf(join(dir, file)));
  return verdicts('folder-law', [
    ['a new file in a layout folder', w('src/dsp/Svf.cpp'), 0],
    ['a new file outside the layout', w('stray/New.cpp'), 2],
    ['a new file loose in src/', w('src/Loose.cpp'), 2],
    ['an existing file outside the layout', w('stray/Old.cpp'), 0],
    ['an edit is never a new file', runHook(hook, dir, editOf(join(dir, 'stray/New.cpp'))), 0],
    ['a doc is not source', w('stray/notes.md'), 0],
    ['another project is not ours', runHook(hook, dir, writeOf(join(dirname(dir), 'elsewhere/x.cpp'))), 0],
  ]);
}

process.exit(process.argv.includes('--selftest') ? selftest() : main());
