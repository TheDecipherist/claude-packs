// The signal measures `prove-a-bank` gates a bank on (design-a-preset's gate, rules 2, 4, 7 and 10). Every figure is from the
// rendered audio; none is typed. WAVs are read by audio-core's `wav.mjs` and transformed by its `spectrum.mjs` FFT.
import { fft } from './spectrum.mjs';

const FRAME = 1 << 14;
const db = (x) => 10 * Math.log10(Math.max(x, 1e-30));
const meanSquare = (x) => x.reduce((s, v) => s + v * v, 0) / Math.max(x.length, 1);
export const mid = ([l, r = l]) => l.map((v, i) => (v + r[i]) / 2);
export const side = ([l, r = l]) => l.map((v, i) => (v - r[i]) / 2);

export const peakDb = (channels) => 20 * Math.log10(Math.max(...channels.map((c) => c.reduce((m, v) => Math.max(m, Math.abs(v)), 0)), 1e-15));

// One biquad over a signal, direct form 1.
function biquad(x, [b0, b1, b2, a1, a2]) {
  const y = new Float64Array(x.length);
  let x1 = 0; let x2 = 0; let y1 = 0; let y2 = 0;
  for (let i = 0; i < x.length; i += 1) {
    y[i] = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = y[i];
  }
  return y;
}

// ITU-R BS.1770's K-weighting (its shelf and its high-pass), designed for any sample rate.
function kWeights(rate) {
  const k1 = Math.tan((Math.PI * 1681.974450955533) / rate); const q1 = 0.7071752369554196;
  const vh = 10 ** (3.999843853973347 / 20); const vb = vh ** 0.4996667741545416; const n1 = 1 + k1 / q1 + k1 * k1;
  const shelf = [(vh + (vb * k1) / q1 + k1 * k1) / n1, (2 * (k1 * k1 - vh)) / n1, (vh - (vb * k1) / q1 + k1 * k1) / n1, (2 * (k1 * k1 - 1)) / n1, (1 - k1 / q1 + k1 * k1) / n1];
  const k2 = Math.tan((Math.PI * 38.13547087602444) / rate); const q2 = 0.5003270373238773; const n2 = 1 + k2 / q2 + k2 * k2;
  return [shelf, [1, -2, 1, (2 * (k2 * k2 - 1)) / n2, (1 - k2 / q2 + k2 * k2) / n2]];
}

// Loudness in LUFS, BS.1770 K-weighted and ungated (a render is one sound, with no silence to gate out).
export function loudness(channels, rate) {
  const [shelf, hp] = kWeights(rate);
  return -0.691 + db(channels.reduce((s, c) => s + meanSquare(biquad(biquad(c, shelf), hp)), 0));
}

// The power spectrum, Welch: Hann frames of FRAME samples, half overlapped, averaged. Bin k is k * rate / FRAME Hz.
function powerSpectrum(x) {
  const n = Math.min(FRAME, 1 << Math.floor(Math.log2(Math.max(x.length, 2))));
  const sum = new Float64Array(n / 2);
  let frames = 0;
  for (let start = 0; start + n <= x.length; start += n / 2) {
    const re = new Float64Array(n); const im = new Float64Array(n);
    for (let i = 0; i < n; i += 1) re[i] = x[start + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n));
    fft(re, im);
    for (let k = 0; k < n / 2; k += 1) sum[k] += re[k] * re[k] + im[k] * im[k];
    frames += 1;
  }
  return { power: sum.map((p) => p / Math.max(frames, 1)), n };
}

// The power between lo and hi Hz, in dB (relative between two calls on the same length).
export function bandDb(x, rate, lo, hi) {
  const { power, n } = powerSpectrum(x);
  let s = 0;
  power.forEach((p, k) => { const f = (k * rate) / n; if (f >= lo && f < hi) s += p; });
  return db(s);
}

// The spectral centre of gravity, Hz.
export function centroid(x, rate) {
  const { power, n } = powerSpectrum(x);
  let w = 0; let s = 0;
  power.forEach((p, k) => { w += p * ((k * rate) / n); s += p; });
  return w / Math.max(s, 1e-30);
}

// RMS envelope in windows of `ms`, as dB.
function envelope(x, rate, ms) {
  const w = Math.max(1, Math.round((rate * ms) / 1000));
  const out = [];
  for (let i = 0; i + w <= x.length; i += w) out.push(db(meanSquare(x.subarray(i, i + w))));
  return { env: out, w };
}

// Milliseconds from the start to the first sample within 40 dB of the render's peak.
export function firstSoundMs(x, rate) {
  const peak = x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  const i = x.findIndex((v) => Math.abs(v) >= peak * 0.01);
  return i < 0 ? Infinity : (i * 1000) / rate;
}

// Milliseconds from the note-off until the sound stays 60 dB under its loudest 10 ms.
export function tailMs(x, rate, offSec) {
  const { env, w } = envelope(x, rate, 10);
  const top = Math.max(...env);
  let last = env.length - 1;
  while (last >= 0 && env[last] < top - 60) last -= 1;
  if (last === env.length - 1) return Infinity;
  return Math.max(0, ((last + 1) * w * 1000) / rate - offSec * 1000);
}

// How different two renders are: the difference's power against the first's, dB.
export function differenceDb(a, b) {
  const n = Math.min(a.length, b.length);
  return db(meanSquare(a.subarray(0, n).map((v, i) => v - b[i]))) - db(meanSquare(a.subarray(0, n)));
}

// The strongest repeat period of the sound's envelope between lo and hi seconds (a synced delay's echo, a synced LFO's cycle).
export function periodSec(x, rate, lo, hi) {
  const { env, w } = envelope(x, rate, 2);
  const e = env.map((v) => 10 ** (v / 20));
  const m = e.reduce((s, v) => s + v, 0) / e.length;
  const c = e.map((v) => v - m);
  const step = (w / rate);
  let best = { lag: 0, r: -Infinity };
  for (let lag = Math.ceil(lo / step); lag <= Math.floor(hi / step) && lag < c.length; lag += 1) {
    let r = 0;
    for (let i = 0; i + lag < c.length; i += 1) r += c[i] * c[i + lag];
    if (r > best.r) best = { lag, r };
  }
  return best.lag * step;
}
