#!/usr/bin/env node
// One way to start the kit's tests, for `npm test` and `npm run test:changed` alike (KWB-219). A test file that asserts a time or a
// memory budget measures the machine as much as the code: beside other files running at once it reads 583 ms where it reads 21 ms
// alone, and a gate that cannot go green cannot release. Such a file says so on one of its first lines, `// runs alone: <why>`, and
// the run starts it after every other file has ended, one at a time.
//
//   splitAlone(files, root) -> { together, alone }   the files that share the machine, and the ones that wait for it
//   runTests(files, concurrency, root, env) -> the exit code: 0 only when both phases are green
//   node scripts/run-tests.mjs [file ...]            the whole suite when no file is named
import { globSync, readFileSync } from 'node:fs';
import { loadavg } from 'node:os';
import { dirname, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { isMain } from '../packs/base/hooks/lib/hook-log.mts';
import type { Env } from '../packs/base/hooks/lib/types.d.mts';
import { runHeld } from './run-held.mts';

const MARK = /^\/\/ runs alone: \S/;
const MARK_LINES = 6;   // the mark sits in the header comment
const DEFAULT_CONCURRENCY = 6;
const SETTLE_LOAD = 5;   // the 1-minute load the machine falls to before the alone files start: the first phase leaves daemons and git work behind
const SETTLE_POLL_MS = 5_000;
const SETTLE_MAX_MS = 180_000;
const SUITE = ['test/*.test.mjs', 'test/**/*.test.mts'];

export function splitAlone(files: readonly string[], root: string): { together: string[]; alone: string[] } {
  const marked = (file: string): boolean => readFileSync(resolve(root, file), 'utf8').split('\n', MARK_LINES).some((line) => MARK.test(line));
  return { together: files.filter((f) => !marked(f)), alone: files.filter(marked) };
}

/** node's test runner on `files`, with the fresh-tmp preload (KWB-2); `NODE_TEST_CONTEXT` is dropped so a nested run reports its own failures. */
const phase = (files: readonly string[], concurrency: number, root: string, env: Env): Promise<number> => {
  if (files.length === 0) return Promise.resolve(0);
  const { NODE_TEST_CONTEXT: _context, ...nested } = env;
  const args = ['--import', './test/fresh-tmp.mts', '--test', `--test-concurrency=${concurrency}`, ...files];
  console.log(`running: node ${args.join(' ')}`);
  return runHeld(process.execPath, args, { cwd: root, env: nested });
};

/** Waits for the machine to quiet after the shared phase, so an alone file measures itself (a 25-times slower Write was read on a machine still busy). */
async function settle(): Promise<void> {
  for (let waited = 0; waited < SETTLE_MAX_MS && (loadavg()[0] ?? 0) > SETTLE_LOAD; waited += SETTLE_POLL_MS) await delay(SETTLE_POLL_MS);
}

export async function runTests(files: readonly string[], concurrency: number, root: string, env: Env): Promise<number> {
  const { together, alone } = splitAlone(files, root);
  const first = await phase(together, concurrency, root, env);
  if (alone.length > 0) await settle();
  if (alone.length > 0) console.log(`\nrunning alone, one file at a time (${alone.length}): ${alone.join(' ')}`);
  const second = await phase(alone, 1, root, env);
  return first === 0 && second === 0 ? 0 : first || second;
}

if (isMain(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const named = process.argv.slice(2);
  const files = named.length > 0 ? named : SUITE.flatMap((pattern) => globSync(pattern, { cwd: root })).sort();
  process.exit(await runTests(files, Number(process.env['CLAUDE_PACKS_TEST_CORES']) || DEFAULT_CONCURRENCY, root, process.env));
}
