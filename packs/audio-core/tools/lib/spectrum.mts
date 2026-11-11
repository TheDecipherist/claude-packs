// Blackman-Harris windowed FFT analysis of a steady tone.
const MAX_N = 1 << 18;
const LOBE = 6; // bins either side of a peak treated as part of it (BH-4 main lobe is ±4)
const ENBW_BH4 = 2.0044; // equivalent noise bandwidth of the 4-term Blackman-Harris window, in bins

/** What `analyse` measures of one tone. */
export interface ToneAnalysis {
  maxFreq: number;
  nonFinite: number;
  fundamentalDbfs: number;
  thdDb: number;
  thdPercent: number;
  worstNonHarmonicDb: number;
  worstNonHarmonicHz: number;
  snrDb: number;
  dcDbfs: number;
  peakDbfs: number;
}

/** In-place radix-2 FFT of `re` and `im` (one power-of-two length). */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  const at = (a: Float64Array, i: number): number => a[i] ?? 0;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const r = at(re, i), m = at(im, i);
      re[i] = at(re, j); re[j] = r;
      im[i] = at(im, j); im[j] = m;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k += 1) {
        const wr = Math.cos(ang * k);
        const wi = Math.sin(ang * k);
        const a = i + k;
        const b = a + len / 2;
        const tr = at(re, b) * wr - at(im, b) * wi;
        const ti = at(re, b) * wi + at(im, b) * wr;
        re[b] = at(re, a) - tr;
        im[b] = at(im, a) - ti;
        re[a] = at(re, a) + tr;
        im[a] = at(im, a) + ti;
      }
    }
  }
}

const db = (power: number): number => 10 * Math.log10(Math.max(power, 1e-30));

export function analyse(samples: ArrayLike<number>, sampleRate: number, f0: number, maxFreq: number): ToneAnalysis {
  let nonFinite = 0;
  let peak = 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const s = samples[i] as number;
    if (!Number.isFinite(s)) nonFinite += 1;
    else {
      peak = Math.max(peak, Math.abs(s));
      sum += s;
    }
  }
  let n = 1;
  while (n * 2 <= Math.min(samples.length, MAX_N)) n *= 2;
  const start = Math.floor((samples.length - n) / 2); // skip the attack
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  let wsum = 0;
  for (let i = 0; i < n; i += 1) {
    const x = (2 * Math.PI * i) / (n - 1);
    const w = 0.35875 - 0.48829 * Math.cos(x) + 0.14128 * Math.cos(2 * x) - 0.01168 * Math.cos(3 * x);
    const s = samples[start + i] as number;
    re[i] = (Number.isFinite(s) ? s : 0) * w;
    wsum += w;
  }
  fft(re, im);
  const half = n / 2;
  const scale = 2 / wsum;
  const power = new Float64Array(half);
  for (let k = 0; k < half; k += 1) power[k] = ((re[k] ?? 0) * scale) ** 2 + ((im[k] ?? 0) * scale) ** 2;

  const binHz = sampleRate / n;
  const lobePower = (centre: number): number => {
    let p = 0;
    for (let k = Math.max(1, centre - LOBE); k <= Math.min(half - 1, centre + LOBE); k += 1) p += power[k] ?? 0;
    return p;
  };
  const harmonicBins: number[] = [];
  for (let h = 1; h * f0 < sampleRate / 2; h += 1) harmonicBins.push(Math.round((h * f0) / binHz));
  const isHarmonic = new Uint8Array(half);
  for (const b of harmonicBins) for (let k = b - LOBE; k <= b + LOBE; k += 1) if (k >= 0 && k < half) isHarmonic[k] = 1;
  for (let k = 0; k <= LOBE; k += 1) isHarmonic[k] = 1; // DC region

  const fund = lobePower(harmonicBins[0] as number);
  let harmTotal = 0;
  let thd = 0;
  harmonicBins.forEach((b, i) => {
    const p = lobePower(b);
    harmTotal += p;
    if (i >= 1 && i <= 9) thd += p;
  });
  let rest = 0;
  let worst = 0;
  let worstBin = 0;
  const maxBin = Math.min(half - 1, Math.floor(maxFreq / binHz));
  for (let k = 0; k < half; k += 1) {
    if (isHarmonic[k]) continue;
    const p = power[k] ?? 0;
    rest += p;
    if (k <= maxBin && p > worst) {
      worst = p;
      worstBin = k;
    }
  }
  return {
    maxFreq,
    nonFinite,
    fundamentalDbfs: db(fund / ENBW_BH4), // summed lobe power over-reads by the window's noise bandwidth
    thdDb: db(thd) - db(fund),
    thdPercent: 100 * Math.sqrt(thd / Math.max(fund, 1e-30)),
    worstNonHarmonicDb: db(worst) - db(power[harmonicBins[0] as number] ?? 0),
    worstNonHarmonicHz: worstBin * binHz,
    snrDb: db(harmTotal) - db(rest),
    dcDbfs: 20 * Math.log10(Math.max(Math.abs(sum / Math.max(samples.length, 1)), 1e-15)),
    peakDbfs: 20 * Math.log10(Math.max(peak, 1e-15)),
  };
}
