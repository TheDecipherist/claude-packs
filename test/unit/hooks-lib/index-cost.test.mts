// KWB-201: what a Pre Write pays for the repetition index. template-law asks the daemon's index (ctx.candidates) when it is there, and the one-shot
// runner's index is written back only when something in it changed (it was rewritten whole on every call). once-only's judge asks the main
// thread's duplicate index by window hash and finds what the index in its own process finds. KWB-182 (a declaration file or a docs probe as a second definition) is a template-law selftest row.
import assert from 'node:assert/strict';
import { readdirSync, statSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { clonesAsked, clonesIn, loadIndex } from '../../../packs/base/hooks/lib/dup-index.mts';
import { dupKey } from '../../../packs/base/hooks/lib/dup-match.mts';
import { dupWindows } from '../../../packs/base/hooks/resident/dup-windows.mts';
import { repoIndex } from '../../../packs/base/hooks/lib/repo-index.mts';
import { hook } from '../../../packs/base/hooks/template-law.mts';
import { residentIndex } from '../../../packs/base/hooks/resident/index.mts';
import type { FileStatements } from '../../../packs/base/hooks/lib/near-copies.mts';
import type { HookContext, HookEvent, Layout } from '../../../packs/base/hooks/lib/types.d.mts';

const layout: Layout = { folders: {}, concepts: {} };
const card = (t: string): string => `<div class="card"><h3 class="t">${t}</h3><p>${t} text</p><button type="button">Go</button></div>\n`;
const ctxOf = (dir: string, candidates?: (keys: readonly string[]) => Promise<FileStatements[]>): HookContext =>
  ({ projectDir: dir, cwd: dir, env: {}, sessionPid: 0, now: 0, layout, log: () => undefined, ...(candidates ? { candidates } : {}) });
const writeEvent = (dir: string, file: string, content: string): HookEvent => ({ tool_name: 'Write', tool_input: { file_path: join(dir, file), content } });
const repoFiles = (): string[] => readdirSync(tmpdir()).filter((f) => /^claude-packs-repo-.*\.json$/.test(f)).map((f) => join(tmpdir(), f));

test('template-law judges against what the daemon answers, not against the disk, when a daemon answers', async () => {
  const dir = scratchDir('asked-');
  put(join(dir, 'src/one.html'), card('One'));
  const index = residentIndex(dir, () => layout);
  const asked: string[][] = [];
  const real = (keys: readonly string[]): Promise<FileStatements[]> => { asked.push([...keys]); return Promise.resolve(index.candidates(keys)); };
  const refused = await hook(writeEvent(dir, 'src/two.html', card('Two')), ctxOf(dir, real));
  assert.equal(refused.code, 2, 'the daemon holds the first card, so a second is refused');
  assert.ok(asked.length === 1 && asked[0]?.some((k) => k.startsWith('shape:')), 'one question, naming the shape');
  const none = await hook(writeEvent(dir, 'src/two.html', card('Two')), ctxOf(dir, () => Promise.resolve([])));
  assert.equal(none.code, 0, 'a daemon that knows no such file says nothing, whatever the disk holds');
});

test('a file the daemon holds under tests or a skipped folder is no other copy', async () => {
  const dir = scratchDir('asked-tests-');
  put(join(dir, 'tests/one.html'), card('One'));
  const index = residentIndex(dir, () => layout);
  const verdict = await hook(writeEvent(dir, 'src/two.html', card('Two')), ctxOf(dir, (keys) => Promise.resolve(index.candidates(keys))));
  assert.equal(verdict.code, 0);
});

test('the one-shot runner writes the repetition index only when a file of it changed', () => {
  const dir = scratchDir('repo-written-');
  put(join(dir, 'src/a.ts'), 'export const a = 1;\n');
  const before = new Set(repoFiles());
  repoIndex(dir, [], layout);
  const file = repoFiles().find((f) => !before.has(f));
  assert.ok(file, 'the first call keeps an index');
  const past = new Date(Date.now() - 60_000);
  utimesSync(file, past, past);
  repoIndex(dir, [], layout);
  assert.equal(statSync(file).mtimeMs, past.getTime(), 'a second call with nothing changed writes nothing');
  put(join(dir, 'src/b.ts'), 'export const b = 2;\n');
  repoIndex(dir, [], layout);
  assert.notEqual(statSync(file).mtimeMs, past.getTime(), 'a new file is written');
});

test('the duplicate index costs the main thread under 40 bytes a window, the clone still found (rss: a map of half a million windows was 55 MB)', () => {
  setFlagsFromString('--expose-gc');
  const gc = runInNewContext('gc') as () => void;
  const dir = scratchDir('dup-cost-');
  const line = (f: number, i: number): string => `  const v${i} = (a * ${(f * 31 + i) % 997} + b) % ${(f * 7 + i) % 991} + ${f};\n`;
  const file = (f: number): string => `export function f${f}(a: number, b: number): number {\n${Array.from({ length: 200 }, (_, i) => line(f, i)).join('')}  return a;\n}\n`;
  for (let f = 0; f < 150; f += 1) put(join(dir, 'src', `m${f}.ts`), file(f));
  put(join(dir, 'src', 'copy.ts'), file(3).replace('f3(', 'other('));
  const files = loadIndex(dir, { persist: false });
  const windows = Object.values(files.files).reduce((n, f) => n + f.h.length, 0);
  // the heap and the typed arrays' buffers, which live outside it
  const held = (): number => { gc(); const m = process.memoryUsage(); return m.heapUsed + m.arrayBuffers; };
  const before = held();
  const dup = dupWindows(dir, () => layout);
  const copy = files.files['src/copy.ts']?.h[100] ?? 0;
  const found = dup.find([dupKey(copy)]).map((f) => f.file).sort();
  const perWindow = (held() - before) / windows;
  assert.deepEqual(found, ['src/copy.ts', 'src/m3.ts']);
  assert.ok(perWindow < 40, `${perWindow.toFixed(0)} bytes a window over ${windows} windows`);
});

test('the main thread holds the duplicate index: a worker asks by window hash and finds the same clone the index in its own process finds', async () => {
  const dir = scratchDir('dup-asked-');
  const body = (n: string): string => `export function ${n}(a: number, b: number): number {\n${Array.from({ length: 14 }, (_, i) => `  const v${i} = (a * ${i + 3} + b) % ${i + 11};\n  if (v${i} > ${i}) { return v${i} - ${i}; }`).join('\n')}\n  return a + b;\n}\n`;
  put(join(dir, 'src/a.ts'), body('first'));
  const dup = dupWindows(dir, () => layout);
  const write = { path: join(dir, 'src/b.ts'), after: body('second'), range: [1, 31] as const };
  const asked: string[][] = [];
  const ask = (keys: readonly string[]): Promise<FileStatements[]> => { asked.push([...keys]); return Promise.resolve(dup.find(keys)); };
  const viaMain = await clonesAsked(dir, [write], ask);
  const inProcess = clonesIn(loadIndex(dir, { persist: false }), [write]);
  assert.ok(viaMain.length > 0, 'a function copied with another name is a candidate');
  assert.deepEqual(viaMain, inProcess);
  assert.ok(asked[0]?.every((k) => k.startsWith('dup:')));
  put(join(dir, 'src/a.ts'), 'export const gone = 1;\n');
  dup.stale();
  assert.deepEqual(await clonesAsked(dir, [write], ask), [], 'a file that changed no longer holds the window');
  put(join(dir, 'src/a.ts'), `${body('first')}// again\n`);
  dup.stale();
  assert.deepEqual(await clonesAsked(dir, [write], ask), clonesIn(loadIndex(dir, { persist: false }), [write]), 'a file that changed back holds it again');
  assert.ok((await clonesAsked(dir, [write], ask)).length > 0);
});
