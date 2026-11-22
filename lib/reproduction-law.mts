// The reproduction law, held mechanically (the user, 2026-11-22: "this needs to be ironclad in the harness"). supernova2_monitor
// built a machine's engine from its manual and 120 [ASSUMED] laws while its firmware held every formula: the project never said it
// was a reproduction, its stage orders named none of the firmware-derivation skills and no oracle, and nothing refused either.
//   reproductionOrderRefusals(dir, orderText) -> workorder check's refusals: a reverse-engineering project with no declared kind;
//     in a reproduction, a step that builds engine code without the derivation skills on its Skills line or an oracle in its
//     Done when
//   engineDebtProblems(dir) -> doctor's problems: a reproduction's engine code holding more [ASSUMED] and [EAR] laws than its
//     checked-in floor (docs/engine-debt.json), or engine code with no floor written
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { readText } from '../packs/base/hooks/lib/files.mts';
import { readLayout } from '../packs/base/hooks/lib/layout.mts';
import { parseJson } from '../packs/base/hooks/lib/json.mts';
import { readLock } from './manifest.mts';

/** The layout's folder keys that hold a synth's engine (the audio-core pack's names). */
export const ENGINE_KEYS = ['audio', 'engines', 'dsp'] as const;

/** The skills a reproduction's engine step must carry: the host's coefficient builders read, the DSP program read. */
export const DERIVE_SKILLS = ['trace-the-builders', 'read-the-dsp-program'] as const;

/** The checked-in floor of a reproduction's engine debt. */
export const DEBT_FILE = 'docs/engine-debt.json';

/** A law tag that is a debt, not a source: a guess or an ear's fit. */
const DEBT_TAG = /\[(?:ASSUMED|EAR)\b/g;

/** The instrument's declared kind, or null when the layout does not say. */
export function instrumentKind(dir: string): 'reproduction' | 'original' | null {
  const guards = readLayout(dir)['guards'] as Record<string, unknown> | undefined;
  const kind = (guards?.['instrument'] as Record<string, unknown> | undefined)?.['kind'];
  return kind === 'reproduction' || kind === 'original' ? kind : null;
}

/** The engine folders' paths from the layout (each key's `path`), those the layout names. */
export function enginePaths(dir: string): string[] {
  const folders = (readLayout(dir)['folders'] ?? {}) as Record<string, { path?: string }>;
  return ENGINE_KEYS.flatMap((key) => (folders[key]?.path ? [folders[key].path] : []));
}

const reverseEngineering = (dir: string): boolean => readLock(join(dir, '.claude')).packs.includes('reverse-engineering');

/** Each `## W` step of an order: its heading line, and its text up to the next step. */
function steps(text: string): { head: string; body: string }[] {
  return text.split(/^(?=## W\d)/m).filter((part) => /^## W\d/.test(part)).map((part) => ({
    head: part.split('\n')[0]?.replace(/^##\s*/, '') ?? '',
    body: part,
  }));
}

/** The refusals the reproduction law adds to `workorder check`. */
export function reproductionOrderRefusals(dir: string, text: string): string[] {
  const kind = instrumentKind(dir);
  if (kind === null) {
    if (!reverseEngineering(dir)) return [];
    return ['the project rebuilds a machine (reverse-engineering is installed) and does not say whether it is a reproduction: '
      + 'set .claude/layout.json "guards": { "instrument": { "kind": "reproduction" } } (or "original"), so the laws for each hold'];
  }
  if (kind !== 'reproduction') return [];
  const paths = enginePaths(dir);
  return steps(text).flatMap(({ head, body }) => {
    if (!paths.some((p) => body.includes(`${p}/`) || body.includes(`\`${p}\``))) return [];
    const skills = body.match(/^\*\*Skills:\*\*(.*)$/m)?.[1] ?? '';
    const missing = DERIVE_SKILLS.filter((s) => !skills.includes(`\`${s}\``));
    const done = body.split(/^\*\*Done when:\*\*/m)[1] ?? '';
    const found: string[] = [];
    if (missing.length) {
      found.push(`step "${head}" builds engine code in a reproduction without ${missing.map((s) => `\`${s}\``).join(' and ')} `
        + 'on its Skills line: a reproduction\'s engine laws come from the firmware, read by those skills');
    }
    if (!/oracle/i.test(done)) {
      found.push(`step "${head}" builds engine code in a reproduction and its Done when names no oracle: each routine is ported `
        + 'and checked against the machine\'s own code run as an oracle, block for block');
    }
    return found;
  });
}

// Every file under a folder, by its path from the project.
function filesUnder(dir: string, rel: string): string[] {
  const abs = join(dir, rel);
  if (!existsSync(abs) || !statSync(abs).isDirectory()) return [];
  return (readdirSync(abs, { recursive: true }) as string[]).map((f) => join(rel, f)).filter((f) => statSync(join(dir, f)).isFile());
}

/** The engine's debt: every [ASSUMED] and [EAR] tag in the engine folders, counted. */
export function engineDebt(dir: string): { count: number; files: number } {
  const files = enginePaths(dir).flatMap((p) => filesUnder(dir, p));
  const count = files.reduce((sum, f) => sum + (readText(join(dir, f))?.match(DEBT_TAG)?.length ?? 0), 0);
  return { count, files: files.length };
}

/** The problems the reproduction law adds to doctor: a debt over its floor, or engine code with no floor written. */
export function engineDebtProblems(dir: string): string[] {
  if (instrumentKind(dir) !== 'reproduction') return [];
  const { count, files } = engineDebt(dir);
  if (files === 0) return [];
  const floorText = readText(join(dir, DEBT_FILE));
  const floor = floorText === null ? null : (parseJson(floorText) as { floor?: unknown } | null)?.floor;
  if (typeof floor !== 'number') {
    return [`a reproduction's engine holds ${count} [ASSUMED] and [EAR] law(s) and ${DEBT_FILE} sets no floor: write `
      + `{ "floor": ${count}, "why": "..." } and lower it as the firmware's laws replace them; it never rises`];
  }
  if (count <= floor) return [];
  return [`a reproduction's engine holds ${count} [ASSUMED] and [EAR] law(s), over its floor of ${floor} (${DEBT_FILE}): `
    + 'a new law comes from the firmware, read by trace-the-builders and read-the-dsp-program, never from a guess'];
}
