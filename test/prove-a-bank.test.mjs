// planner W5.6: prove-a-bank measures design-a-preset's gate on renders, never on typed values. A synthetic bank passes every line;
// one planted fault per measurement fails exactly that line. Run from an install, as a project runs it (its WAV reader and FFT are
// audio-core's, installed beside it).
import { assert, cli, fresh, join, spawnSync, test, writeFileSync } from './kit-cli.mts';
import { writeWav } from '../packs/audio-core/tools/lib/wav.mjs';
import { symlinkSync } from 'node:fs';

const RATE = 44100;
const dbToGain = (d) => 10 ** (d / 20);
const seconds = (s) => Math.round(s * RATE);

// A sum of partials ({ f, a }) with an envelope gain(t), as one channel.
function tone(partials, length, gain = () => 1) {
  const x = new Float64Array(seconds(length));
  for (let i = 0; i < x.length; i += 1) {
    const t = i / RATE;
    x[i] = gain(t) * partials.reduce((s, { f, a }) => s + a * Math.sin(2 * Math.PI * f * t), 0);
  }
  return x;
}
const atPeak = (x, peakDb) => { const p = x.reduce((m, v) => Math.max(m, Math.abs(v)), 0); return x.map((v) => (v / p) * dbToGain(peakDb)); };
const stereo = (x) => [x, x];

const CHORD = [220, 277.18, 329.63, 440].map((f) => ({ f, a: 1 }));
const chord = (extra = []) => stereo(atPeak(tone([...CHORD, ...extra], 1), -6));
// One note: a 1 ms attack, held to 0.5 s, then a release of `release` s (time constant), silent onset of `late` s.
const note = ({ release = 0.03, late = 0 } = {}) => stereo(tone([{ f: 440, a: 0.5 }], 1.5, (t) => (t < late ? 0 : Math.min(1, (t - late) / 0.001) * (t < 0.5 ? 1 : Math.exp(-(t - 0.5) / release)))));
const velocity = (db, bright) => stereo(atPeak(tone([{ f: 440, a: 1 }, { f: 880, a: bright }, { f: 1320, a: bright / 2 }], 1), db));
const vibrato = (depth) => stereo(Float64Array.from({ length: RATE }, (_, i) => 0.5 * Math.sin(2 * Math.PI * 440 * (i / RATE) + depth * Math.sin(2 * Math.PI * 5 * (i / RATE)))));
// Echoes every `period` s: short decaying bursts, as a synced delay repeats a pluck.
const echoes = (period) => stereo(tone([{ f: 660, a: 0.5 }], 2, (t) => Math.exp(-((t % period) / 0.01))));
const beats = 0.75;

const FILES = {
  'chord.wav': chord(), 'note.wav': note(), 'v40.wav': velocity(-20, 0.05), 'v110.wav': velocity(-6, 0.6),
  'w0.wav': vibrato(0), 'w127.wav': vibrato(3),
  ...Object.fromEntries([90, 120, 140].map((bpm) => [`s${bpm}.wav`, echoes((60 / bpm) * beats)])),
};
const RENDERS = { chord: 'chord.wav', note: 'note.wav', v40: 'v40.wav', v110: 'v110.wav', wheel0: 'w0.wav', wheel127: 'w127.wav', sync: { 90: 's90.wav', 120: 's120.wav', 140: 's140.wav' } };
const preset = (name, kind, patch, more = {}) => ({ name, kind, renders: { ...RENDERS }, noteOff: 0.5, tail: 0.6, syncBeats: beats, patch, ...more });
const BANK = { presets: [
  preset('PAD . Slow Tide', 'pad', { attack: 0.5, release: 1.5 }),
  preset('PLUCK . Glass Step', 'pluck', { delayDivision: '1/8.', arpDivision: '1/16' }),
  preset('BELL . Far Tower', 'bell', { decay: 2, release: 2 }),
  preset('ORGAN . Low Room', 'organ', { velocityDepth: 0 }),
] };

const project = (() => {
  const dir = fresh('bank-');
  assert.equal(cli(dir, 'init', '--config', 'synth-creator', 'cpp', 'audio-core', 'sound-design').status, 0);
  return dir;
})();

