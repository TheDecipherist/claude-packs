#!/usr/bin/env node
// PreToolUse (Write|Edit|MultiEdit|NotebookEdit|Bash): no source file grows past the line limit, by any route
// (a tool, or the shell's >, >>, tee, sed -i, cp, mv, a heredoc; lib/writes.mjs).
// A PostToolUse warning comes too late (the file has already grown and the extraction is rework),
// so this refuses the edit before it lands. Shrinking or keeping an already-long file is allowed,
// so splitting a big file is never blocked. Limit: layout.maxFileLines, default 300.
// `--selftest` proves it.
import { readFileSync } from 'node:fs';
import { extname, relative } from 'node:path';
import { writesOf } from './lib/writes.mjs';
import { matchesAny } from './lib/glob.mjs';
import { checkoutRoot, claudeRoot } from './lib/project.mjs';
import { readLayout } from './lib/layout.mjs';
import { verdicts } from './lib/selftest.mjs';
import { isContent } from './lib/content.mjs';
import { asHook, isMain } from './lib/hook-log.mjs';
import { extsOf } from './lib/source-exts.mjs';

const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
// Code, scripts, shaders and CMake files (Stellix's source rule counted scripts and CMake too); docs and data are not code.
const SOURCE = extsOf('c', 'cpp', 'objc', 'js', 'ts', 'python', 'shader', 'shell', 'cmake');
const isSource = (rel) => SOURCE.has(extname(rel)) || /(^|\/)CMakeLists\.txt$/.test(rel);
const EXEMPT = ['**/*.generated.*', '**/generated/**', 'build/**', '_deps/**'];

const lines = (text) => (text === '' ? 0 : text.split('\n').length - (text.endsWith('\n') ? 1 : 0));

export function verdict(rel, before, after, limit) {
  if (!isSource(rel) || matchesAny(rel, EXEMPT) || isContent(rel)) return null;
  const n = lines(after);
  if (n <= limit || n <= lines(before)) return null;
  return `BLOCKED by file-size-guard: ${rel} would be ${n} lines (limit ${limit}).\n` +
    'Split it before adding more: move a cohesive part (a class, a group of pure functions, a table) into its own file in the same folder, then make this edit.\n';
}

function main(text) {
  let payload;
  try { payload = JSON.parse(text); } catch { return 0; }
  for (const w of writesOf(payload)) {
    if (w.after === null || relative(ROOT, w.path).startsWith('..')) continue;
    const rel = relative(checkoutRoot(w.path), w.path);
    const msg = verdict(rel, w.before, w.after, readLayout(claudeRoot(w.path)).maxFileLines ?? 300);
    if (msg) { process.stderr.write(msg); return 2; }
  }
  return 0;
}

function selftest() {
  const big = 'x\n'.repeat(300);
  const cases = [
    ['grows past the limit', verdict('src/core/Svf.cpp', big, `${big}y\n`, 300) !== null],
    ['at the limit is fine', verdict('src/core/Svf.cpp', '', big, 300) === null],
    ['shrinking a long file is allowed', verdict('src/core/Old.cpp', 'x\n'.repeat(500), 'x\n'.repeat(400), 300) === null],
    ['docs are not source', verdict('docs/spec.md', '', 'x\n'.repeat(900), 300) === null],
    ['generated code is exempt', verdict('src/gen/Tables.generated.h', '', 'x\n'.repeat(900), 300) === null],
    ['a shell script is code', verdict('tools/plants.sh', '', 'x\n'.repeat(301), 300) !== null],
    ['a CMakeLists.txt is code', verdict('lib/app/CMakeLists.txt', '', 'x\n'.repeat(301), 300) !== null],
    ['a .mts is code (W1.6)', verdict('lib/sync.mts', '', 'x\n'.repeat(301), 300) !== null],
    ['a .cts is code (W1.6)', verdict('lib/old.cts', '', 'x\n'.repeat(301), 300) !== null],
  ];
  return verdicts('file-size-guard', cases.map(([label, ok]) => [label, ok, true]));
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? selftest() : await asHook('file-size-guard', main));
