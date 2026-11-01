#!/usr/bin/env node
// Nothing is ever pre-rendered (Stellix spec 0.2). No image file may be added to the source or
// resources (fonts are allowed: data, not pictures). Test output and goldens live outside them.
// A project sets its own scope in .claude/layout.json "guards": { "images": { "guarded": [globs],
// "allowed": [globs] } }: "guarded" replaces the code folders (["**"]: anywhere in the repo), "allowed"
// replaces the default allowed folders (Stellix: design/reference/** and build/pictures/** only).
//   PreToolUse (Write|Bash): blocks writing, copying or moving an image into a guarded folder.
//   --git-staged: run from a git pre-commit hook; fails if a staged added file is an image.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { matchesAny } from './lib/glob.mjs';
import { codeFolders, readLayout } from './lib/layout.mjs';
import { claudeRoot, commandLeavesProject, insideProject, relInCheckout } from './lib/project.mjs';

const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const IMAGE = /\.(png|jpe?g|gif|bmp|tiff?|webp|heic|ico|icns|svg|psd|tga|exr|hdr|ktx2?|dds|astc)$/i;
// Guarded: every code folder in the layout, plus anything that would be bundled as a resource.
const guarded = (root) => readLayout(root).guards?.images?.guarded ?? [...new Set(['src/**', 'Resources/**', 'resources/**', 'assets/**', ...codeFolders(readLayout(root)).map((f) => `${f}/**`)])];
const ALLOWED = ['tests/**', '**/tests/**', 'goldens/**', '**/goldens/**', 'docs/**', 'captures/**', 'build/**'];
const allowed = (root) => readLayout(root).guards?.images?.allowed ?? ALLOWED;

// A path is judged in its own checkout, so an image written into an agent worktree is caught too.
const isBlocked = (p, base = ROOT) => {
  const abs = resolve(base, p);
  if (!IMAGE.test(abs) || !insideProject(abs)) return false;
  const rel = relInCheckout(abs).replace(/^\.claude\/worktrees\/[^/]+\//, '');
  const root = claudeRoot(abs);
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
  const out = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=AR'], { cwd: ROOT, encoding: 'utf8' });
  const bad = out.split('\n').filter((f) => f && isBlocked(f));
  return bad.length ? (fail(bad), 1) : 0;
}

function hook() {
  let payload;
  try {
    payload = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return 0;
  }
  const input = payload.tool_input ?? {};
  if (payload.tool_name === 'Bash') {
    if (commandLeavesProject(input.command)) return 0;
    const tokens = (input.command ?? '').split(/\s+/).map((t) => t.replace(/^['"]|['"]$/g, ''));
    const writes = /\b(cp|mv|ln|curl|wget|convert|magick|sips|rsvg-convert|ffmpeg)\b|>/.test(input.command ?? '');
    const bad = writes ? tokens.filter((t) => t && isBlocked(t, payload.cwd ?? ROOT)) : [];
    return bad.length ? fail(bad) : 0;
  }
  return input.file_path && isBlocked(input.file_path) ? fail([input.file_path]) : 0;
}

process.exit(process.argv.includes('--git-staged') ? gitStaged() : hook());
