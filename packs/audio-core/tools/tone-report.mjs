#!/usr/bin/env node
// Measures a rendered test tone: fundamental level, THD, worst non-harmonic peak (aliasing),
// SNR, DC offset, peak, and non-finite samples. No dependencies.
//   node tone-report.mjs <file.wav> <f0 Hz> [--max-freq 15000] [--nonharm-max -60] [--snr-min 45] [--dc-max -80] [--json]
// Exit 1 when a given threshold fails, so it can run as a test.
import { readFileSync } from 'node:fs';
import { readWav } from './lib/wav.mjs';
import { analyse } from './lib/spectrum.mjs';

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : Number(process.argv[i + 1]);
}

function main() {
  const [file, f0Text] = process.argv.slice(2);
  if (!file || !f0Text) {
    console.error('usage: tone-report.mjs <file.wav> <f0> [--max-freq Hz] [--nonharm-max dB] [--snr-min dB] [--dc-max dBFS] [--json]');
    return 2;
  }
  const { sampleRate, samples } = readWav(readFileSync(file));
  const r = analyse(samples, sampleRate, Number(f0Text), arg('--max-freq', sampleRate / 2));

  const fails = [];
  const nonharmMax = arg('--nonharm-max', null);
  const snrMin = arg('--snr-min', null);
  const dcMax = arg('--dc-max', null);
  if (r.nonFinite > 0) fails.push(`${r.nonFinite} non-finite samples`);
  if (nonharmMax !== null && r.worstNonHarmonicDb > nonharmMax) fails.push(`non-harmonic ${r.worstNonHarmonicDb.toFixed(1)} dB > ${nonharmMax}`);
  if (snrMin !== null && r.snrDb < snrMin) fails.push(`SNR ${r.snrDb.toFixed(1)} dB < ${snrMin}`);
  if (dcMax !== null && r.dcDbfs > dcMax) fails.push(`DC ${r.dcDbfs.toFixed(1)} dBFS > ${dcMax}`);

  if (process.argv.includes('--json')) console.log(JSON.stringify({ ...r, pass: fails.length === 0, fails }));
  else {
    const f = (x) => (Number.isFinite(x) ? x.toFixed(1) : String(x));
    console.log(`file            ${file} (${sampleRate} Hz, ${samples.length} samples)`);
    console.log(`fundamental     ${f(r.fundamentalDbfs)} dBFS at ${f0Text} Hz`);
    console.log(`THD (2-10)      ${f(r.thdDb)} dB  (${r.thdPercent.toFixed(3)} %)`);
    console.log(`worst non-harm  ${f(r.worstNonHarmonicDb)} dB re fundamental at ${f(r.worstNonHarmonicHz)} Hz (below ${f(r.maxFreq)} Hz)`);
    console.log(`SNR             ${f(r.snrDb)} dB (harmonic vs everything else)`);
    console.log(`DC              ${f(r.dcDbfs)} dBFS   peak ${f(r.peakDbfs)} dBFS   non-finite ${r.nonFinite}`);
    console.log(fails.length ? `FAIL: ${fails.join('; ')}` : 'PASS');
  }
  return fails.length ? 1 : 0;
}

process.exit(main());
