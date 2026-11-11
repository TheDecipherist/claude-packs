#!/usr/bin/env node
// Freeze the files that define "fixed" before changing the code that must satisfy them.
//   node .claude/tools/freeze.mjs on "<reason>" <file-or-glob>...
//   node .claude/tools/freeze.mjs off
//   node .claude/tools/freeze.mjs status
// The frozen-files hook refuses edits to anything on the list until it is turned off.
// Typed (typescript order W4): the project's folder and the time are passed to `main`, never read by it.
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { isMain } from '../hooks/lib/hook-log.mts';
import { readJson, writeJson } from '../hooks/lib/json.mts';

const USAGE = 'usage: freeze.mjs on "<reason>" <files...> | off | status';

/** `.claude/state/frozen.json`: the frozen globs, why, and since when. */
interface FrozenList { reason?: string; files?: string[]; since?: string }

/** Turns the freeze on (adding to what is frozen already), off, or says what is frozen. */
export function main(args: readonly string[], root: string, now: Date): number {
  const [cmd, reason, ...files] = args;
  const state = join(root, '.claude', 'state', 'frozen.json');
  if (cmd === 'on') {
    if (!reason || files.length === 0) {
      console.error('usage: freeze.mjs on "<reason>" <file-or-glob>...');
      return 2;
    }
    mkdirSync(join(root, '.claude', 'state'), { recursive: true });
    const all = [...new Set([...(readJson<FrozenList>(state)?.files ?? []), ...files])];
    if (!writeJson(state, { reason, files: all, since: now.toISOString() }, { pretty: true })) {
      console.error(`freeze.mjs: could not write ${state}`);
      return 1;
    }
    console.log(`frozen (${reason}):\n${all.map((f) => `  ${f}`).join('\n')}`);
    return 0;
  }
  if (cmd === 'off') {
    rmSync(state, { force: true });
    console.log('nothing frozen');
    return 0;
  }
  if (cmd === 'status') {
    console.log(existsSync(state) ? readFileSync(state, 'utf8') : 'nothing frozen');
    return 0;
  }
  console.error(USAGE);
  return 2;
}

if (isMain(import.meta.url)) process.exit(main(process.argv.slice(2), process.env['CLAUDE_PROJECT_DIR'] ?? process.cwd(), new Date()));
