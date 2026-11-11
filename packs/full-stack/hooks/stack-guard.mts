// stack-guard (PreToolUse, Write|Edit|MultiEdit|NotebookEdit|Bash): the full-stack configuration's stack is Fastify and
// Next.js, and Zod 4 (STEP 3 item 4). Refused, by every write route (lib/writes.mjs) and on an install command:
//   - express or vite added to a package.json (dependencies of any kind) or installed (`npm i`, `pnpm add`, `yarn add`, `bun add`);
//   - an import or require of express or vite (or one of their subpaths, @vitejs/*) added to a JS or TS file;
//   - zod pinned below 4 in a package.json, or installed as zod@3.
// The API is Fastify (routes, inject() tests, its own plugins: @fastify/helmet, @fastify/rate-limit); the web app is Next.js,
// which builds itself. Another project's files are not judged.
//   node stack-guard.mjs --selftest
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, runAsHook } from './lib/hook-log.mts';
import { parseJson } from './lib/json.mts';
import { bashOf, runHook, scratchProject, snapshot, verdicts, writeOf, writtenSince } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { Hook } from './lib/types.d.mts';
import { judgeVerdict } from './lib/writes.mts';

const BANNED = /^(express|vite|@vitejs\/.+)$/;
const CODE: ReadonlySet<string> = new Set(['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts', '.tsx', '.jsx']);
const IMPORT = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)['"]((?:@vitejs\/[\w.-]+|express|vite)(?:\/[\w./-]*)?)['"]/gm;
const WHY = 'The full-stack configuration builds on Fastify (the API: routes, handlers, inject() tests, @fastify/helmet and @fastify/rate-limit) and Next.js (the web app, which builds itself). Use those; express and vite are not part of this stack.';

type Deps = Record<string, unknown>;

/** Every dependency a package.json names, of any kind, or null when its text is not JSON. */
function depsOf(text: string | null): Deps | null {
  const json = parseJson<Record<string, unknown>>(text || '{}');
  if (json === null || typeof json !== 'object') return null;
  const kind = (key: string): Deps => { const v = json[key]; return v && typeof v === 'object' ? v as Deps : {}; };
  return Object.assign({}, kind('dependencies'), kind('devDependencies'), kind('peerDependencies'), kind('optionalDependencies'));
}
const zodBelow4 = (spec: unknown): boolean => typeof spec === 'string' && /^[\^~>=<\s]*[0-3](\.|$)/.test(spec.trim());

export function judgeManifest(before: string | null, after: string | null): string | null {
  const was = depsOf(before) ?? {};
  const now = depsOf(after);
  if (!now) return null;
  const added = Object.keys(now).filter((d) => BANNED.test(d) && !(d in was));
  if (added.length) return `package.json gains ${added.join(', ')}. ${WHY}`;
  if (zodBelow4(now['zod']) && now['zod'] !== was['zod']) return `package.json pins zod ${String(now['zod'])}. Schemas are Zod 4 (import { z } from 'zod', version 4 or later); take the latest 4.x.`;
  return null;
}

export function judgeCode(before: string | null, after: string | null): string | null {
  const names = (t: string | null): string[] => [...(t ?? '').matchAll(IMPORT)].map((m) => m[1] ?? '');
  const had = names(before);
  const added = names(after).filter((n) => !had.includes(n));
  return added.length ? `this file gains an import of ${added[0] ?? ''}. ${WHY}` : null;
}

export function judgeInstall(command: string): string | null {
  for (const part of command.replace(/<<-?\s*['"]?(\w+)['"]?[\s\S]*?\n\1\b/g, '').split(/&&|\|\||;|\|/)) {
    const w = part.trim().split(/\s+/);
    const at = w.findIndex((x, i) => ['npm', 'pnpm', 'yarn', 'bun'].includes(w[i - 1] ?? '') && ['i', 'install', 'add'].includes(x));
    if (at < 0) continue;
    for (const a of w.slice(at + 1).filter((x) => !x.startsWith('-'))) {
      const name = a.replace(/(?!^)@[^/]*$/, '');
      if (BANNED.test(name)) return `\`${part.trim()}\` installs ${name}. ${WHY}`;
      if (name === 'zod' && /@[\^~]?[0-3](\.|$)/.test(a.slice(name.length))) return `\`${part.trim()}\` installs ${a}. Schemas are Zod 4: install zod@4 (the latest).`;
    }
  }
  return null;
}

export const hook: Hook = (event, ctx) => judgeVerdict(event, {
  name: 'stack-guard',
  command: judgeInstall,
  write: (w) => (w.after === null ? null : basename(w.path) === 'package.json' ? judgeManifest(w.before, w.after) : CODE.has(extname(w.path)) ? judgeCode(w.before, w.after) : null),
}, ctx);

/** An install command and a write are judged in a worktree as in the main checkout. */
export const worktreeCase: WorktreeCase = {
  steps: [
    { label: 'express added to a package.json of the worktree', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/api/package.json', content: '{"dependencies":{"express":"5.1.0"}}\n' } }, want: 2 },
    { label: 'an import of vite in the worktree', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/api/src/build.ts', content: "import { build } from 'vite';\n" } }, want: 2 },
    { label: 'fastify in the worktree', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/api/src/server.ts', content: "import Fastify from 'fastify';\n" } }, want: 0 },
    { label: 'npm install express after a cd into the worktree', event: { tool_name: 'Bash', tool_input: { command: 'cd {wt} && npm install express' } }, want: 2 },
  ],
};

export function selftest(): number {
  const hookFile = fileURLToPath(import.meta.url);
  const pkg = (deps: Record<string, string>): string => JSON.stringify({ name: 'x', dependencies: deps }, null, 2);
  const dir = scratchProject({ 'api/package.json': pkg({ fastify: '5.6.1' }), 'api/src/old.ts': "import express from 'express';\n" });
  const before = snapshot(dir);   // the project as the judge finds it: the rows below must leave it as it is
  const w = (rel: string, text: string): number | null => runHook(hookFile, dir, writeOf(join(dir, rel), text)).status;
  const sh = (cmd: string): number | null => runHook(hookFile, dir, bashOf(cmd, dir)).status;
  return verdicts('stack-guard', [
    ['express added to package.json', w('api/package.json', pkg({ fastify: '5.6.1', express: '5.1.0' })), 2],
    ['vite added as a dev dependency', w('api/package.json', JSON.stringify({ devDependencies: { vite: '7.1.0' } })), 2],
    ['zod 3 pinned', w('api/package.json', pkg({ fastify: '5.6.1', zod: '^3.23.8' })), 2],
    ['zod 4 and fastify plugins', w('api/package.json', pkg({ fastify: '5.6.1', zod: '4.1.12', '@fastify/helmet': '13.0.2' })), 0],
    ['an import of express added', w('api/src/server.ts', "import express from 'express';\n"), 2],
    ['a require of vite', w('tools/build.cjs', "const { build } = require('vite');\n"), 2],
    ['an import of @vitejs/plugin-react', w('channel/vite.config.ts', "import react from '@vitejs/plugin-react';\n"), 2],
    ['a file that already had the import keeps it', w('api/src/old.ts', "import express from 'express';\nexport const x = 1;\n"), 0],
    ['fastify imported', w('api/src/server.ts', "import Fastify from 'fastify';\n"), 0],
    ['a doc that names express', w('docs/why.md', 'We never use express.\n'), 0],
    ['npm install express', sh('npm install express'), 2],
    ['pnpm add -D vite@7', sh('pnpm add -D vite@7'), 2],
    ['npm i zod@3', sh('npm i zod@3.23.8'), 2],
    ['npm i zod@4 fastify', sh('npm i zod@4.1.12 fastify'), 0],
    ['a judge writes no file (the write trap)', writtenSince(dir, before).join(','), ''],
  ]);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'stack-guard', hook, selftest);
