// What a project is, from its files and its dependencies: the configuration and the packs `scan` recommends, each with its evidence.
// One row per pack: a pack is recommended when its row finds something, and says what it found.
import { join } from 'node:path';
import { isContent } from '../packs/base/hooks/lib/content.mts';
import { readText } from '../packs/base/hooks/lib/files.mts';
import { readJson } from '../packs/base/hooks/lib/json.mts';
import { readLayout } from '../packs/base/hooks/lib/layout.mts';
import { readConfig } from './configs.mts';

/** What a row reads of a project: its dependency names, its files (code), its published files (text), where it is and whether it has no code yet. */
export interface DetectContext {
  deps: ReadonlySet<string>;
  dir: string;
  files: readonly string[];
  published: readonly string[];
  early: boolean;
}

/** A row finds something in the project and says what, or finds nothing (null). */
type Row = (ctx: DetectContext) => string | null;

export interface PackFound { pack: string; why: string }

export interface Recommendation {
  config: string;
  why: string;
  always: readonly string[];
  packs: PackFound[];
  leftOut: string[];
  early: boolean;
  fullStack: boolean;
}

/** The first of these names a dependency of the project (or a scoped package under it). */
const dep = (ctx: DetectContext, ...names: string[]): string | undefined => names.find((n) => ctx.deps.has(n) || [...ctx.deps].some((d) => d.startsWith(`${n}/`)));
const file = (ctx: DetectContext, re: RegExp): string | undefined => ctx.files.find((f) => re.test(f));
const said = (hit: string | undefined, what: string): string | null => (hit ? `${what}: ${hit}` : null);
const textHas = (ctx: DetectContext, rel: string, text: RegExp): boolean => text.test(readText(join(ctx.dir, rel)) ?? '');
// The first of a project's files with this name that holds this text: a name says too little where every project has the same files.
const MOST_READ = 40;
const holds = (ctx: DetectContext, name: RegExp, text: RegExp): string | undefined => ctx.files.filter((f) => name.test(f)).slice(0, MOST_READ).find((f) => textHas(ctx, f, text));

// A project at its start has no source, and only its notes say what it will be (KF-3: a JUCE plugin's first `suggest` said base, with no warning). Once code
// exists the code decides, and a word in a README adds nothing.
const NOTES = /(^|\/)(?:README|PROMPT|BRIEF|SPEC|PLAN)[^/]*\.md$|^docs\/(?:[^/]+\/)*[^/]+\.md$/i;
const NOTED: Readonly<Record<string, RegExp>> = {
  'audio-core': /\bJUCE\b|\bVST3?\b|\baudio plug-?in\b/i,
  cpp: /\bC\+\+/,
  midi: /\bMIDI\b/,
  'sound-design': /\b(?:reverb|synth|synthesi[sz]er|oscillator)\b/i,
  'instrument-shell': /\b(?:front panel|plug-?in editor)\b/i,
  'reverse-engineering': /\bfirmware\b|\breverse[- ]engineer/i,
  python: /\bPython\b/,
  rust: /\bRust\b/,
};
function noted(ctx: DetectContext, pack: string): string | null {
  const re = NOTED[pack];
  if (!ctx.early || !re) return null;
  const notes = [...ctx.files, ...ctx.published].filter((f) => NOTES.test(f)).slice(0, MOST_READ);
  return said(notes.find((f) => textHas(ctx, f, re)), 'named in the notes');
}

