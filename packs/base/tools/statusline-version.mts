// The version beside the kit's name on the status line, and its red dot (typescript order W8.6, the user, 2026-11-12: "next to the
// claude-packs version number there should be a red dot if it is out of date"). The dot shows when npm's newest version is newer than
// the one the project runs; a `work/` checkout ahead of npm shows none. No render waits on the network: npm's answer is the one
// kit-fresh keeps in the user's cache folder (hooks/lib/kit-fresh-look.mts), which the daemon renews at most hourly.
import { join } from 'node:path';
import { readJson } from '../hooks/lib/json.mts';
import { cacheDir, compareVersions } from '../hooks/lib/kit-fresh-look.mts';
import type { Env } from '../hooks/lib/types.d.mts';
import { bold, COLOURS as C, type Paint, type PaintMode } from './statusline-paint.mts';

/** npm's newest version as kit-fresh last kept it (any age: the render never asks), or null. */
export function keptNewest(env: Env): string | null {
  const v: unknown = readJson<{ version?: unknown }>(join(cacheDir(env), 'kit-fresh.json'))?.version;
  return typeof v === 'string' && v !== '' ? v : null;
}

/** Whether npm has a newer version than the project runs. */
export const outOfDate = (version: string | null, newest: string | null): boolean => version !== null && newest !== null && compareVersions(newest, version) > 0;

/** `claude-packs 2.0.0`, with a red dot after it when the project is out of date; '' with no version. */
export function versionSegment(version: string | null, newest: string | null, paint: Paint, mode: PaintMode): string {
  if (!version) return '';
  return bold(paint(`claude-packs ${version}`, C.orange), mode) + (outOfDate(version, newest) ? ` ${paint('●', C.red)}` : '');
}
