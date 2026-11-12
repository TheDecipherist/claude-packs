// PreToolUse (Write|Edit|MultiEdit|NotebookEdit|Bash): a NEW source file may only be created inside a layout folder,
// by any route that creates a file: the Write tool, or the shell (>, >>, tee, cp, mv, touch, a heredoc into a file;
// lib/writes.mts). An Edit, MultiEdit, NotebookEdit or sed -i never creates a file, so it is never judged here.
// The layout lives in .claude/layout.json and is summarised in CLAUDE.md; this makes it structural.
// Existing files can always be edited; moving them is a separate, deliberate job. `--selftest` proves it.
// A judge on the hook contract (typescript order W4): hook(event, ctx) returns its Verdict; the layout is read per file, from its own checkout.
import { existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, runAsHook } from './lib/hook-log.mts';
import { codeFolders, readLayout } from './lib/layout.mts';
import { claudeRoot, relInCheckout } from './lib/project.mts';
import { bashOf, editOf, runHook, scratchProject, snapshot, verdicts, writeOf, writtenSince } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { Hook, HookContext, Layout } from './lib/types.d.mts';
import { judgeVerdict } from './lib/writes.mts';

const SOURCE = /\.(c|cc|cpp|cxx|h|hh|hpp|mm|m|wgsl|metal|glsl|hlsl|slang)$/i;

/** What is source: layout.json "sourceFiles" (a regex the configuration writes, e.g. full-stack's TypeScript; KWB-37), else SOURCE. */
export const isSource = (file: string, layout: Pick<Layout, 'sourceFiles'>): boolean => (layout.sourceFiles ? new RegExp(layout.sourceFiles, 'i') : SOURCE).test(file);

function outsideLayout(file: string, layout: Layout, ctx: HookContext): string | null {
  if (relative(ctx.projectDir, file).startsWith('..')) return null;
  const rel = relInCheckout(ctx.projectDir, file, ctx.cwd);
  if (rel.startsWith('..')) return null;

  const folders = codeFolders(layout);
  if (folders.length === 0) return null;
  if (folders.some((f) => rel.startsWith(`${f}/`))) {
    // Inside src/, the file must be in one of the named subfolders, not loose in src/ itself.
    return null;
  }

  const list = Object.values(layout.folders)
    .filter((f) => folders.includes(f.path))
    .map((f) => `  ${f.path}/  ${f.purpose}`)
    .join('\n');
  return `BLOCKED by folder-law: ${rel} is outside the project layout.\nNew source files go in one of:\n${list}\n` +
    'If none fits, ask the user; a new folder is added to .claude/layout.json, then `npx --no-install @thedecipherist/claude-packs update`.\n';
}

export const hook: Hook = (event, ctx) => judgeVerdict(event, {
  name: 'folder-law',
  write: (w) => {
    if (w.op === 'delete' || w.op === 'edit' || existsSync(w.path)) return null;
    const layout = readLayout(claudeRoot(ctx.projectDir, w.path, ctx.cwd));
    return isSource(w.path, layout) ? outsideLayout(w.path, layout, ctx) : null;
  },
}, ctx);

/** A new source file is judged by the worktree's own checkout: in its layout folder it passes, outside it it is refused. */
export const worktreeCase: WorktreeCase = {
  steps: [
    { label: 'a new file in a layout folder of the worktree', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/src/core/Svf.cpp', content: '// new\n' } }, want: 0 },
    { label: 'a new file outside the layout in the worktree', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/stray/Svf.cpp', content: '// new\n' } }, want: 2 },
  ],
};

export function selftest(): number {
  const hookFile = fileURLToPath(import.meta.url);
  const dir = scratchProject({ 'stray/Old.cpp': '// old\n', 'x.txt': 'int x;\n' }, { folders: { core: { path: 'src/core', purpose: 'core code' }, docs: { path: 'docs', purpose: 'docs' } }, concepts: {} });
  const w = (file: string): number | null => runHook(hookFile, dir, writeOf(join(dir, file))).status;
  const sh = (cmd: string): number | null => runHook(hookFile, dir, bashOf(cmd, dir)).status;
  const ts = scratchProject({}, { folders: { api: { path: 'api/src', purpose: 'the API' } }, concepts: {}, sourceFiles: '\\.(ts|tsx)$' });
  const plain = scratchProject({}, { folders: { src: { path: 'src', purpose: 'the code' } }, concepts: {}, sourceFiles: '\\.py$' });
  const [before, tsBefore, plainBefore] = [snapshot(dir), snapshot(ts), snapshot(plain)];   // the projects as the judge finds them
  return verdicts('folder-law', [
    ['TypeScript is not source where the layout does not say so', w('stray/x.ts'), 0],
    ['a layout whose sourceFiles name TypeScript: a new .ts outside its folders (KWB-37)', runHook(hookFile, ts, writeOf(join(ts, 'stray/x.ts'))).status, 2],
    ['and inside them', runHook(hookFile, ts, writeOf(join(ts, 'api/src/x.ts'))).status, 0],
    ['a new file in a layout folder', w('src/core/Svf.cpp'), 0],
    ['a new file outside the layout', w('stray/New.cpp'), 2],
    ['a new file loose in src/', w('src/Loose.cpp'), 2],
    ['a layout that names nothing inside src/: a file in src/ (KWB-78)', runHook(hookFile, plain, writeOf(join(plain, 'src/app.py'))).status, 0],
    ['and a file outside it', runHook(hookFile, plain, writeOf(join(plain, 'stray/app.py'))).status, 2],
    ['an existing file outside the layout', w('stray/Old.cpp'), 0],
    ['an edit is never a new file', runHook(hookFile, dir, editOf(join(dir, 'stray/New.cpp'))).status, 0],
    ['a doc is not source', w('stray/notes.md'), 0],
    ['another project is not ours', runHook(hookFile, dir, writeOf(join(dirname(dir), 'elsewhere/x.cpp'))).status, 0],
    ['a heredoc into a new file outside the layout', sh("cat > stray/B.cpp <<'EOF'\nint b;\nEOF"), 2],
    ['a copy into a layout folder', sh('cp x.txt src/core/C.cpp'), 0],
    ['a move outside the layout', sh('mv x.txt stray/D.cpp'), 2],
    ['words about a file are no write', sh("echo 'cat > stray/E.cpp'"), 0],
    ['a judge writes no file (the write trap)', [...writtenSince(dir, before), ...writtenSince(ts, tsBefore), ...writtenSince(plain, plainBefore)].join(','), ''],
  ]);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'folder-law', hook, selftest);
