// KWB-201: what a Pre Write pays for the repetition index. template-law asks the daemon's index (ctx.candidates) when it is there, and the one-shot
// runner's index is written back only when something in it changed (it was rewritten whole on every call). once-only's judge asks the main
// thread's duplicate index by window hash and finds what the index in its own process finds. KWB-182 (a declaration file or a docs probe as a second definition) is a template-law selftest row.
import assert from 'node:assert/strict';
import { readdirSync, statSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { clonesAsked, clonesIn, loadIndex } from '../../../packs/base/hooks/lib/dup-index.mts';
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
});
