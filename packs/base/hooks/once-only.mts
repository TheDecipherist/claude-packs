// once-only: code that exists once is called, never copied (claude-packs 0.9.0 item 9; KWB-1). Before a source write
// lands (C++, Python, JS), the lines it adds are compared with the whole repo through an index kept between calls
// (lib/dup-index.mts, KWB-24: jscpd's whole-repo scan on every write was too slow; only files that changed are read again),
// at jscpd's thresholds (lib/dup.mts: 50 tokens and 6 lines, a gap of up to 2 lines, so a copy with one line changed is
// still a copy). doctor's count and `claude-packs dup scan` still run jscpd over the whole repo. A near-duplicate is refused with the
// existing location and the fix: call it, or extract one function that both call, parameterized over what differs.
// Generated files, resources, vendored and built code, copy trees and design/shape.json "exclude" are never judged.
// Every write route (lib/writes.mts): Write, Edit, MultiEdit, NotebookEdit and the shell's >, >>, tee, sed -i, cp, mv,
// a heredoc. The file is judged as it would be after the write, its old text left out, so editing a file never
// matches its own old lines.
// The judge half (typescript order W4, review-2 2.10): this hook refuses and writes nothing (PreToolUse, role judge); the
// index it reads is brought up to date in memory only. Keeping it up to date after a write that happened is
// once-only-index (PostToolUse, role recorder), so a write another hook refused never reaches the index.
//   node once-only.mjs --selftest   (the rows are in lib/once-only-selftest.mts)
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isContent } from './lib/content.mts';
import { changedLines, copyGlobs, excludeGlobs, FIX, isGenerated, isSource, realPath } from './lib/dup.mts';
import type { DupWrite } from './lib/dup-index.mts';
import { judgeCopyWrites } from './lib/dup-index.mts';
import { matchesAny } from './lib/glob.mts';
import { contextOf, isMain, runAsHook } from './lib/hook-log.mts';
import { FN, selftest as rows } from './lib/once-only-selftest.mts';
import { checkoutRoot, insideProject } from './lib/project.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import { readShape } from './lib/shape.mts';
import type { FileWrite, Hook, HookContext, HookEvent, Layout } from './lib/types.d.mts';
import { pass, refuse } from './lib/verdict.mts';
import { layoutOfWrite } from './lib/write-layout.mts';
import { writesOf } from './lib/writes.mts';

const HOW = `Code that exists once is called, never copied: ${FIX}. A function written for a many concept takes the instance as a parameter.\n` +
  'Moving or extracting code: take the old copy out in the same write (one Write or MultiEdit), or take it out first.';

/** One source write once-only judges, with the checkout it lands in. */
interface Judged { root: string; layout: Layout; shape: ReturnType<typeof readShape>; w: FileWrite; range: readonly [number, number] }

// Every source write the call makes that once-only judges, and the paths it takes away.
function judged(event: HookEvent, ctx: HookContext): { list: Judged[]; gone: string[] } {
  const list: Judged[] = [];
  const gone: string[] = [];
  for (const w of writesOf(event, event.cwd ?? ctx.cwd, ctx.env)) {
    if (!insideProject(ctx.projectDir, w.path, ctx.cwd)) continue;
    if (w.op === 'delete') { gone.push(w.path); continue; }
    if (w.after === null || !isSource(w.path) || isGenerated(w.after)) continue;
    const root = checkoutRoot(ctx.projectDir, w.path, ctx.cwd);
    const rel = relative(root, w.path).replace(/\\/g, '/');
    const layout = layoutOfWrite(ctx, w.path);
    const shape = readShape(root);
    if (matchesAny(rel, [...excludeGlobs(layout, shape), ...copyGlobs(layout)]) || isContent(rel, layout)) continue;
    const range = changedLines(w.before, w.after);
    if (range) list.push({ root, layout, shape, w, range });
  }
  return { list, gone };
}

/** What the write repeats: the refusal's text, or null when it repeats nothing the repo has. */
export function copiesIn(event: HookEvent, ctx: HookContext): string | null {
  const { list, gone } = judged(event, ctx);
  if (!list.length) return null;
  const found: string[] = [];
  // each checkout written to: its index finds the candidates (built once, then only changed files are read again), jscpd
  // confirms on those files alone (lib/dup-index.mts judgeCopyWrites)
  for (const root of new Set(list.map((j) => j.root))) {
    const mine = list.filter((j) => j.root === root);
    const first = mine[0];
    if (!first) continue;
    const writes: DupWrite[] = mine.map((j) => ({ path: j.w.path, after: j.w.after ?? '', range: j.range }));
    const r = judgeCopyWrites(root, writes, { env: ctx.env, layout: first.layout, shape: first.shape, ignore: gone, persist: false });
    if (r.error) return null; // once-only could not judge (doctor shows a missing detector)
    const base = realPath(root);
    const show = (s: { file: string; start: number; end: number }): string => `${relative(base, s.file)}:${s.start}-${s.end}`;
    for (const c of r.clones) found.push(`${show(c.at)} repeats ${show(c.other)} (${c.lines} lines, ${c.tokens} tokens)`);
  }
  if (!found.length) return null;
  const listed = [...new Set(found)];
  const more = listed.length > 6 ? `\n  ... and ${listed.length - 6} more` : '';
  return `BLOCKED by once-only: this write repeats code the repo already has.\n${listed.slice(0, 6).map((f) => `  ${f}`).join('\n')}${more}\n${HOW}`;
}

export const hook: Hook = (event, ctx) => {
  const why = copiesIn(event, ctx);
  return why === null ? pass : refuse(why);
};

const writeAt = (file: string, content: string): Record<string, unknown> => ({ tool_name: 'Write', tool_input: { file_path: file, content } });
const CALL = 'float Voice::render (float x) noexcept { return svf.process (x); }\n';

/** A function that lives only in the worktree: a near-copy is refused there, and judged against main's tree in main. */
export const worktreeCase: WorktreeCase = {
  files: { '{wt}/src/dsp/Svf.cpp': `#include "Svf.h"\n\n${FN('Svf')}\n` },
  steps: [
    { label: 'a near-copy in the worktree', event: writeAt('{wt}/src/dsp/Copy.cpp', FN('Copy', '1.5f')), want: 2 },
    { label: 'a call to it in the worktree', event: writeAt('{wt}/src/dsp/Voice.cpp', CALL), want: 0 },
    { label: 'the same near-copy in the main checkout, which does not hold the function', event: writeAt('{here}/src/dsp/Copy.cpp', FN('Copy', '1.5f')), want: 0 },
  ],
};

export function selftest(): number {
  const { env, cwd } = contextOf();
  return rows(fileURLToPath(import.meta.url), env, cwd);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'once-only', hook, selftest);
