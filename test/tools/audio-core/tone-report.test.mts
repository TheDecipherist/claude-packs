// tone-report (audio-core's tool): measures a rendered test tone, and exits 1 when a threshold fails so it can run as a test.
// First test for it (W5): a clean sine passes, a stray tone and a DC offset fail their own thresholds, misuse exits 2. The tool
// runs from an install, as a project runs it: it imports base's hook lib beside it.
import { assert, fresh, join, spawnSync, test, writeFileSync } from '../../kit-cli.mts';
import { fixture } from '../../fixtures/installs.mts';
import { writeWav } from '../../../packs/audio-core/tools/lib/wav.mts';

const RATE = 44100;
const F0 = 1000;
const TOOL = join(fixture('audio-core'), '.claude/tools/tone-report.mjs');
const sine = (extra: { f: number; a: number } | null = null, dc = 0): Float64Array =>
  Float64Array.from({ length: RATE }, (_, i) => {
    const t = i / RATE;
    return dc + 0.5 * Math.sin(2 * Math.PI * F0 * t) + (extra ? extra.a * Math.sin(2 * Math.PI * extra.f * t) : 0);
  });
const wavFile = (samples: Float64Array): string => { const f = join(fresh('tone-'), 'tone.wav'); writeFileSync(f, writeWav([samples], RATE)); return f; };
const report = (...args: string[]) => spawnSync('node', [TOOL, ...args], { encoding: 'utf8' });

test('a clean sine passes, and the report names its fundamental and its pass', () => {
  const r = report(wavFile(sine()), String(F0), '--nonharm-max', '-60', '--snr-min', '45');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout.trim().split('\n').at(-1) ?? '', /^PASS$/);
  assert.match(r.stdout, /^fundamental/m);
});

test('a stray tone that is no harmonic fails the non-harmonic threshold, and the JSON says why', () => {
  const r = report(wavFile(sine({ f: 3333, a: 0.05 })), String(F0), '--nonharm-max', '-60', '--json');
  assert.equal(r.status, 1);
  const parsed = JSON.parse(r.stdout) as { pass: boolean; fails: string[] };
  assert.equal(parsed.pass, false);
  assert.match(parsed.fails.join(' '), /non-harmonic/);
});

test('a DC offset past --dc-max fails, and a sine with none passes the same threshold', () => {
  assert.equal(report(wavFile(sine(null, 0.2)), String(F0), '--dc-max', '-40').status, 1);
  assert.equal(report(wavFile(sine()), String(F0), '--dc-max', '-40').status, 0);
});

test('no file or no fundamental says how to use it and exits 2', () => {
  const none = report();
  assert.equal(none.status, 2);
  assert.match(none.stderr, /usage: tone-report/);
  assert.equal(report(wavFile(sine())).status, 2);
});
