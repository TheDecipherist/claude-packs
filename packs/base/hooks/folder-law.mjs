#!/usr/bin/env node
// PreToolUse (Write): a NEW source file may only be created inside a layout folder.
// The layout lives in .claude/layout.json and is summarised in CLAUDE.md; this makes it structural.
// Existing files can always be edited; moving them is a separate, deliberate job.
import { existsSync, readFileSync } from 'node:fs';
import { relative } from 'node:path';
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
  if (payload.tool_name !== 'Write') return 0;
  const file = payload.tool_input?.file_path;
  if (!file || existsSync(file) || !SOURCE.test(file)) return 0;
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  if (rel.startsWith('..')) return 0;

  const layout = readLayout(ROOT);
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

process.exit(main());
