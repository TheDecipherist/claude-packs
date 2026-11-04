// Reads the packs shipped in this npm package and plans which file goes where in a project.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PACKS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'packs');
const CLAUDE_DIRS = ['rules', 'checks', 'hooks', 'tools'];

export function availablePacks() {
  return readdirSync(PACKS_DIR).filter((d) => existsSync(join(PACKS_DIR, d, 'pack.json')));
}

export function readPack(name) {
  const file = join(PACKS_DIR, name, 'pack.json');
  if (!existsSync(file)) throw new Error(`unknown pack "${name}" (available: ${availablePacks().join(', ')})`);
  return JSON.parse(readFileSync(file, 'utf8'));
}

// Python's byte-code caches are never pack files (a selftest run inside the package makes them).
const JUNK = /^(__pycache__|\.DS_Store)$|\.pyc$/;

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((entry) => !JUNK.test(entry)).flatMap((entry) => {
    const abs = join(dir, entry);
    return statSync(abs).isDirectory() ? walk(abs) : [abs];
  });
}

// Returns [{ src, rel }] where rel is the destination relative to the project root.
// Skills go to the pack's own folder (lazy-loaded nested skills) when it declares one.
export function planFiles(name, layout) {
  const pack = readPack(name);
  const root = join(PACKS_DIR, name);
  const plan = [];
  // A rule that states a hook's law ("# hook: <file>" in its frontmatter) goes where its hook goes: held or left out with it (0.10.0).
  const ruleHook = (src) => readFileSync(src, 'utf8').match(/^---\n(?:[^\n]*\n)*?# hook:\s*(\S+)\s*\n(?:[^\n]*\n)*?---/)?.[1];
  const off = (src) => {
    const rel = relative(root, src);
    if (isDisabled(layout, rel)) return true;
    const hook = /^rules[\\/][^\\/]+\.md$/.test(rel) && ruleHook(src);
    return Boolean(hook) && isDisabled(layout, `hooks/${hook}`);
  };
  for (const dir of CLAUDE_DIRS) {
    for (const src of walk(join(root, dir))) if (!off(src)) plan.push({ src, rel: join('.claude', relative(root, src)) });
  }
  const skillFolder = pack.skillsIn && layout.folders[pack.skillsIn];
  const skillBase = skillFolder ? join(skillFolder.path, '.claude') : '.claude';
  for (const src of walk(join(root, 'skills'))) if (!off(src)) plan.push({ src, rel: join(skillBase, relative(root, src)) });
  const tidy = join(root, 'clang-tidy');
  if (existsSync(tidy)) plan.push({ src: tidy, rel: '.clang-tidy', userOwned: true });
  return plan;
}

// Every hook script any pack ships (node .mjs or python3 .py), by file name. settings.json entries
// that run one of these are the package's; every other hook entry is the project's own.
export function kitHookScripts() {
  const out = new Set();
  for (const name of availablePacks()) {
    const dir = join(PACKS_DIR, name, 'hooks');
    if (existsSync(dir)) for (const f of readdirSync(dir)) if (/\.(mjs|py)$/.test(f)) out.add(f);
  }
  return out;
}

// layout.disable lists pack items a project switches off because it already has its own:
// "checks/one-seeded-random.json", "hooks/no-shipped-images.mjs", "rules/x.md", "skills/gpu-capture".
export function isDisabled(layout, packRel) {
  const p = packRel.replace(/\\/g, '/');
  return (layout.disable ?? []).some((d) => p === d || p.startsWith(`${d.replace(/\/$/, '')}/`));
}

// A preset names a stack; `init node-api` installs exactly the packs that stack needs (v7 additions 0.11.0, v8 0.12.0). The
// configuration is then the smallest one that takes those packs (lib/configs.mjs inferConfig): `node` for the node
// presets, `synth-creator` for synth.
export const PRESETS = {
  'node-api': ['js-ts', 'mongo', 'fastify', 'ai', 'docker'],
  'node-ui': ['js-ts', 'mongo', 'fastify', 'html-ui', 'docker'],
  'next-app': ['js-ts', 'mongo', 'web', 'ai', 'docker'],
  'mcp-server': ['js-ts', 'mongo', 'ai', 'shell-hooks'],
  'node-cli': ['js-ts', 'tui'],
  'node-lib': ['js-ts'],
  edge: ['nginx', 'docker'],
  synth: ['audio-core'],
};

// Base always first, no duplicates, presets expanded, in the order given.
export function normalisePacks(names) {
  const out = ['base'];
  for (const n of names.flatMap((p) => (Object.hasOwn(PRESETS, p) ? PRESETS[p] : [p]))) if (!out.includes(n)) out.push(n);
  for (const n of out) readPack(n);
  return out;
}
