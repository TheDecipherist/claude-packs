// Reads the packs shipped in this npm package and plans which file goes where in a project.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { notInstalled, walk } from '../packs/base/hooks/lib/files.mjs';

export const PACKS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'packs');
const CLAUDE_DIRS = ['rules', 'checks', 'hooks', 'tools'];
// A tool's own config, read from the project's root: the project's once written, so a pack's file never replaces it.
const PROJECT_ROOT_FILES = [['clang-tidy', '.clang-tidy'], ['clippy.toml', 'clippy.toml']];

// Packs from a team's own repository (lib/custom-packs.mjs): name -> the folder it was fetched to.
const CUSTOM = new Map();
export const registerPack = (name, folder) => CUSTOM.set(name, folder);
export const customPacks = () => [...CUSTOM.keys()];
export const packRoot = (name) => CUSTOM.get(name) ?? join(PACKS_DIR, name);

export function availablePacks() {
  return [...readdirSync(PACKS_DIR).filter((d) => existsSync(join(PACKS_DIR, d, 'pack.json'))), ...CUSTOM.keys()];
}

export function readPack(name) {
  const file = join(packRoot(name), 'pack.json');
  if (!existsSync(file)) throw new Error(`unknown pack "${name}" (available: ${availablePacks().join(', ')})`);
  const pack = JSON.parse(readFileSync(file, 'utf8'));
  if (!CUSTOM.has(name)) return pack;
  // A hook runs code on every tool call, so somebody else's hook is off until the project names it in "enable".
  const hooks = join(packRoot(name), 'hooks');
  return { ...pack, optIn: [...(pack.optIn ?? []), ...(existsSync(hooks) ? readdirSync(hooks).filter((f) => /\.(mjs|py)$/.test(f)).map((f) => `hooks/${f}`) : [])] };
}

// A pack's files as the installer copies them: never a byte-code cache, and never what only the kit's build reads (a .mts, a
// .d.mts, a source map, the build's memory: d-2, W2.3).
const packFiles = (dir) => walk(dir, notInstalled);

// Returns [{ src, rel }] where rel is the destination relative to the project root.
// Skills go to the pack's own folder (lazy-loaded nested skills) when it declares one.
export function planFiles(name, layout) {
  const pack = readPack(name);
  const root = packRoot(name);
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
    for (const src of packFiles(join(root, dir))) if (!off(src)) plan.push({ src, rel: join('.claude', relative(root, src)) });
  }
  const skillFolder = pack.skillsIn && layout.folders[pack.skillsIn];
  const skillBase = skillFolder ? join(skillFolder.path, '.claude') : '.claude';
  for (const src of packFiles(join(root, 'skills'))) if (!off(src)) plan.push({ src, rel: join(skillBase, relative(root, src)) });
  for (const [file, rel] of PROJECT_ROOT_FILES) if (existsSync(join(root, file))) plan.push({ src: join(root, file), rel, userOwned: true });
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
  'node-api': ['js-ts', 'http-api', 'mongo', 'fastify', 'ai', 'docker'],
  'node-ui': ['js-ts', 'http-api', 'mongo', 'fastify', 'html-ui', 'stored-text', 'ui-craft', 'docker'],
  'next-app': ['js-ts', 'http-api', 'react', 'mongo', 'web', 'stored-text', 'ui-craft', 'ai', 'docker'],
  'mcp-server': ['js-ts', 'mongo', 'ai', 'shell-hooks'],
  'node-cli': ['js-ts', 'tui'],
  'node-lib': ['js-ts'],
  edge: ['nginx', 'docker'],
  synth: ['cpp', 'audio-core'],
  'synth-rebuild': ['cpp', 'audio-core', 'reverse-engineering', 'midi', 'sound-design', 'instrument-shell'],
  'python-app': ['python', 'shell', 'docker'],
  'shell-tools': ['shell'],
  'go-app': ['go', 'shell', 'docker', 'ci'],
  'rust-app': ['rust', 'shell', 'docker', 'ci'],
};

// Base always first, no duplicates, presets expanded, in the order given.
export function normalisePacks(names) {
  const out = ['base'];
  for (const n of names.flatMap((p) => (Object.hasOwn(PRESETS, p) ? PRESETS[p] : [p]))) if (!out.includes(n)) out.push(n);
  for (const n of out) readPack(n);
  return out;
}
