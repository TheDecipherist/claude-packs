// scripts/soak-summary.mts and soak-probe.mts (typescript order W10b item 2): the soak's leak verdicts, planted. A heap that grows a
// megabyte a minute is red on the slope line; a flat one is green; a daemon that left a file behind is red.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { heapSlope, verdicts, type Facts } from '../../../scripts/soak-summary.mts';
import { slopePer10Min, type Row } from '../../../scripts/soak-probe.mts';

const row = (t: number, heapMb: number): Row => ({ t, pid: 7, daemons: 1, events: t, rssMb: 200, heapMb, heapStateMb: heapMb, fds: 150, workers: 16, children: 1, childrenNoSampler: 0,
  samplerPid: 8, samplerRssMb: 10, samplerGoHeapMb: 1, samplerGoSysMb: 6, sockets: 1, pidFiles: 1, lockFiles: 0 });
const series = (perMinuteMb: number): Row[] => Array.from({ length: 80 }, (_, i) => row(i * 30, 8 + (i * 30 / 60) * perMinuteMb));
const facts = (rows: Row[], left: string[] = []): Facts => ({ expectedSamples: 80, rows, differences: 0, compared: 10, refusalsCompared: 2, refusalsSeen: 2, events: 250_000, startFds: 150, startChildren: 0,
  startWorkers: 16, afterKill: { fds: 150, children: 0 }, afterWorker: { workers: 16 }, oldGoneS: 3, idleWindowS: 900, left, endRssMb: 200 });
const slopeLine = (f: Facts): boolean => verdicts(f).find((v) => v.what.startsWith('heap slope'))?.ok ?? false;

test('the slope is per 10 minutes, least squares', () => {
  assert.equal(Math.round(slopePer10Min([0, 60, 120], [0, 1, 2]) * 100) / 100, 10);
});

test('a heap that grows per event is red on the slope line, a flat one is green (the planted array)', () => {
  assert.equal(slopeLine(facts(series(0))), true);
  assert.equal(slopeLine(facts(series(0.5))), false);
  assert.ok(heapSlope(series(0.5)).slope > 4);
});

test('anything left behind after the daemon stops is red', () => {
  const ok = (left: string[]): boolean => verdicts(facts(series(0), left)).find((v) => v.what.startsWith('left behind'))?.ok ?? false;
  assert.equal(ok([]), true);
  assert.equal(ok(['1 sockets']), false);
});
