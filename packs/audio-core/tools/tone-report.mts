#!/usr/bin/env node
// Measures a rendered test tone: fundamental level, THD, worst non-harmonic peak (aliasing),
// SNR, DC offset, peak, and non-finite samples. No dependencies.
//   node tone-report.mjs <file.wav> <f0 Hz> [--max-freq 15000] [--nonharm-max -60] [--snr-min 45] [--dc-max -80] [--json]
// Exit 1 when a given threshold fails, so it can run as a test.
import { readFileSync } from 'node:fs';
import { isMain } from '../hooks/lib/hook-log.mts';
import { toJson } from '../hooks/lib/json.mts';
import { analyse } from './lib/spectrum.mts';
import { readWav } from './lib/wav.mts';

/** The number after a flag in the arguments, or the fallback when the flag is not there. */
function arg(args: readonly string[], name: string, fallback: number | null): number | null {
  const i = args.indexOf(name);
  return i === -1 ? fallback : Number(args[i + 1]);
}

/** The report for `args` (the arguments after the program's own two) written to `out`, and the exit code. */
export function main(args: readonly string[], out: (line: string) => void, err: (line: string) => void): number {
  const [file, f0Text] = args;
  if (!file || !f0Text) {
    err('usage: tone-report.mjs <file.wav> <f0> [--max-freq Hz] [--nonharm-max dB] [--snr-min dB] [--dc-max dBFS] [--json]');
    return 2;
  }
  const { sampleRate, samples } = readWav(readFileSync(file));
  const r = analyse(samples, sampleRate, Number(f0Text), arg(args, '--max-freq', sampleRate / 2) ?? sampleRate / 2);

  const fails: string[] = [];
  const nonharmMax = arg(args, '--nonharm-max', null);
  const snrMin = arg(args, '--snr-min', null);
  const dcMax = arg(args, '--dc-max', null);
  if (r.nonFinite > 0) fails.push(`${r.nonFinite} non-finite samples`);
  if (nonharmMax !== null && r.worstNonHarmonicDb > nonharmMax) fails.push(`non-harmonic ${r.worstNonHarmonicDb.toFixed(1)} dB > ${nonharmMax}`);
  if (snrMin !== null && r.snrDb < snrMin) fails.push(`SNR ${r.snrDb.toFixed(1)} dB < ${snrMin}`);
  if (dcMax !== null && r.dcDbfs > dcMax) fails.push(`DC ${r.dcDbfs.toFixed(1)} dBFS > ${dcMax}`);

  if (args.includes('--json')) out(toJson({ ...r, pass: fails.length === 0, fails }));
  else {
    const f = (x: number): string => (Number.isFinite(x) ? x.toFixed(1) : String(x));
    const lines = [
      `file            ${file} (${sampleRate} Hz, ${samples.length} samples)`,
      `fundamental     ${f(r.fundamentalDbfs)} dBFS at ${f0Text} Hz`,
      `THD (2-10)      ${f(r.thdDb)} dB  (${r.thdPercent.toFixed(3)} %)`,
      `worst non-harm  ${f(r.worstNonHarmonicDb)} dB re fundamental at ${f(r.worstNonHarmonicHz)} Hz (below ${f(r.maxFreq)} Hz)`,
      `SNR             ${f(r.snrDb)} dB (harmonic vs everything else)`,
      `DC              ${f(r.dcDbfs)} dBFS   peak ${f(r.peakDbfs)} dBFS   non-finite ${r.nonFinite}`,
      fails.length ? `FAIL: ${fails.join('; ')}` : 'PASS',
    ];
    lines.forEach(out);
  }
  return fails.length ? 1 : 0;
}

if (isMain(import.meta.url)) process.exit(main(process.argv.slice(2), (line) => console.log(line), (line) => console.error(line)));
