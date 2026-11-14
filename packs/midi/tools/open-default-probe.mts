// Judge the sync default of each time destination at open, untouched: the check `clock-probe` step 1 asks for.
//   node .claude/tools/open-default-probe.mjs <spec.json>
// The spec: { "destinations": [{ "name", "kind": "delay"|"lfo"|"envelope"|"timbre", "mode": "standalone"|"plugin",
//   "hardware"?: "synced"|"free", "stored"?: "synced"|"free" }], "measured": [{ "name", "at120": <ms or Hz>, "at90": <same unit> }] }
// "measured" is each destination's value read from the audio at open with no touch, at 120 and at 90 BPM, a TIME in ms
// (the same unit at both tempos; a rate in Hz is the inverse, so give its period). Synced means the time scales with the
// tempo (at90 / at120 = 120 / 90); free means it does not move.
// Exit 0: every destination opens as required. Exit 1: the faults, listed. Exit 2: the command was used wrongly.
import { isMain } from '../hooks/lib/hook-log.mts';
import { readJson } from '../hooks/lib/json.mts';

export type Kind = 'delay' | 'lfo' | 'envelope' | 'timbre';
export type Mode = 'standalone' | 'plugin';
export type State = 'synced' | 'free';

export interface Destination { name: string; kind: Kind; mode: Mode; hardware?: State; stored?: State }
export interface Measured { name: string; at120: number; at90: number }

const KINDS: readonly string[] = ['delay', 'lfo', 'envelope', 'timbre'];
const MODES: readonly string[] = ['standalone', 'plugin'];
const STATES: readonly string[] = ['synced', 'free'];

/** The first field of a destination that is not in its list (a typo is never read as a plugin or a non-delay), or null. */
export function invalidField(d: Destination): string | null {
  if (!KINDS.includes(d.kind)) return `${d.name}: kind "${d.kind}" is not one of ${KINDS.join(', ')}`;
  if (!MODES.includes(d.mode)) return `${d.name}: mode "${d.mode}" is not one of ${MODES.join(', ')}`;
  for (const field of ['hardware', 'stored'] as const) {
    const value = d[field];
    if (value !== undefined && !STATES.includes(value)) return `${d.name}: ${field} "${value}" is not one of ${STATES.join(', ')}`;
  }
  return null;
}

const TOLERANCE = 0.02;
const SYNCED_RATIO = 120 / 90;

/** What a destination must be when the unit opens: a timbre time free (C9: never tempo, stored or not), else its stored state, else by kind and mode (the decided defaults). */
export function requiredDefault(d: Destination): State {
  if (d.kind === 'timbre') return 'free';
  if (d.stored !== undefined) return d.stored;
  if (d.mode === 'standalone') return d.hardware ?? 'free';
  return d.kind === 'delay' ? 'synced' : 'free';
}

/** What the measured pair shows: the time grows by 120/90 from 120 to 90 BPM when synced, stays when free, anything else is neither. */
export function observedState(m: Measured): State | 'neither' {
  if (!(m.at120 > 0) || !(m.at90 > 0)) return 'neither';
  const ratio = m.at90 / m.at120;
  if (Math.abs(ratio - SYNCED_RATIO) <= TOLERANCE * SYNCED_RATIO) return 'synced';
  if (Math.abs(ratio - 1) <= TOLERANCE) return 'free';
  return 'neither';
}

/** The faults of a unit's open state: one line per destination that opens wrong, or has no measurement. */
export function judge(destinations: readonly Destination[], measured: readonly Measured[]): string[] {
  return destinations.flatMap((d) => {
    const m = measured.find((x) => x.name === d.name);
    if (m === undefined) return [`${d.name}: not measured at open`];
    const need = requiredDefault(d);
    const got = observedState(m);
    return got === need ? [] : [`${d.name} (${d.kind}, ${d.mode}): must open ${need}, measured ${got} (${m.at120} at 120 BPM, ${m.at90} at 90 BPM)`];
  });
}

function main(args: readonly string[]): number {
  const file = args[0];
  if (file === undefined) { console.error('usage: open-default-probe.mjs <spec.json>'); return 2; }
  const spec = readJson<{ destinations?: Destination[]; measured?: Measured[] }>(file);
  if (spec === null) { console.error(`cannot read ${file} as JSON`); return 2; }
  if (!Array.isArray(spec.destinations) || !Array.isArray(spec.measured)) { console.error('the spec needs "destinations" and "measured"'); return 2; }
  const bad = spec.destinations.map(invalidField).find((m) => m !== null);
  if (bad) { console.error(bad); return 2; }
  const faults = judge(spec.destinations, spec.measured);
  for (const line of faults) console.log(line);
  if (faults.length === 0) console.log(`${spec.destinations.length} destinations open as required`);
  return faults.length === 0 ? 0 : 1;
}

if (isMain(import.meta.url)) process.exit(main(process.argv.slice(2)));
