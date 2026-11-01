#!/usr/bin/env node
// PreToolUse (Write|Edit|MultiEdit): no source file grows past the line limit.
// A PostToolUse warning comes too late (the file has already grown and the extraction is rework),
// so this refuses the edit before it lands. Shrinking or keeping an already-long file is allowed,
// so splitting a big file is never blocked. Limit: layout.maxFileLines, default 300.
// `--selftest` proves it.
import { readFileSync } from 'node:fs';
import { extname, relative } from 'node:path';
import { computeEdit } from './lib/apply-edit.mjs';
import { matchesAny } from './lib/glob.mjs';
import { checkoutRoot, claudeRoot } from './lib/project.mjs';
import { readLayout } from './lib/layout.mjs';

const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
// Code, scripts, shaders and CMake files (Stellix's source rule counted scripts and CMake too); docs and data are not code.
const SOURCE = new Set(['.c', '.cc', '.cpp', '.cxx', '.h', '.hh', '.hpp', '.mm', '.m', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py', '.wgsl', '.metal', '.hlsl', '.glsl', '.vert', '.frag', '.sh', '.bash', '.cmake']);
const isSource = (rel) => SOURCE.has(extname(rel)) || /(^|\/)CMakeLists\.txt$/.test(rel);
const EXEMPT = ['**/*.generated.*', '**/generated/**', 'build/**', '_deps/**'];

const lines = (text) => (text === '' ? 0 : text.split('\n').length - (text.endsWith('\n') ? 1 : 0));

export function verdict(rel, before, after, limit) {
  if (!isSource(rel) || matchesAny(rel, EXEMPT)) return null;
  const n = lines(after);
  if (n <= limit || n <= lines(before)) return null;
  return `BLOCKED by file-size-guard: ${rel} would be ${n} lines (limit ${limit}).\n` +
    'Split it before adding more: move a cohesive part (a class, a group of pure functions, a table) into its own file in the same folder, then make this edit.\n';
}

function main() {
  let payload;
  try { payload = JSON.parse(readFileSync(0, 'utf8')); } catch { return 0; }
  const input = payload.tool_input ?? {};
  if (!input.file_path) return 0;
  if (relative(ROOT, input.file_path).startsWith('..')) return 0;
  const root = checkoutRoot(input.file_path);
  const rel = relative(root, input.file_path);
  const result = computeEdit(payload.tool_name, input);
  if (!result) return 0;
  const msg = verdict(rel, result.before, result.after, readLayout(claudeRoot(input.file_path)).maxFileLines ?? 300);
  if (!msg) return 0;
  process.stderr.write(msg);
  return 2;
}

function selftest() {
  const big = 'x\n'.repeat(300);
  const cases = [
    ['grows past the limit', verdict('src/dsp/Svf.cpp', big, `${big}y\n`, 300) !== null],
    ['at the limit is fine', verdict('src/dsp/Svf.cpp', '', big, 300) === null],
    ['shrinking a long file is allowed', verdict('src/dsp/Old.cpp', 'x\n'.repeat(500), 'x\n'.repeat(400), 300) === null],
    ['docs are not source', verdict('docs/spec.md', '', 'x\n'.repeat(900), 300) === null],
    ['generated code is exempt', verdict('src/gen/Tables.generated.h', '', 'x\n'.repeat(900), 300) === null],
    ['a shell script is code', verdict('tools/plants.sh', '', 'x\n'.repeat(301), 300) !== null],
    ['a CMakeLists.txt is code', verdict('lib/app/CMakeLists.txt', '', 'x\n'.repeat(301), 300) !== null],
  ];
  const bad = cases.filter(([, ok]) => !ok);
  for (const [name] of bad) console.error(`file-size-guard selftest FAILED: ${name}`);
  if (!bad.length) console.log(`file-size-guard selftest: OK (${cases.length} cases)`);
  return bad.length ? 1 : 0;
}

process.exit(process.argv.includes('--selftest') ? selftest() : main());
