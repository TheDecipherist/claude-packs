#!/usr/bin/env node
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
import { readWav } from './lib/wav.mjs';
import { bandDb, centroid, differenceDb, firstSoundMs, loudness, mid, peakDb, periodSec, side, tailMs } from './lib/bank-measures.mjs';

const LIMITS = { chordPeak: -6, chordPeakSpan: 1, bankLu: 1, monoBelow: 120, sideUnder: -30, subBelow: 40, subUnder: -40, firstSoundMs: 20,
  velocityDb: 3, colourRatio: 1.05, wheelDb: -20, syncTolerance: 0.02, bellTolerance: 0.05 };
const FAST = new Set(['pluck', 'bass', 'lead', 'keys']);
const COLOURED = new Set(['pad', 'piano', 'keys']);
const BPMS = ['90', '120', '140'];

const line = (preset, id, ok, figure) => ({ preset: preset.name, id, ok, figure });
const fixed = (n, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : String(n));

// One row per measurement: which presets it applies to, the renders it needs, and what it measures. A new line is one new row.
const MEASURES = [
  { id: 'chord-peak', needs: ['chord'], run: (p, r) => { const v = peakDb(r.chord.channels); return [Math.abs(v - LIMITS.chordPeak) <= LIMITS.chordPeakSpan, `${fixed(v)} dBFS peak, wants ${LIMITS.chordPeak} +/- ${LIMITS.chordPeakSpan}`]; } },
  { id: 'mono-lows', needs: ['chord'], run: (p, r) => {
    const c = r.chord; const v = bandDb(side(c.channels), c.sampleRate, 0, LIMITS.monoBelow) - bandDb(mid(c.channels), c.sampleRate, 0, LIMITS.monoBelow);
    return [v <= LIMITS.sideUnder, `side ${fixed(v)} dB under the mid below ${LIMITS.monoBelow} Hz, wants ${LIMITS.sideUnder} or less`]; } },
  { id: 'nothing-under-40', needs: ['chord'], run: (p, r) => {
    const m = mid(r.chord.channels); const v = bandDb(m, r.chord.sampleRate, 0, LIMITS.subBelow) - bandDb(m, r.chord.sampleRate, 0, Infinity);
    return [v <= LIMITS.subUnder, `${fixed(v)} dB of the energy below ${LIMITS.subBelow} Hz, wants ${LIMITS.subUnder} or less`]; } },
  { id: 'tail', needs: ['note'], when: (p) => Number.isFinite(p.noteOff) && Number.isFinite(p.tail), run: (p, r) => {
    const v = tailMs(mid(r.note.channels), r.note.sampleRate, p.noteOff); return [v <= p.tail * 1000, `${fixed(v, 0)} ms to -60 dB after the note-off, stated ${p.tail * 1000} ms`]; } },
  { id: 'first-sound', needs: ['note'], when: (p) => FAST.has(p.kind), run: (p, r) => {
    const v = firstSoundMs(mid(r.note.channels), r.note.sampleRate); return [v <= LIMITS.firstSoundMs, `${fixed(v)} ms to the first sound, wants ${LIMITS.firstSoundMs} or less`]; } },
  { id: 'velocity', needs: ['v40', 'v110'], when: (p) => p.kind !== 'organ', run: (p, r) => {
    const level = peakDb(r.v110.channels) - peakDb(r.v40.channels);
    const colour = centroid(mid(r.v110.channels), r.v110.sampleRate) / Math.max(centroid(mid(r.v40.channels), r.v40.sampleRate), 1e-9);
    const loud = level >= LIMITS.velocityDb; const bright = colour >= LIMITS.colourRatio;
    return [COLOURED.has(p.kind) ? loud && bright : loud || bright, `v110 is ${fixed(level)} dB over v40, its centre x${fixed(colour, 2)}; wants ${LIMITS.velocityDb} dB ${COLOURED.has(p.kind) ? 'and' : 'or'} x${LIMITS.colourRatio}`]; } },
  { id: 'wheel', needs: ['wheel0', 'wheel127'], run: (p, r) => {
    const v = differenceDb(mid(r.wheel0.channels), mid(r.wheel127.channels)); return [v >= LIMITS.wheelDb, `wheel 127 differs from wheel 0 by ${fixed(v)} dB, wants ${LIMITS.wheelDb} or more`]; } },
  { id: 'sync', needs: ['sync'], when: (p) => Number.isFinite(p.syncBeats), run: (p, r) => {
    const off = BPMS.map((bpm) => { const want = (60 / Number(bpm)) * p.syncBeats; const s = r.sync[bpm]; const got = periodSec(mid(s.channels), s.sampleRate, want * 0.75, want * 1.25); return { bpm, want, got }; });
    return [off.every((o) => Math.abs(o.got - o.want) <= o.want * LIMITS.syncTolerance), off.map((o) => `${o.bpm} BPM ${fixed(o.got * 1000, 0)} ms (wants ${fixed(o.want * 1000, 0)})`).join(', ')]; } },
  { id: 'delay-off-the-arp', patch: true, when: (p) => p.patch?.delayDivision && p.patch?.arpDivision, run: (p) => [p.patch.delayDivision !== p.patch.arpDivision, `delay ${p.patch.delayDivision}, arp ${p.patch.arpDivision}`] },
  { id: 'pad-release', patch: true, when: (p) => p.kind === 'pad', run: (p) => [p.patch?.release >= p.patch?.attack, `release ${p.patch?.release} s, attack ${p.patch?.attack} s`] },
  { id: 'bell-release', patch: true, when: (p) => p.kind === 'bell', run: (p) => [Math.abs(p.patch?.release - p.patch?.decay) <= p.patch?.decay * LIMITS.bellTolerance, `release ${p.patch?.release} s, decay ${p.patch?.decay} s`] },
  { id: 'organ-velocity', patch: true, when: (p) => p.kind === 'organ', run: (p) => [p.patch?.velocityDepth === 0, `velocity depth ${p.patch?.velocityDepth}`] },
];