// A driver alone says Postgres; a tool that speaks several databases says it only with this second signal in its own file.
const POSTGRES_FILES: readonly (readonly [RegExp, RegExp])[] = [
  [/(^|\/)(?:requirements[^/]*\.txt|pyproject\.toml|Pipfile)$/, /\b(?:psycopg2?(?:-binary)?|asyncpg)\b/],
  [/(^|\/)go\.mod$/, /jackc\/pgx|lib\/pq\b|gorm\.io\/driver\/postgres/],
  [/(^|\/)Cargo\.toml$/, /\b(?:tokio-postgres|deadpool-postgres)\b|\b(?:sqlx|diesel|sea-orm)\b[^\n]*postgres/],
  [/(^|\/)Gemfile$/, /^\s*gem\s+['"]pg['"]/m],
  [/\.prisma$/, /provider\s*=\s*"postgresql"/],
  [/(^|\/)drizzle\.config\.[cm]?[jt]s$/, /dialect:\s*['"]postgresql['"]/],
  [/(^|\/)[\w.-]*compose[\w.-]*\.ya?ml$/, /image:\s*['"]?[\w./-]*(?:postgres|postgis|pgvector|timescale)/],
];

const web: Row = (c) => said(dep(c, 'next', 'react', 'vue', 'svelte') ?? file(c, /\.(tsx|jsx|vue|svelte|html)$/), 'web UI');
const htmlUi: Row = (c) => said(file(c, /(^|\/)(ui|views|templates)\/[^/]+\.ts$|\.view\.ts$/), 'server-rendered UI');
const mongo: Row = (c) => said(dep(c, 'mongodb', 'mongoose'), 'dependency');

const ROWS: Readonly<Record<string, Row>> = {
  'js-ts': (c) => said(file(c, /\.(ts|tsx|js|jsx|mjs|cjs)$/), 'JS or TS source'),
  mongo,
  postgres: (c) => said(dep(c, 'pg', 'postgres', 'pg-promise', '@neondatabase/serverless', '@vercel/postgres'), 'dependency')
    ?? said(POSTGRES_FILES.map(([name, text]) => holds(c, name, text)).find(Boolean), 'Postgres named in'),
  fastify: (c) => said(dep(c, 'fastify'), 'dependency'),
  ai: (c) => said(dep(c, '@anthropic-ai/sdk', 'openai', 'ai', '@ai-sdk'), 'dependency'),
  docker: (c) => said(file(c, /(^|\/)(Dockerfile[^/]*|[\w.-]*compose[\w.-]*\.ya?ml)$/), 'file'),
  'shell-hooks': (c) => said(file(c, /(^|\/)hooks\/[^/]+\.(sh|mjs|js|cjs)$/), 'hook file'),
  'html-ui': htmlUi,
  web,
  tui: (c) => said(dep(c, 'ink', 'blessed', 'terminal-kit'), 'dependency'),
  nginx: (c) => said(file(c, /(^|\/)nginx[^/]*\.conf(?:\.template)?$|\/nginx\/.+\.conf$/), 'file'),
  'stored-text': (c) => ((web(c) || htmlUi(c)) && (mongo(c) || dep(c, 'pg', 'mysql2', 'sqlite3', 'better-sqlite3', 'prisma', 'drizzle-orm')) ? 'a UI and a database' : null),
  'ui-craft': (c) => web(c) ?? htmlUi(c),
  cpp: (c) => said(file(c, /\.(?:cc|cpp|cxx|hh|hpp|mm)$/), 'C++ source'),
  python: (c) => said(file(c, /\.py$/), 'Python source'),
  go: (c) => said(file(c, /\.go$/), 'Go source'),
  rust: (c) => said(file(c, /(^|\/)Cargo\.toml$/) ?? file(c, /\.rs$/), 'Rust crate'),
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
const LEADS: readonly (readonly [name: string, re: RegExp, why: string])[] = [
  ['cpp', /\.(?:c|cc|cpp|cxx|h|hh|hpp|mm)$/, 'C++ sources'],
  ['node', /\.(?:ts|tsx|js|jsx|mjs|cjs)$/, 'JS or TS sources'],
  ['python', /\.py$/, 'Python sources'],
  ['go', /\.go$/, 'Go sources'],
  ['rust', /\.rs$|(^|\/)Cargo\.toml$/, 'Rust sources'],
];

interface Lead { name: string; why: string }

function configFor(ctx: DetectContext): Lead {
  if (ROWS['audio-core']?.(ctx)) return { name: 'synth-creator', why: 'JUCE sources' };
  if (noted(ctx, 'audio-core')) return { name: 'synth-creator', why: 'named in the notes' };
  const [lead] = LEADS.map(([name, re, why]) => ({ name, why, n: ctx.files.filter((f) => re.test(f)).length })).sort((a, b) => b.n - a.n);
  return lead && lead.n ? lead : { name: 'base', why: 'no stack the kit has a configuration for' };
}

const INSTALLED = /(^|\/)(\.claude|node_modules)\//;

// A project that names its configuration has decided; reading the files again can only disagree with it.
function namedConfig(projectDir: string): Lead | null {
  const name = readLayout(projectDir).configuration;
  if (!name) return null;
  try {
    return readConfig(name) ? { name, why: 'named in its layout.json' } : null;
  } catch { return null; }
}

type PackJson = Partial<Record<'dependencies' | 'devDependencies' | 'peerDependencies', Record<string, unknown>>>;

/** The configuration and the packs a project's files and dependencies recommend, each pack with what was found. */
export function recommend(projectDir: string, files: readonly string[]): Recommendation {
  const deps = new Set<string>();
  for (const f of files.filter((x) => /(^|\/)package\.json$/.test(x))) {
    const j = readJson<PackJson>(join(projectDir, f)); // a package.json that does not parse says nothing
    if (j === null || typeof j !== 'object') continue;
    for (const k of ['dependencies', 'devDependencies', 'peerDependencies'] as const) for (const n of Object.keys(j[k] ?? {})) deps.add(n);
  }
  const own = files.filter((f) => !INSTALLED.test(f)); // the kit's own files and installed dependencies say nothing about the project
  const code = own.filter((f) => !isContent(f));
  const early = !LEADS.some(([, re]) => code.some((f) => re.test(f)));
  const ctx: DetectContext = { deps, dir: projectDir, files: code, published: own.filter((f) => isContent(f)), early };
  const { name, why } = namedConfig(projectDir) ?? configFor(ctx);
  const config = readConfig(name);
  const packs: PackFound[] = [];
  const leftOut: string[] = [];
  for (const pack of config.packs.choose) {
    const found = ROWS[pack]?.(ctx) ?? noted(ctx, pack);
    if (found) packs.push({ pack, why: found });
    else leftOut.push(pack);
  }
  const fullStack = dep(ctx, 'next') && dep(ctx, 'fastify');
  return { config: name, why, always: config.packs.always, packs, leftOut, early: ctx.early, fullStack: Boolean(fullStack) };
}
