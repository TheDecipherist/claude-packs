// What a project is, from its files and its dependencies: the configuration and the packs `scan` recommends, each with its evidence.
// One row per pack: a pack is recommended when its row finds something, and says what it found.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readConfig } from './configs.mjs';

const dep = (ctx, ...names) => names.find((n) => ctx.deps.has(n) || [...ctx.deps].some((d) => d.startsWith(`${n}/`)));
const file = (ctx, re) => ctx.files.find((f) => re.test(f));
const said = (hit, what) => (hit ? `${what}: ${hit}` : null);

const ROWS = {
  'js-ts': (c) => said(file(c, /\.(ts|tsx|js|jsx|mjs|cjs)$/), 'JS or TS source'),
  mongo: (c) => said(dep(c, 'mongodb', 'mongoose'), 'dependency'),
  fastify: (c) => said(dep(c, 'fastify'), 'dependency'),
  ai: (c) => said(dep(c, '@anthropic-ai/sdk', 'openai', 'ai', '@ai-sdk'), 'dependency'),
  docker: (c) => said(file(c, /(^|\/)(Dockerfile[^/]*|[\w.-]*compose[\w.-]*\.ya?ml)$/), 'file'),
  'shell-hooks': (c) => said(file(c, /(^|\/)hooks\/[^/]+\.(sh|mjs|js|cjs)$/), 'hook file'),
  'html-ui': (c) => said(file(c, /(^|\/)(ui|views|templates)\/[^/]+\.ts$|\.view\.ts$/), 'server-rendered UI'),
  web: (c) => said(dep(c, 'next', 'react', 'vue', 'svelte') ?? file(c, /\.(tsx|jsx|vue|svelte)$/), 'web UI'),
  tui: (c) => said(dep(c, 'ink', 'blessed', 'terminal-kit'), 'dependency'),
  nginx: (c) => said(file(c, /(^|\/)nginx[^/]*\.conf$|\/nginx\/.+\.conf$/), 'file'),
  'stored-text': (c) => (ROWS.web(c) || ROWS['html-ui'](c)) && (ROWS.mongo(c) || dep(c, 'pg', 'mysql2', 'sqlite3', 'better-sqlite3', 'prisma', 'drizzle-orm')) ? 'a UI and a database' : null,
  'ui-craft': (c) => ROWS.web(c) ?? ROWS['html-ui'](c),
  'audio-core': (c) => said(file(c, /(^|\/)(JuceHeader\.h|.*\.jucer)$/) ?? file(c, /PluginProcessor\.(h|cpp)$/), 'JUCE file'),
  'gpu-painter': (c) => said(file(c, /\.wgsl$/), 'shader'),
};

// The configuration of the project: a synth, else a JS or TS project, else base. full-stack is offered, never assumed: it fixes a folder layout.
function configFor(ctx) {
  if (ROWS['audio-core'](ctx)) return { name: 'synth-creator', why: 'JUCE sources' };
  if (ROWS['js-ts'](ctx)) return { name: 'node', why: 'JS or TS sources' };
  return { name: 'base', why: 'no stack the kit has a configuration for' };
}

export function recommend(projectDir, files) {
  const deps = new Set();
  for (const f of files.filter((x) => /(^|\/)package\.json$/.test(x))) {
    const p = join(projectDir, f);
    if (!existsSync(p)) continue;
    try {
      const j = JSON.parse(readFileSync(p, 'utf8'));
      for (const k of ['dependencies', 'devDependencies', 'peerDependencies']) for (const n of Object.keys(j[k] ?? {})) deps.add(n);
    } catch { /* a package.json that does not parse says nothing */ }
  }
  const ctx = { deps, files };
  const { name, why } = configFor(ctx);
  const config = readConfig(name);
  const packs = [];
  const leftOut = [];
  for (const pack of config.packs.choose) {
    const found = ROWS[pack]?.(ctx);
    if (found) packs.push({ pack, why: found });
    else leftOut.push(pack);
  }
  const fullStack = dep(ctx, 'next') && dep(ctx, 'fastify');
  return { config: name, why, always: config.packs.always, packs, leftOut, fullStack: Boolean(fullStack) };
}
