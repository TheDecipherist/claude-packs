// prove-a-bank: the measurable lines of design-a-preset's gate, measured on a bank's renders and patch values, never typed.
//   node .claude/tools/prove-a-bank.mjs <bank.json> [--json]
// bank.json (paths relative to it; the renders come from bounce-a-plugin):
//   { "presets": [ { "name": "PAD . Slow Tide", "kind": "pad",
//       "renders": { "chord": "chord.wav", "note": "note.wav", "v40": "v40.wav", "v110": "v110.wav", "wheel0": "w0.wav",
//                    "wheel127": "w127.wav", "sync": { "90": "s90.wav", "120": "s120.wav", "140": "s140.wav" } },
//       "noteOff": 1.5, "tail": 3, "syncBeats": 0.75,
//       "patch": { "attack": 0.5, "decay": 1, "release": 1.5, "velocityDepth": 0.4, "delayDivision": "1/8.", "arpDivision": "1/16" } } ] }
// chord: a four-note chord at velocity 100. note: one note held to noteOff (s), then let ring. syncBeats: the synced part's period in
// beats, when a part is synced. Exit 1 when any line fails or a render it needs is missing; every line is printed with its figure.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { isMain } from '../hooks/lib/hook-log.mts';
import { readJson } from '../hooks/lib/json.mts';
import { readWav } from './lib/wav.mts';
import type { Wav } from './lib/wav.mts';
import { bandDb, centroid, differenceDb, firstSoundMs, loudness, mid, peakDb, periodSec, side, tailMs } from './lib/bank-measures.mts';

const LIMITS = { chordPeak: -6, chordPeakSpan: 1, bankLu: 1, monoBelow: 120, sideUnder: -30, subBelow: 40, subUnder: -40, firstSoundMs: 20,
  velocityDb: 3, colourRatio: 1.05, wheelDb: -20, syncTolerance: 0.02, bellTolerance: 0.05 };
const FAST: ReadonlySet<string> = new Set(['pluck', 'bass', 'lead', 'keys']);
const COLOURED: ReadonlySet<string> = new Set(['pad', 'piano', 'keys']);
const BPMS = ['90', '120', '140'] as const;

/** A preset of the bank: its renders (file names), when its note ends and how long its tail may be, and the patch values it states. */
export interface Preset {
  name: string; kind: string; renders?: Record<string, string | Record<string, string>>; noteOff?: number; tail?: number; syncBeats?: number;
  patch?: { attack?: number; decay?: number; release?: number; velocityDepth?: number; delayDivision?: string; arpDivision?: string };
}
/** One measured line: the preset, the law, whether it holds, and the figure. */
export interface BankLine { preset: string; id: string; ok: boolean; figure: string }
/** The renders a preset names that could be read: one Wav per name, and `sync` by tempo when all three tempos read. */
type Renders = Record<string, Wav | Record<string, Wav>>;
const isWav = (v: Wav | Record<string, Wav> | undefined): v is Wav => v !== undefined && 'channels' in v && v.channels instanceof Array;

const line = (preset: Preset, id: string, ok: boolean, figure: string): BankLine => ({ preset: preset.name, id, ok, figure });
const fixed = (n: number, d = 1): string => (Number.isFinite(n) ? n.toFixed(d) : String(n));
// The render a measure said it needs: present by the lacking check below, so a miss is a fault in the table.
const wav = (r: Renders, key: string): Wav => {
  const found = r[key];
  if (!isWav(found)) throw new Error(`no ${key} render`);
  return found;
};
const syncOf = (r: Renders): Record<string, Wav> => {
  const found = r['sync'];
  return found && !isWav(found) ? found : {};
};
const midOf = (r: Renders, key: string): Float64Array => mid(wav(r, key).channels);

interface Measure {
  id: string; needs?: readonly string[]; patch?: boolean; when?: (p: Preset) => boolean;
  run: (p: Preset, r: Renders) => [boolean, string];
}

