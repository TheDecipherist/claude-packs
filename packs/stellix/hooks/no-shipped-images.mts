// Nothing is ever pre-rendered (Stellix spec 0.2). No image file may be added to the source or
// resources (fonts are allowed: data, not pictures). Test output and goldens live outside them.
// A project sets its own scope in .claude/layout.json "guards": { "images": { "guarded": [globs],
// "allowed": [globs] } }: "guarded" replaces the code folders (["**"]: anywhere in the repo), "allowed"
// replaces the default allowed folders (Stellix: design/reference/** and build/pictures/** only).
//   PreToolUse (Write|Edit|MultiEdit|NotebookEdit|Bash): blocks writing, copying or moving an image into a guarded
//   folder by any route (lib/writes.mjs), and a download or conversion that names one (curl, convert, sips ...).
//   --git-staged: run from a git pre-commit hook; fails if a staged added file is an image.
//   --selftest: proves it.
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchesAny } from './lib/glob.mts';
import { contextOf, isMain, runAsHook } from './lib/hook-log.mts';
import { gitLines } from './lib/git-run.mts';
import { codeFolders, readLayout } from './lib/layout.mts';
import { claudeRoot, commandLeavesProject, insideProject, relInCheckout } from './lib/project.mts';
import { bashOf, runHook, scratchProject, snapshot, verdicts, writeOf, writtenSince } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { HookContext, Hook } from './lib/types.d.mts';
import { refuse, pass } from './lib/verdict.mts';
import { writesOf } from './lib/writes.mts';

const IMAGE = /\.(png|jpe?g|gif|bmp|tiff?|webp|heic|ico|icns|svg|psd|tga|exr|hdr|ktx2?|dds|astc)$/i;
const ALLOWED = ['tests/**', '**/tests/**', 'goldens/**', '**/goldens/**', 'docs/**', 'captures/**', 'build/**'];

/** What a checkout's `guards.images` says, each list only when it is a list of strings. */
function imageGuard(root: string): { guarded?: string[]; allowed?: string[] } {
  const images = readLayout(root).guards?.['images'];
  if (!images || typeof images !== 'object') return {};
  const strings = (v: unknown): string[] | undefined => (Array.isArray(v) && v.every((x) => typeof x === 'string') ? v as string[] : undefined);
  const { guarded, allowed } = images as Record<string, unknown>;
  const found: { guarded?: string[]; allowed?: string[] } = {};
  const g = strings(guarded);
  const a = strings(allowed);
  if (g) found.guarded = g;
  if (a) found.allowed = a;
  return found;
}

// Guarded: every code folder in the layout, plus anything that would be bundled as a resource.
const guarded = (root: string): string[] =>
  imageGuard(root).guarded ?? [...new Set(['src/**', 'Resources/**', 'resources/**', 'assets/**', ...codeFolders(readLayout(root)).map((f) => `${f}/**`)])];
const allowed = (root: string): string[] => imageGuard(root).allowed ?? ALLOWED;

// A path is judged in its own checkout, so an image written into an agent worktree is caught too.
function isBlocked(p: string, base: string, ctx: Pick<HookContext, 'projectDir' | 'cwd'>): boolean {
  const abs = resolve(base, p);
  if (!IMAGE.test(abs) || !insideProject(ctx.projectDir, abs, ctx.cwd)) return false;
  const rel = relInCheckout(ctx.projectDir, abs, ctx.cwd).replace(/^\.claude\/worktrees\/[^/]+\//, '');
  const root = claudeRoot(ctx.projectDir, abs, ctx.cwd);
  return !rel.startsWith('.claude/') && matchesAny(rel, guarded(root)) && !matchesAny(rel, allowed(root));
}

const failure = (files: readonly string[]): string =>
  `BLOCKED by no-shipped-images: ${files.join(', ')}\n` +
  'Nothing is pre-rendered: draw it in code; a picture check renders off-screen, from the app itself, into an allowed folder (guards.images.allowed in .claude/layout.json).\n';

/** The by-hand mode a git pre-commit hook runs: the refusal text when a staged added file is an image, else null. */
export function gitStaged(ctx: HookContext): string | null {
  const names = gitLines(['diff', '--cached', '--name-only', '--diff-filter=AR'], { cwd: ctx.projectDir, env: ctx.env });
  const bad = names.filter((f) => isBlocked(f, ctx.projectDir, ctx));
  return bad.length ? failure(bad) : null;
}

export const hook: Hook = (event, ctx) => {
  const input = event.tool_input ?? {};
  const command = input.command ?? '';
  const bad = writesOf(event, event.cwd ?? ctx.projectDir, ctx.env).filter((w) => w.op !== 'delete' && isBlocked(w.path, ctx.projectDir, ctx)).map((w) => w.path);
  if (event.tool_name === 'Bash' && !commandLeavesProject(ctx.projectDir, command, ctx.cwd, ctx.env.HOME)) {
    const tokens = command.split(/\s+/).map((t) => t.replace(/^['"]|['"]$/g, ''));
    if (/\b(curl|wget|convert|magick|sips|rsvg-convert|ffmpeg)\b/.test(command)) bad.push(...tokens.filter((t) => t && isBlocked(t, event.cwd ?? ctx.projectDir, ctx)));
  }
  return bad.length ? refuse(failure([...new Set(bad)])) : pass;
};

/** An image is judged in its own checkout: one written or copied into a worktree's guarded folder is refused, a golden is not. */
export const worktreeCase: WorktreeCase = {
  steps: [
    { label: 'an image in a guarded folder of the worktree', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/src/painter/logo.png', content: 'x' } }, want: 2 },
    { label: 'a golden render in the worktree', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/tests/goldens/panel.png', content: 'x' } }, want: 0 },
    { label: 'cp of an image into the worktree', event: { tool_name: 'Bash', tool_input: { command: 'cp /tmp/a.png {wt}/src/app/logo.png' } }, want: 2 },
  ],
};

export function selftest(): number {
  const me = fileURLToPath(import.meta.url);
  const dir = scratchProject({}, { folders: { app: { path: 'lib/app/src', purpose: 'app' }, docs: { path: 'docs', purpose: 'docs' } }, concepts: {} });
  const before = snapshot(dir);   // the project as the judge finds it: the rows below must leave it as it is
  const w = (file: string): number | null => runHook(me, dir, writeOf(join(dir, file), 'x')).status;
  return verdicts('no-shipped-images', [
    ['an image in a code folder', w('lib/app/src/logo.png'), 2],
    ['an image in src/', w('src/icon.svg'), 2],
    ['an image in resources/', w('resources/knob.webp'), 2],
    ['a font is data, not a picture', w('resources/Inter.ttf'), 0],
    ['a golden render under tests/', w('tests/goldens/panel.png'), 0],
    ['a picture in docs/', w('docs/shot.png'), 0],
    ['cp of an image into a code folder', runHook(me, dir, bashOf('cp /tmp/a.png lib/app/src/a.png', dir)).status, 2],
    ['cp into tests/', runHook(me, dir, bashOf('cp /tmp/a.png tests/goldens/a.png', dir)).status, 0],
    ['a judge writes no file (the write trap)', writtenSince(dir, before).join(','), ''],
  ]);
}

// `--git-staged` runs from a git pre-commit hook, in this process: the refusal on stderr and exit 1.
if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'no-shipped-images', hook, selftest, {
  flags: { '--git-staged': () => { const said = gitStaged(contextOf()); if (said !== null) process.stderr.write(said); return said === null ? 0 : 1; } },
});