// The renders a preset names, read once: { chord: { sampleRate, channels }, sync: { 90: ... } }; a missing file is left out.
function rendersOf(preset, base) {
  const read = (f) => (f && existsSync(resolve(base, f)) ? readWav(readFileSync(resolve(base, f))) : undefined);
  const out = {};
  for (const [k, f] of Object.entries(preset.renders ?? {})) {
    if (k === 'sync') {
      const s = Object.fromEntries(BPMS.map((b) => [b, read(f?.[b])]));
      if (BPMS.every((b) => s[b])) out.sync = s;
    } else if (read(f)) out[k] = read(f);
  }
  return out;
}

export function proveBank(file) {
  const bank = JSON.parse(readFileSync(file, 'utf8'));
  const base = dirname(resolve(file));
  const lines = [];
  const levels = [];
  for (const preset of bank.presets ?? []) {
    const renders = rendersOf(preset, base);
    for (const m of MEASURES) {
      if (m.when && !m.when(preset)) continue;
      const lacking = (m.needs ?? []).filter((k) => !renders[k]);
      if (lacking.length) { lines.push(line(preset, m.id, false, `not measured: no ${lacking.join(', ')} render`)); continue; }
      const [ok, figure] = m.run(preset, renders);
      lines.push(line(preset, m.id, ok, figure));
    }
    if (renders.chord) levels.push({ name: preset.name, lufs: loudness(renders.chord.channels, renders.chord.sampleRate) });
  }
  if (levels.length > 1) {
    const span = Math.max(...levels.map((l) => l.lufs)) - Math.min(...levels.map((l) => l.lufs));
    lines.push({ preset: 'the bank', id: 'bank-loudness', ok: span <= LIMITS.bankLu, figure: `${fixed(span)} LU between the loudest and the quietest chord, wants ${LIMITS.bankLu} or less` });
  }
  return lines;
}

function main() {
  const file = process.argv[2];
  if (!file || !existsSync(file)) { console.error('usage: prove-a-bank.mjs <bank.json> [--json]'); return 2; }
  const lines = proveBank(file);
  if (process.argv.includes('--json')) console.log(JSON.stringify(lines, null, 2));
  else for (const l of lines) console.log(`${l.ok ? 'ok  ' : 'FAIL'}  ${l.preset}  ${l.id}: ${l.figure}`);
  const failed = lines.filter((l) => !l.ok).length;
  console.log(failed ? `prove-a-bank: ${failed} of ${lines.length} lines fail` : `prove-a-bank: all ${lines.length} lines pass`);
  return failed ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) process.exit(main());