// A bank folder with the good renders, `files` replacing some, and the bank `edit` returns.
function prove(edit = (b) => b, files = {}) {
  const dir = fresh('bank-run-');
  for (const [name, channels] of Object.entries({ ...FILES, ...files })) writeFileSync(join(dir, name), writeWav(channels, RATE));
  writeFileSync(join(dir, 'bank.json'), JSON.stringify(edit(structuredClone(BANK))));
  const r = spawnSync('node', [join(project, '.claude/tools/prove-a-bank.mjs'), join(dir, 'bank.json')], { encoding: 'utf8', timeout: 60000 });
  return { status: r.status, out: r.stdout + r.stderr, failed: [...new Set([...r.stdout.matchAll(/^FAIL {2}.*? {2}([\w-]+):/gm)].map((m) => m[1]))] };
}

test('a bank that meets the gate passes every line', () => {
  const r = prove();
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /all \d+ lines pass/);
  for (const id of ['chord-peak', 'mono-lows', 'nothing-under-40', 'tail', 'first-sound', 'velocity', 'wheel', 'sync', 'delay-off-the-arp', 'pad-release', 'bell-release', 'organ-velocity', 'bank-loudness']) assert.match(r.out, new RegExp(`ok {2}.* {2}${id}:`), id);
});

const only = (kind) => (b) => ({ presets: b.presets.filter((p) => p.kind === kind) });
const FAULTS = {
  'chord-peak': [(b) => b, { 'chord.wav': stereo(atPeak(tone(CHORD, 1), -2)) }],
  'mono-lows': [(b) => b, { 'chord.wav': (() => {
    const [l] = chord(); const s = tone([{ f: 60, a: 0.05 }], 1); const g = dbToGain(-0.5); // the side at 60 Hz, the peak kept within the gate
    return [l.map((v, i) => g * (v + s[i])), l.map((v, i) => g * (v - s[i]))];
  })() }],
  'nothing-under-40': [(b) => b, { 'chord.wav': chord([{ f: 30, a: 1 }]) }],
  tail: [(b) => b, { 'note.wav': note({ release: 0.5 }) }],
  'first-sound': [only('pluck'), { 'note.wav': note({ late: 0.05 }) }],
  velocity: [only('pad'), { 'v110.wav': velocity(-20, 0.05) }],
  wheel: [(b) => b, { 'w127.wav': vibrato(0) }],
  sync: [(b) => b, { 's140.wav': echoes((60 / 120) * beats) }],
  'delay-off-the-arp': [(b) => { b.presets[1].patch.delayDivision = '1/16'; return b; }, {}],
  'pad-release': [(b) => { b.presets[0].patch.release = 0.2; return b; }, {}],
  'bell-release': [(b) => { b.presets[2].patch.release = 0.5; return b; }, {}],
  'organ-velocity': [(b) => { b.presets[3].patch.velocityDepth = 0.4; return b; }, {}],
  'bank-loudness': [(b) => { b.presets[1].renders.chord = 'thin.wav'; return b; }, { 'thin.wav': stereo(atPeak(tone([{ f: 440, a: 1 }], 1), -6)) }],
};

for (const [id, [edit, files]] of Object.entries(FAULTS)) {
  test(`a planted fault fails ${id}, and only it`, () => {
    const r = prove(edit, files);
    assert.equal(r.status, 1, r.out);
    assert.deepEqual(r.failed, [id], r.out);
  });
}

test('a render the gate needs and the bank lacks fails as not measured', () => {
  const r = prove((b) => { delete b.presets[0].renders.wheel127; return only('pad')(b); });
  assert.equal(r.status, 1);
  assert.match(r.out, /FAIL {2}PAD \. Slow Tide {2}wheel: not measured: no wheel127 render/);
});

// KWB-158: started by a linked path (macOS's /var is a link to /private/var; any linked project folder), the tool still runs: its
// main is chosen by real paths, never by comparing argv[1] with its own URL. A junction on Windows needs no rights.
test('prove-a-bank started through a linked folder still measures the bank', () => {
  const link = join(fresh('bank-link-'), 'project');
  symlinkSync(project, link, 'junction');
  const dir = fresh('bank-run-');
  for (const [name, channels] of Object.entries(FILES)) writeFileSync(join(dir, name), writeWav(channels, RATE));
  writeFileSync(join(dir, 'bank.json'), JSON.stringify(BANK));
  const r = spawnSync('node', [join(link, '.claude/tools/prove-a-bank.mjs'), join(dir, 'bank.json')], { encoding: 'utf8', timeout: 60000 });
  assert.match(r.stdout + r.stderr, /all \d+ lines pass/, 'a tool started by a linked path ran nothing');
});
