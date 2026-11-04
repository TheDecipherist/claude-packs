#!/usr/bin/env node
// Freeze the files that define "fixed" before changing the code that must satisfy them.
//   node .claude/tools/freeze.mjs on "<reason>" <file-or-glob>...
//   node .claude/tools/freeze.mjs off
//   node .claude/tools/freeze.mjs status
// The frozen-files hook refuses edits to anything on the list until it is turned off.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const STATE = join(ROOT, '.claude', 'state', 'frozen.json');
const [cmd, reason, ...files] = process.argv.slice(2);

if (cmd === 'on') {
  if (!reason || files.length === 0) {
    console.error('usage: freeze.mjs on "<reason>" <file-or-glob>...');
    process.exit(2);
  }
  mkdirSync(join(ROOT, '.claude', 'state'), { recursive: true });
  const prev = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')).files ?? [] : [];
  const all = [...new Set([...prev, ...files])];
  writeFileSync(STATE, `${JSON.stringify({ reason, files: all, since: new Date().toISOString() }, null, 2)}\n`);
  console.log(`frozen (${reason}):\n${all.map((f) => `  ${f}`).join('\n')}`);
} else if (cmd === 'off') {
  rmSync(STATE, { force: true });
  console.log('nothing frozen');
} else if (cmd === 'status') {
  console.log(existsSync(STATE) ? readFileSync(STATE, 'utf8') : 'nothing frozen');
} else {
  console.error('usage: freeze.mjs on "<reason>" <files...> | off | status');
  process.exit(2);
}