// One row per measurement: which presets it applies to, the renders it needs, and what it measures. A new line is one new row.
const MEASURES: readonly Measure[] = [
  { id: 'chord-peak', needs: ['chord'], run: (p, r) => { const v = peakDb(wav(r, 'chord').channels); return [Math.abs(v - LIMITS.chordPeak) <= LIMITS.chordPeakSpan, `${fixed(v)} dBFS peak, wants ${LIMITS.chordPeak} +/- ${LIMITS.chordPeakSpan}`]; } },
  { id: 'mono-lows', needs: ['chord'], run: (p, r) => {
    const c = wav(r, 'chord'); const v = bandDb(side(c.channels), c.sampleRate, 0, LIMITS.monoBelow) - bandDb(mid(c.channels), c.sampleRate, 0, LIMITS.monoBelow);
    return [v <= LIMITS.sideUnder, `side ${fixed(v)} dB under the mid below ${LIMITS.monoBelow} Hz, wants ${LIMITS.sideUnder} or less`]; } },
  { id: 'nothing-under-40', needs: ['chord'], run: (p, r) => {
    const m = midOf(r, 'chord'); const rate = wav(r, 'chord').sampleRate; const v = bandDb(m, rate, 0, LIMITS.subBelow) - bandDb(m, rate, 0, Infinity);
    return [v <= LIMITS.subUnder, `${fixed(v)} dB of the energy below ${LIMITS.subBelow} Hz, wants ${LIMITS.subUnder} or less`]; } },
  { id: 'tail', needs: ['note'], when: (p) => Number.isFinite(p.noteOff) && Number.isFinite(p.tail), run: (p, r) => {
    const v = tailMs(midOf(r, 'note'), wav(r, 'note').sampleRate, p.noteOff ?? 0); return [v <= (p.tail ?? 0) * 1000, `${fixed(v, 0)} ms to -60 dB after the note-off, stated ${(p.tail ?? 0) * 1000} ms`]; } },
  { id: 'first-sound', needs: ['note'], when: (p) => FAST.has(p.kind), run: (p, r) => {
    const v = firstSoundMs(midOf(r, 'note'), wav(r, 'note').sampleRate); return [v <= LIMITS.firstSoundMs, `${fixed(v)} ms to the first sound, wants ${LIMITS.firstSoundMs} or less`]; } },
  { id: 'velocity', needs: ['v40', 'v110'], when: (p) => p.kind !== 'organ', run: (p, r) => {
    const level = peakDb(wav(r, 'v110').channels) - peakDb(wav(r, 'v40').channels);
    const colour = centroid(midOf(r, 'v110'), wav(r, 'v110').sampleRate) / Math.max(centroid(midOf(r, 'v40'), wav(r, 'v40').sampleRate), 1e-9);
    const loud = level >= LIMITS.velocityDb; const bright = colour >= LIMITS.colourRatio;
    return [COLOURED.has(p.kind) ? loud && bright : loud || bright, `v110 is ${fixed(level)} dB over v40, its centre x${fixed(colour, 2)}; wants ${LIMITS.velocityDb} dB ${COLOURED.has(p.kind) ? 'and' : 'or'} x${LIMITS.colourRatio}`]; } },
  { id: 'wheel', needs: ['wheel0', 'wheel127'], run: (p, r) => {
    const v = differenceDb(midOf(r, 'wheel0'), midOf(r, 'wheel127')); return [v >= LIMITS.wheelDb, `wheel 127 differs from wheel 0 by ${fixed(v)} dB, wants ${LIMITS.wheelDb} or more`]; } },
  { id: 'sync', needs: ['sync'], when: (p) => Number.isFinite(p.syncBeats), run: (p, r) => {
    const off = BPMS.map((bpm) => {
      const want = (60 / Number(bpm)) * (p.syncBeats ?? 0); const s = syncOf(r)[bpm];
      return { bpm, want, got: s ? periodSec(mid(s.channels), s.sampleRate, want * 0.75, want * 1.25) : NaN };
    });
    return [off.every((o) => Math.abs(o.got - o.want) <= o.want * LIMITS.syncTolerance), off.map((o) => `${o.bpm} BPM ${fixed(o.got * 1000, 0)} ms (wants ${fixed(o.want * 1000, 0)})`).join(', ')]; } },
  { id: 'delay-off-the-arp', patch: true, when: (p) => Boolean(p.patch?.delayDivision && p.patch?.arpDivision), run: (p) => [p.patch?.delayDivision !== p.patch?.arpDivision, `delay ${p.patch?.delayDivision}, arp ${p.patch?.arpDivision}`] },
  { id: 'pad-release', patch: true, when: (p) => p.kind === 'pad', run: (p) => [(p.patch?.release ?? NaN) >= (p.patch?.attack ?? NaN), `release ${p.patch?.release} s, attack ${p.patch?.attack} s`] },
  { id: 'bell-release', patch: true, when: (p) => p.kind === 'bell', run: (p) => [Math.abs((p.patch?.release ?? NaN) - (p.patch?.decay ?? NaN)) <= (p.patch?.decay ?? NaN) * LIMITS.bellTolerance, `release ${p.patch?.release} s, decay ${p.patch?.decay} s`] },
  { id: 'organ-velocity', patch: true, when: (p) => p.kind === 'organ', run: (p) => [p.patch?.velocityDepth === 0, `velocity depth ${p.patch?.velocityDepth}`] },
];

