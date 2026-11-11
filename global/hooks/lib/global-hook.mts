// What the three global hooks share. Global cannot import the kit's hooks lib (a project's .claude holds that; ~/.claude does not),
// so the little they all need lives here, and `global add` installs this file beside them (lib/global.mts FILES): at hooks/lib for
// gnu-shell and shell-traps, at hooks/claude-packs/lib for version-pin-guard. Nothing here reads the process by itself: a hook's tail
// passes it what it needs, so every function is called the same way from a test.
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { HookEvent } from '../../../packs/base/hooks/lib/types.d.mts';

const real = (p: string): string => { try { return realpathSync(p); } catch { return resolve(p); } };

/** True when the module at `url` is the program node was started with (`argv1`), by real paths: started by a linked path (macOS's
 *  /var) or on Windows (`/C:/...`), it still runs (KWB-158). */
export const isMain = (url: string, argv1: string | undefined): boolean => Boolean(argv1) && real(argv1 ?? '') === real(fileURLToPath(url));

/** What arrives on stdin; empty when nothing does (a hook started by hand). */
export function stdinText(): string {
  try { return readFileSync(0, 'utf8'); } catch { return ''; }
}

/** The event in the text on stdin, or null when it is not a JSON object (the hook then lets the call through). The kit's json.mts is
 *  installed beside version-pin-guard only, so the three global hooks read their event here, once. */
export function eventOf(text: string): HookEvent | null {
  try {
    const parsed: unknown = JSON.parse(text || '{}');
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as HookEvent : null;
  } catch { return null; }
}

/** True when the path is a folder. */
export function isFolder(path: string): boolean {
  try { return statSync(path).isDirectory(); } catch { return false; }
}

/** The end of a selftest: what failed, printed, and the exit code (1 when anything did). `ok` is the line that says it passed. */
export function finish(name: string, failures: readonly string[], ok: string): number {
  for (const f of failures) console.error(`${name} selftest FAILED: ${f}`);
  if (!failures.length) console.log(`${name} selftest: ${ok}`);
  return failures.length ? 1 : 0;
}
