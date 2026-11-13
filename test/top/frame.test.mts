// `claude-packs top` (typescript order W8.9 item 4): the real binary renders the planted machine (proxy/testdata/top-plant.json: 3
// projects, one with 4 live agents, one with none, one stale, a governor with 2 jobs and 1 waiter) to the golden frame the Go test holds
// too (proxy/top_test.go), every agent with its last action and the time since it. Planted: a frame with a field dropped is named.
// Start time and resident memory are measured and written to build/evidence/w89/top.json. Needs the built binary, else skipped.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { put, scratchDir } from '../../packs/base/hooks/lib/files.mts';
import { readJson, toJson } from '../../packs/base/hooks/lib/json.mts';
import { hostTarget, shippedBinary } from '../../lib/proxy-binary.mts';
import { KIT, assert, test } from '../kit-cli.mts';

const target = hostTarget();
const BINARY = target === null ? '' : shippedBinary(KIT, target);
const HAVE = existsSync(BINARY);
const GOLDEN = join(KIT, 'proxy', 'testdata', 'top-frame.golden');
const PLANT = readJson<{ files: Record<string, string> }>(join(KIT, 'proxy', 'testdata', 'top-plant.json'), { files: {} }) ?? { files: {} };
const FIELDS = ['sonnet', '.claude/worktrees/a1', '142%', '1.2G', '5p', '2s ago', 'Edit src/import.ts', 'Bash npm run test:changed', 'Write lib/new.ts', 'load 2.10 1.80 1.50', '4 agents', 'stale'];
const START_LIMIT_MS = 100;
const RSS_LIMIT_MB = 20;

/** The planted machine written into a scratch folder. */
function planted(): string {
  const dir = scratchDir('top-frame-');
  for (const [name, text] of Object.entries(PLANT.files)) put(join(dir, name), text);
  return dir;
}

function frame(dir: string, extra: readonly string[] = []): string {
  const args = ['top', '--once', '--now', '2026-11-13T12:00:00Z', '--width', '118', '--load', '2.10 1.80 1.50', '--usage', '.claude/top-usage.json',
    '--governor', join(dir, 'governor'), '--no-daemon', ...extra, join(dir, 'shop'), join(dir, 'quiet'), join(dir, 'old')];
  const r = spawnSync(BINARY, args, { encoding: 'utf8', env: { PATH: process.env.PATH ?? '', HOME: dir } });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
}

/** The fields of the planted state a frame must carry; the ones it lacks. */
const missing = (text: string): string[] => FIELDS.filter((f) => !text.includes(f));

test('top renders the planted state to the golden frame', { skip: HAVE ? false : 'the proxy binary is not built (Go is not on PATH)' }, () => {
  const text = frame(planted());
  assert.equal(text, readFileSync(GOLDEN, 'utf8'));
  assert.deepEqual(missing(text), []);
  assert.ok(!text.includes('z1'), 'a stale agent is listed');
});

test('a frame with a field dropped is red (planted: the last action cut from every row)', { skip: HAVE ? false : 'the proxy binary is not built' }, () => {
  const cut = frame(planted()).split('\n').map((l) => l.replace(/ {2}(Edit|Bash|Write|Read|Grep) .*$/, '')).join('\n');
  assert.notEqual(cut, readFileSync(GOLDEN, 'utf8'));
  assert.ok(missing(cut).includes('Edit src/import.ts'));
});

test('an agent opened shows its own actions only', { skip: HAVE ? false : 'the proxy binary is not built' }, () => {
  const text = frame(planted(), ['--open', 'shop/a2']);
  assert.ok(text.includes('a2') && text.includes('Bash npm run test:changed') && !text.includes('src/import.ts'));
});

test('claude-packs top is a command, in the help, and prints the same frame', { skip: HAVE ? false : 'the proxy binary is not built' }, () => {
  const dir = planted();
  const args = ['bin/claude-packs.mjs', 'top', '--once', '--now', '2026-11-13T12:00:00Z', '--width', '118', '--load', '2.10 1.80 1.50', '--usage', '.claude/top-usage.json',
    '--governor', join(dir, 'governor'), '--no-daemon', join(dir, 'shop'), join(dir, 'quiet'), join(dir, 'old')];
  const r = spawnSync(process.execPath, args, { cwd: KIT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, readFileSync(GOLDEN, 'utf8'));
  assert.match(readFileSync(join(KIT, 'prompts', 'help.txt'), 'utf8'), /^ {2}top \[--once\]/m);
});

test('top starts under 100 ms and stays under 20 MB resident (measured)', { skip: HAVE ? false : 'the proxy binary is not built' }, () => {
  const dir = planted();
  const runs: number[] = [];
  for (let i = 0; i < 15; i += 1) { const t0 = performance.now(); frame(dir); runs.push(performance.now() - t0); }
  runs.sort((a, b) => a - b);
  const p50 = runs[Math.floor(runs.length / 2)] ?? 0;
  const args = ['--once', '--now', '2026-11-13T12:00:00Z', '--no-daemon', join(dir, 'shop'), join(dir, 'quiet'), join(dir, 'old')];
  // /usr/bin/time -l (macOS, bytes) or -v (Linux, kB) says the peak resident size
  const timed = spawnSync('/usr/bin/time', [process.platform === 'darwin' ? '-l' : '-v', BINARY, 'top', ...args], { encoding: 'utf8' });
  const peak = /(\d+)\s+maximum resident set size/.exec(timed.stderr)?.[1] ?? /Maximum resident set size \(kbytes\): (\d+)/.exec(timed.stderr)?.[1];
  const rssMb = peak === undefined ? null : Number(peak) / (process.platform === 'darwin' ? 1048576 : 1024);
  mkdirSync(join(KIT, 'build', 'evidence', 'w89'), { recursive: true });
  put(join(KIT, 'build', 'evidence', 'w89', 'top.json'), toJson({ platform: `${process.platform}-${process.arch}`, runs: runs.length, p50Ms: Math.round(p50), maxMs: Math.round(runs.at(-1) ?? 0), peakRssMb: rssMb }));
  assert.ok(p50 < START_LIMIT_MS, `p50 ${p50} ms`);
  assert.ok(rssMb !== null && rssMb < RSS_LIMIT_MB, `peak resident ${rssMb} MB`);
});
