// Reading a project's `.claude/logs/*.jsonl`, the one place: `logs` and `logs skills|rules` both read through it.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readText } from '../packs/base/hooks/lib/files.mts';
import { parseJson } from '../packs/base/hooks/lib/json.mts';

/** The logs folder, relative to the project. */
export const LOG_DIR = join('.claude', 'logs');

/** Every parsed line of `.claude/logs/<name>.jsonl` and its rotated files (`<name>-<stamp>.jsonl`), oldest file first. */
export function readJsonl(dir: string, name: string): unknown[] {
  const logs = join(dir, LOG_DIR);
  let files: string[] = [];
  try { files = readdirSync(logs).filter((f) => f === `${name}.jsonl` || (f.startsWith(`${name}-`) && f.endsWith('.jsonl'))).sort(); } catch { return []; }
  return files.flatMap((f) => (readText(join(logs, f)) ?? '').split('\n').filter(Boolean).map((l) => parseJson(l)));
}
