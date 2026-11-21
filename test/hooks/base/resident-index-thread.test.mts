// resident/index indexThread: the repetition indexes on a thread of their own. They answer what the main-thread index answers, see a
// write after `stale`, and a rebuild never holds the main thread: a 2 ms timer keeps its pace while the thread rebuilds, where the index
// built on the main thread (the control, which shows the meter can see a block) stalls it (KWB-next: doctor's pool verdict 93 ms at p95,
// a rebuild after each write on the main thread).
import { join } from 'node:path';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { indexThread, residentIndex } from '../../../packs/base/hooks/resident/index.mts';
import { fingerprint } from '../../../packs/base/hooks/lib/near-copies.mts';
import type { Layout } from '../../../packs/base/hooks/lib/types.d.mts';
import { assert, test } from '../../kit-cli.mts';

const THREAD = new URL('../../../packs/base/hooks/resident/index-thread.mjs', import.meta.url);
const layout = (): Layout => ({ folders: { 'src/': 'source' }, concepts: {} }) as unknown as Layout;
const FILES = 5000;
const body = (i: number): string => `export function f${i}(rows) {\n  const total${i} = rows.reduce((sum, row) => sum + row.price * ${i}, 0);\n  return total${i} + ${i};\n}\n`;

function project(): string {
  const dir = scratchDir('index-thread-');
  for (let i = 0; i < FILES; i += 1) put(join(dir, 'src', `m${i}.ts`), body(i));
  return dir;
}

/** The longest gap between ticks of a 2 ms timer while `work` runs. */
async function longestGap(work: () => Promise<unknown>): Promise<number> {
  let last = performance.now();
  let worst = 0;
  const timer = setInterval(() => { const now = performance.now(); worst = Math.max(worst, now - last); last = now; }, 2);
  await work();
  await new Promise((done) => setTimeout(done, 10));
  clearInterval(timer);
  return worst;
}

const keysOf = (text: string): string[] => fingerprint(text, '.ts').map(([h]) => h);

test('the index thread answers what the main-thread index answers, and sees a write after stale', async () => {
  const dir = project();
  const keys = keysOf(body(7));
  const local = residentIndex(dir, layout);
  const thread = indexThread(dir, layout, THREAD);
  try {
    const want = local.candidates(keys).map((f) => f.file).sort();
    assert.ok(want.includes('src/m7.ts'), `the main-thread index finds the file: ${want.join(', ')}`);
    assert.deepEqual((await thread.candidates(keys)).map((f) => f.file).sort(), want);
    put(join(dir, 'src', 'copy.ts'), body(7));
    thread.stale();
    assert.ok((await thread.candidates(keys)).some((f) => f.file === 'src/copy.ts'), 'a file written after stale is found');
  } finally { await thread.close(); local.close(); }
});

test('a rebuild after a write never holds the main thread: the timer keeps its pace, where the main-thread index stalls it', async () => {
  const dir = project();
  const keys = keysOf(body(3));
  const local = residentIndex(dir, layout);
  local.candidates(keys);
  local.stale();
  const control = await longestGap(async () => local.candidates(keys));
  const thread = indexThread(dir, layout, THREAD);
  try {
    await thread.candidates(keys);   // built
    thread.stale();
    const gap = await longestGap(() => thread.candidates(keys));
    assert.ok(control > 25, `the control: the main-thread rebuild held the timer ${Math.round(control)} ms (the meter sees a block)`);
    assert.ok(gap < 20, `the thread's rebuild held the main thread's timer ${Math.round(gap)} ms (the control: ${Math.round(control)} ms)`);
  } finally { await thread.close(); local.close(); }
});

test('a file written after the thread starts, before its first ask, is found with no stale (as the main thread\'s first query read it)', async () => {
  const dir = project();
  const keys = keysOf(body(11));
  const thread = indexThread(dir, layout, THREAD);
  try {
    await new Promise((done) => setTimeout(done, 3000));   // past the thread's start-up build (5,000 files: under a second here)
    put(join(dir, 'src', 'early.ts'), body(11));
    assert.ok((await thread.candidates(keys)).some((f) => f.file === 'src/early.ts'), 'the first ask reads the files again');
  } finally { await thread.close(); }
});
