// The hooks a change must prove with their own selftests (KWB-166), and the proving: each one's selftest in a scratch folder.
import { spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import type { DetectorEnv } from '../lib/once-only-report.mts';
import { useJscpd } from '../lib/once-only-report.mts';
import { graph, importersOf } from './test-changed-graph.mts';
import type { Graph } from './test-changed-graph.mts';
import { HOOK } from './test-changed-table.mts';

/** A changed hook, and every hook that imports a changed lib. */
export function selftestsOf(root: string, changed: readonly string[], g: Graph = graph(root)): string[] {
  const isHook = (f: string): boolean => HOOK.test(f);
  const hooks = new Set(changed.filter(isHook));
  for (const c of changed.filter((f) => /^packs\/[\w-]+\/hooks\/lib\//.test(f))) for (const m of importersOf(c, g.importers)) if (isHook(m)) hooks.add(m);
  return [...hooks].filter((h) => existsSync(join(root, h))).sort();
}

/** One hook's selftest: its code and what it printed. */
export interface Proof { hook: string; code: number | null; out: string }

// Each hook's selftest in a scratch .claude/hooks laid out as an install lays it (base's hooks and lib, then each pack's own),
// with no install and no doctor: seconds, not the 166 s a fresh install's doctor takes on the Mac. Returns every proof.
export async function proveHooks(root: string, hooks: readonly string[], concurrency = 4, env: DetectorEnv = process.env): Promise<Proof[]> {
  if (!hooks.length) return [];
  useJscpd(root, env); // the temp folder has no node_modules above it: the selftests take the kit's jscpd (KWB-169)
  const dir = join(mkdtempSync(join(tmpdir(), 'test-changed-hooks-')), '.claude', 'hooks');
  mkdirSync(dir, { recursive: true });
  for (const pack of ['base', ...new Set(hooks.map((h) => h.split('/')[1] ?? 'base'))]) cpSync(join(root, 'packs', pack, 'hooks'), dir, { recursive: true });
  const run = (h: string): Promise<Proof> => new Promise((done) => {
    const file = join(dir, basename(h).replace(/\.mts$/, '.mjs'));   // a converted hook is proved as projects run it: emitted (d-4)
    const child = spawn(h.endsWith('.py') ? 'python3' : process.execPath, [file, '--selftest'], { cwd: dirname(dir), env: { ...env } });
    let out = '';
    child.stdout.on('data', (d: Buffer) => { out += d; });
    child.stderr.on('data', (d: Buffer) => { out += d; });
    child.on('close', (code) => done({ hook: h, code, out: out.trim() }));
  });
  const results: Proof[] = [];
  const queue = [...hooks];
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, async () => { for (let h = queue.shift(); h !== undefined; h = queue.shift()) results.push(await run(h)); }));
  return results;
}