// The renders a preset names, read once: { chord: { sampleRate, channels }, sync: { 90: ... } }; a missing file is left out.
function rendersOf(preset: Preset, base: string): Renders {
  const read = (f: string | undefined): Wav | undefined => (f && existsSync(resolve(base, f)) ? readWav(readFileSync(resolve(base, f))) : undefined);
  const out: Renders = {};
  for (const [k, f] of Object.entries(preset.renders ?? {})) {
    if (k === 'sync') {
      const tempos = typeof f === 'object' ? f : {};
      const read3 = BPMS.map((b) => [b, read(tempos[b])] as const);
      if (read3.every(([, w]) => w)) out.sync = Object.fromEntries(read3.flatMap(([b, w]) => (w ? [[b, w]] : [])));
    } else if (typeof f === 'string') {
      const w = read(f);
      if (w) out[k] = w;
    }
  }
  return out;
}

export function proveBank(file: string): BankLine[] {
  const bank = readJson<{ presets?: Preset[] }>(file);
  if (!bank) throw new Error(`${file} is not a bank (JSON that holds "presets")`);
  const base = dirname(resolve(file));
  const lines: BankLine[] = [];
  const levels: { name: string; lufs: number }[] = [];
  for (const preset of bank.presets ?? []) {
    const renders = rendersOf(preset, base);
    for (const m of MEASURES) {
      if (m.when && !m.when(preset)) continue;
      const lacking = (m.needs ?? []).filter((k) => !renders[k]);
      if (lacking.length) { lines.push(line(preset, m.id, false, `not measured: no ${lacking.join(', ')} render`)); continue; }
      const [ok, figure] = m.run(preset, renders);
      lines.push(line(preset, m.id, ok, figure));
    }
    const chord = renders['chord'];
    if (isWav(chord)) levels.push({ name: preset.name, lufs: loudness(chord.channels, chord.sampleRate) });
  }
  if (levels.length > 1) {
    const span = Math.max(...levels.map((l) => l.lufs)) - Math.min(...levels.map((l) => l.lufs));
    lines.push({ preset: 'the bank', id: 'bank-loudness', ok: span <= LIMITS.bankLu, figure: `${fixed(span)} LU between the loudest and the quietest chord, wants ${LIMITS.bankLu} or less` });
  }
  return lines;
}

function main(args: readonly string[]): number {
  const file = args[0];
  if (!file || !existsSync(file)) { console.error('usage: prove-a-bank.mjs <bank.json> [--json]'); return 2; }
  const lines = proveBank(file);
  if (args.includes('--json')) console.log(JSON.stringify(lines, null, 2));
  else for (const l of lines) console.log(`${l.ok ? 'ok  ' : 'FAIL'}  ${l.preset}  ${l.id}: ${l.figure}`);
  const failed = lines.filter((l) => !l.ok).length;
  console.log(failed ? `prove-a-bank: ${failed} of ${lines.length} lines fail` : `prove-a-bank: all ${lines.length} lines pass`);
  return failed ? 1 : 0;
}

// by real paths: started by a linked path (macOS's /var, a linked project folder) or on Windows, it still runs (KWB-158)
if (isMain(import.meta.url)) process.exit(main(process.argv.slice(2)));
