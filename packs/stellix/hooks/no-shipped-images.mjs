#!/usr/bin/env node
// Nothing is ever pre-rendered (Stellix spec 0.2). No image file may be added to the source or
// resources (fonts are allowed: data, not pictures). Test output and goldens live outside them.
// A project sets its own scope in .claude/layout.json "guards": { "images": { "guarded": [globs],
// "allowed": [globs] } }: "guarded" replaces the code folders (["**"]: anywhere in the repo), "allowed"
// replaces the default allowed folders (Stellix: design/reference/** and build/pictures/** only).
//   PreToolUse (Write|Edit|MultiEdit|NotebookEdit|Bash): blocks writing, copying or moving an image into a guarded
//   folder by any route (lib/writes.mjs), and a download or conversion that names one (curl, convert, sips ...).
//   --git-staged: run from a git pre-commit hook; fails if a staged added file is an image.
//   --selftest: proves it.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchesAny } from './lib/glob.mjs';
import { codeFolders, readLayout } from './lib/layout.mjs';
import { claudeRoot, commandLeavesProject, insideProject, relInCheckout } from './lib/project.mjs';
import { writesOf } from './lib/writes.mjs';
import { bashOf, runHook, scratchProject, verdicts, writeOf } from './lib/selftest.mjs';
import { asHook, isMain, projectRoot } from './lib/hook-log.mjs';

const IMAGE = /\.(png|jpe?g|gif|bmp|tiff?|webp|heic|ico|icns|svg|psd|tga|exr|hdr|ktx2?|dds|astc)$/i;
// Guarded: every code folder in the layout, plus anything that would be bundled as a resource.
const guarded = (root) => readLayout(root).guards?.images?.guarded ?? [...new Set(['src/**', 'Resources/**', 'resources/**', 'assets/**', ...codeFolders(readLayout(root)).map((f) => `${f}/**`)])];
const ALLOWED = ['tests/**', '**/tests/**', 'goldens/**', '**/goldens/**', 'docs/**', 'captures/**', 'build/**'];
const allowed = (root) => readLayout(root).guards?.images?.allowed ?? ALLOWED;

// A path is judged in its own checkout, so an image written into an agent worktree is caught too.
const isBlocked = (p, base = projectRoot()) => {
  const abs = resolve(base, p);
  if (!IMAGE.test(abs) || !insideProject(projectRoot(), abs, process.cwd())) return false;
  const rel = relInCheckout(projectRoot(), abs, process.cwd()).replace(/^\.claude\/worktrees\/[^/]+\//, '');
  const root = claudeRoot(projectRoot(), abs, process.cwd());
  return !rel.startsWith('.claude/') && matchesAny(rel, guarded(root)) && !matchesAny(rel, allowed(root));
};

function fail(files) {
  process.stderr.write(
    `BLOCKED by no-shipped-images: ${files.join(', ')}\n` +
      'Nothing is pre-rendered: draw it in code; a picture check renders off-screen, from the app itself, into an allowed folder (guards.images.allowed in .claude/layout.json).\n',
  );
  return 2;
}

function gitStaged() {
  const out = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=AR'], { cwd: projectRoot(), encoding: 'utf8' });
  const bad = out.split('\n').filter((f) => f && isBlocked(f));
  return bad.length ? (fail(bad), 1) : 0;
}

function main(text) {
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    return 0;
  }
  const input = payload.tool_input ?? {};
  const bad = writesOf(payload, payload.cwd ?? projectRoot(), process.env).filter((w) => w.op !== 'delete' && isBlocked(w.path)).map((w) => w.path);
  if (payload.tool_name === 'Bash' && !commandLeavesProject(projectRoot(), input.command, process.cwd(), process.env.HOME)) {
    const tokens = (input.command ?? '').split(/\s+/).map((t) => t.replace(/^['"]|['"]$/g, ''));
    if (/\b(curl|wget|convert|magick|sips|rsvg-convert|ffmpeg)\b/.test(input.command ?? '')) bad.push(...tokens.filter((t) => t && isBlocked(t, payload.cwd ?? projectRoot())));
  }
  return bad.length ? fail([...new Set(bad)]) : 0;
}

function selftest() {
  const me = fileURLToPath(import.meta.url);
  const dir = scratchProject({}, { folders: { app: { path: 'lib/app/src', purpose: 'app' }, docs: { path: 'docs', purpose: 'docs' } }, concepts: {} });
  const w = (file) => runHook(me, dir, writeOf(join(dir, file), 'x')).status;
  return verdicts('no-shipped-images', [
    ['an image in a code folder', w('lib/app/src/logo.png'), 2],
    ['an image in src/', w('src/icon.svg'), 2],
    ['an image in resources/', w('resources/knob.webp'), 2],
    ['a font is data, not a picture', w('resources/Inter.ttf'), 0],
    ['a golden render under tests/', w('tests/goldens/panel.png'), 0],
    ['a picture in docs/', w('docs/shot.png'), 0],
    ['cp of an image into a code folder', runHook(me, dir, bashOf('cp /tmp/a.png lib/app/src/a.png', dir)).status, 2],
    ['cp into tests/', runHook(me, dir, bashOf('cp /tmp/a.png tests/goldens/a.png', dir)).status, 0],
  ]);
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) {
  const arg = process.argv.slice(2);
  process.exit(arg.includes('--selftest') ? selftest() : arg.includes('--git-staged') ? gitStaged() : await asHook('no-shipped-images', main));
}
