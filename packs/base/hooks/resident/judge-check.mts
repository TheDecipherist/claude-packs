// resident/judge-check: the table check of the daemon's roles (review-2-go 2.12). A hook the table marks a judge runs in parallel with
// the other judges and writes nothing; a hook that writes is a recorder, and runs in turn. Each judge of a table is run here, on the
// events given, under a trap on the file system's writing calls, and a judge that wrote is named. fs is patched in this process and
// its named exports synchronised (so a module that imported `writeFileSync` is trapped too), then put back.
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { contextOf } from '../lib/hook-log.mts';
import { isVerdict } from '../lib/verdict.mts';
import type { Hook, HookEvent, HookTableRow } from '../lib/types.d.mts';

const WRITERS = ['writeFileSync', 'appendFileSync', 'mkdirSync', 'rmSync', 'rmdirSync', 'unlinkSync', 'renameSync', 'copyFileSync', 'symlinkSync', 'truncateSync', 'utimesSync', 'chmodSync', 'createWriteStream'] as const;
const PROMISED = ['writeFile', 'appendFile', 'mkdir', 'rm', 'unlink', 'rename', 'copyFile'] as const;
type Table = Record<string, unknown>;

/** Runs `run` with every writing call of fs recorded (and still made); the writes it saw. */
async function trapped(run: () => Promise<void>): Promise<string[]> {
  const seen: string[] = [];
  const undo: Array<() => void> = [];
  const intercept = (target: Table, name: string): void => {
    const original = target[name];
    if (typeof original !== 'function') return;
    target[name] = (...args: unknown[]): unknown => { seen.push(`${name} ${String(args[0])}`); return (original as (...a: unknown[]) => unknown)(...args); };
    undo.push(() => { target[name] = original; });
  };
  for (const name of WRITERS) intercept(fs as unknown as Table, name);
  for (const name of PROMISED) intercept(fs.promises as unknown as Table, name);
  const open = (fs as unknown as Table).openSync;
  if (typeof open === 'function') {
    (fs as unknown as Table).openSync = (path: unknown, flags?: unknown, ...rest: unknown[]): unknown => {
      if (flags !== undefined && flags !== 'r' && flags !== 0) seen.push(`openSync ${String(path)}`);
      return (open as (...a: unknown[]) => unknown)(path, flags, ...rest);
    };
    undo.push(() => { (fs as unknown as Table).openSync = open; });
  }
  syncBuiltinESMExports();
  try { await run(); } finally { for (const u of undo) u(); syncBuiltinESMExports(); }
  return seen;
}

/** The judges of `table` (hooks in `dir`, with the given file extension) that wrote a file while judging one of `events` in `project`. */
export async function judgesThatWrite(table: readonly HookTableRow[], dir: string, ext: string, project: string, events: readonly HookEvent[]): Promise<string[]> {
  const writers: string[] = [];
  for (const row of table.filter((r) => r.role === 'judge')) {
    const mod: unknown = await import(pathToFileURL(join(dir, `${row.hook}${ext}`)).href);
    const fn = (mod as { hook?: Hook }).hook;
    if (typeof fn !== 'function') continue;
    const writes = await trapped(async () => {
      for (const event of events) {
        const verdict: unknown = await fn(event, contextOf({ projectDir: project, cwd: project, env: {} }));
        if (!isVerdict(verdict)) writers.push(`${row.hook} (returned no Verdict)`);
      }
    });
    if (writes.length > 0) writers.push(row.hook);
  }
  return [...new Set(writers)];
}
