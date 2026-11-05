// What a project is, from its files and its dependencies: the configuration and the packs `scan` recommends, each with its evidence.
// One row per pack: a pack is recommended when its row finds something, and says what it found.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isContent } from '../packs/base/hooks/lib/content.mjs';
import { readConfig } from './configs.mjs';

const dep = (ctx, ...names) => names.find((n) => ctx.deps.has(n) || [...ctx.deps].some((d) => d.startsWith(`${n}/`)));
const file = (ctx, re) => ctx.files.find((f) => re.test(f));
const said = (hit, what) => (hit ? `${what}: ${hit}` : null);
// The first of a project's files with this name that holds this text: a name says too little where every project has the same files.
const MOST_READ = 40;
function holds(ctx, name, text) {
  return ctx.files.filter((f) => name.test(f)).slice(0, MOST_READ).find((f) => { try { return text.test(readFileSync(join(ctx.dir, f), 'utf8')); } catch { return false; } });
}

const ROWS = {
  'js-ts': (c) => said(file(c, /\.(ts|tsx|js|jsx|mjs|cjs)$/), 'JS or TS source'),
  mongo: (c) => said(dep(c, 'mongodb', 'mongoose'), 'dependency'),
  fastify: (c) => said(dep(c, 'fastify'), 'dependency'),
  ai: (c) => said(dep(c, '@anthropic-ai/sdk', 'openai', 'ai', '@ai-sdk'), 'dependency'),
  docker: (c) => said(file(c, /(^|\/)(Dockerfile[^/]*|[\w.-]*compose[\w.-]*\.ya?ml)$/), 'file'),
  'shell-hooks': (c) => said(file(c, /(^|\/)hooks\/[^/]+\.(sh|mjs|js|cjs)$/), 'hook file'),
  'html-ui': (c) => said(file(c, /(^|\/)(ui|views|templates)\/[^/]+\.ts$|\.view\.ts$/), 'server-rendered UI'),
  web: (c) => said(dep(c, 'next', 'react', 'vue', 'svelte') ?? file(c, /\.(tsx|jsx|vue|svelte|html)$/), 'web UI'),
  tui: (c) => said(dep(c, 'ink', 'blessed', 'terminal-kit'), 'dependency'),
  nginx: (c) => said(file(c, /(^|\/)nginx[^/]*\.conf(?:\.template)?$|\/nginx\/.+\.conf$/), 'file'),
  'stored-text': (c) => (ROWS.web(c) || ROWS['html-ui'](c)) && (ROWS.mongo(c) || dep(c, 'pg', 'mysql2', 'sqlite3', 'better-sqlite3', 'prisma', 'drizzle-orm')) ? 'a UI and a database' : null,
  'ui-craft': (c) => ROWS.web(c) ?? ROWS['html-ui'](c),
  cpp: (c) => said(file(c, /\.(?:cc|cpp|cxx|hh|hpp|mm)$/), 'C++ source'),
  python: (c) => said(file(c, /\.py$/), 'Python source'),
  go: (c) => said(file(c, /\.go$/), 'Go source'),
  midi: (c) => said(file(c, /\.(syx|mid)$|(^|\/)\w*(Midi|MIDI|Sysex|SysEx)\w*\.(h|hpp|cpp|cc)$/), 'MIDI file')
    ?? said(holds(c, /\.(h|hpp|cpp|cc)$/, /\b(MidiMessage|isController|isNoteOn|getSysExData)\b/), 'MIDI handling'),
  'sound-design': (c) => said(file(c, /(^|\/)\w*(Voice|Oscillator|Filter|Reverb|Envelope|Lfo|LFO)\w*\.(h|hpp|cpp|cc)$/), 'DSP source'),
  'reverse-engineering': (c) => said(file(c, /(^|\/)[\w-]*(firmware|disasm|disassembl|x86dis|dis8051|reverse[-_]engineer)[\w-]*\.(md|py)$|(^|\/)[\w.-]+[-_]re\.md$|(^|\/)tools\/re\//i), 'reverse-engineering notes')
    ?? said(holds(c, /(^|\/)(research|laws|provenance)\.md$/, /\[FW\]/), 'firmware findings'),
  'instrument-shell': (c) => said(file(c, /(^|\/)PluginEditor\.(h|cpp)$/), 'plugin editor'),
  'content-site': (c) => said(c.published.find((f) => /\.(md|mdx|html)$/.test(f)) ?? file(c, /(^|\/)sitemap\.xml$/), 'published page'),
  'dynamic-data': (c) => said(file(c, /(^|[/_-])(cms|entity[-_]?definitions?|field[-_]?configs?|page[-_]?builder|admin[-_]?generator)([/_.-]|$)/i), 'definition-driven file'),
  ci: (c) => said(file(c, /^\.github\/workflows\/[^/]+\.ya?ml$/), 'workflow'),
  'http-api': (c) => said(dep(c, 'express', 'fastify', 'koa', 'hono', '@nestjs/core', 'next'), 'dependency') ?? said(file(c, /(^|\/)app\/api\/.*route\.ts$|(^|\/)routes\/[^/]+\.[jt]s$/), 'route file'),
  react: (c) => said(dep(c, 'react'), 'dependency') ?? said(file(c, /\.[jt]sx$/), 'JSX source'),
  websocket: (c) => said(dep(c, 'ws', 'socket.io', 'uWebSockets.js', '@fastify/websocket'), 'dependency'),
  'multi-tenant': (c) => said(file(c, /(^|[/_-])(tenants?|compan(?:y|ies)|organi[sz]ations?|workspaces?)([/_.-]|$)/i), 'tenant file'),
  'host-agent': (c) => said(dep(c, 'ssh2'), 'dependency') ?? said(file(c, /(^|\/)install[-_]agent|\.service$/), 'agent file'),
  shell: (c) => said(file(c, /\.(?:sh|bash|zsh)$/), 'shell script'),
  'audio-core': (c) => said(file(c, /(^|\/)(JuceHeader\.h|.*\.jucer)$/) ?? file(c, /PluginProcessor\.(h|cpp)$/), 'JUCE file'),
  'gpu-painter': (c) => said(file(c, /\.wgsl$/), 'shader'),
};

// The configuration of the project: a synth; else the language most of its files are in; else base. full-stack is offered, never assumed: it fixes a folder layout.
const LEADS = [['cpp', /\.(?:c|cc|cpp|cxx|h|hh|hpp|mm)$/, 'C++ sources'], ['node', /\.(?:ts|tsx|js|jsx|mjs|cjs)$/, 'JS or TS sources'], ['python', /\.py$/, 'Python sources'], ['go', /\.go$/, 'Go sources']];

function configFor(ctx) {
  if (ROWS['audio-core'](ctx)) return { name: 'synth-creator', why: 'JUCE sources' };
  const [lead] = LEADS.map(([name, re, why]) => ({ name, why, n: ctx.files.filter((f) => re.test(f)).length })).sort((a, b) => b.n - a.n);
  return lead.n ? lead : { name: 'base', why: 'no stack the kit has a configuration for' };
}

const INSTALLED = /(^|\/)\.claude\//;

// A project that names its configuration has decided; reading the files again can only disagree with it.
function namedConfig(projectDir) {
  try {
    const name = JSON.parse(readFileSync(join(projectDir, '.claude/layout.json'), 'utf8')).configuration;
    return name && readConfig(name) ? { name, why: 'named in its layout.json' } : null;
  } catch { return null; }
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
  const own = files.filter((f) => !INSTALLED.test(f)); // the kit's own files in a project say nothing about the project
  const ctx = { deps, dir: projectDir, files: own.filter((f) => !isContent(f)), published: own.filter(isContent) };
  const { name, why } = namedConfig(projectDir) ?? configFor(ctx);
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
