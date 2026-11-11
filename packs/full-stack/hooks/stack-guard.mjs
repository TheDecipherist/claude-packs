#!/usr/bin/env node
// stack-guard (PreToolUse, Write|Edit|MultiEdit|NotebookEdit|Bash): the full-stack configuration's stack is Fastify and
// Next.js, and Zod 4 (STEP 3 item 4). Refused, by every write route (lib/writes.mjs) and on an install command:
//   - express or vite added to a package.json (dependencies of any kind) or installed (`npm i`, `pnpm add`, `yarn add`, `bun add`);
//   - an import or require of express or vite (or one of their subpaths, @vitejs/*) added to a JS or TS file;
//   - zod pinned below 4 in a package.json, or installed as zod@3.
// The API is Fastify (routes, inject() tests, its own plugins: @fastify/helmet, @fastify/rate-limit); the web app is Next.js,
// which builds itself. Another project's files are not judged.
//   node stack-guard.mjs --selftest
import { basename, extname, join } from 'node:path';
import { judgeEvent } from './lib/writes.mjs';
import { bashOf, runHook, scratchProject, verdicts, writeOf } from './lib/selftest.mjs';
import { asHook, isMain } from './lib/hook-log.mjs';
import { fileURLToPath } from 'node:url';

const BANNED = /^(express|vite|@vitejs\/.+)$/;
const CODE = new Set(['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts', '.tsx', '.jsx']);
const IMPORT = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)['"]((?:@vitejs\/[\w.-]+|express|vite)(?:\/[\w./-]*)?)['"]/gm;
const WHY = 'The full-stack configuration builds on Fastify (the API: routes, handlers, inject() tests, @fastify/helmet and @fastify/rate-limit) and Next.js (the web app, which builds itself). Use those; express and vite are not part of this stack.';

function depsOf(text) {
  try {
    const j = JSON.parse(text || '{}');
    return Object.assign({}, j.dependencies, j.devDependencies, j.peerDependencies, j.optionalDependencies);
  } catch { return null; }
}
const zodBelow4 = (spec) => typeof spec === 'string' && /^[\^~>=<\s]*[0-3](\.|$)/.test(spec.trim());

export function judgeManifest(before, after) {
  const was = depsOf(before) ?? {}, now = depsOf(after);
  if (!now) return null;
  const added = Object.keys(now).filter((d) => BANNED.test(d) && !(d in was));
  if (added.length) return `package.json gains ${added.join(', ')}. ${WHY}`;
  if (zodBelow4(now.zod) && now.zod !== was.zod) return `package.json pins zod ${now.zod}. Schemas are Zod 4 (import { z } from 'zod', version 4 or later); take the latest 4.x.`;
  return null;
}

export function judgeCode(before, after) {
  const names = (t) => [...(t ?? '').matchAll(IMPORT)].map((m) => m[1]);
  const had = names(before);
  const added = names(after).filter((n) => !had.includes(n));
  return added.length ? `this file gains an import of ${added[0]}. ${WHY}` : null;
}

export function judgeInstall(command) {
  for (const part of command.replace(/<<-?\s*['"]?(\w+)['"]?[\s\S]*?\n\1\b/g, '').split(/&&|\|\||;|\|/)) {
    const w = part.trim().split(/\s+/);
    const at = w.findIndex((x, i) => ['npm', 'pnpm', 'yarn', 'bun'].includes(w[i - 1]) && ['i', 'install', 'add'].includes(x));
    if (at < 0) continue;
    for (const a of w.slice(at + 1).filter((x) => !x.startsWith('-'))) {
      const name = a.replace(/(?!^)@[^/]*$/, '');
      if (BANNED.test(name)) return `\`${part.trim()}\` installs ${name}. ${WHY}`;
      if (name === 'zod' && /@[\^~]?[0-3](\.|$)/.test(a.slice(name.length))) return `\`${part.trim()}\` installs ${a}. Schemas are Zod 4: install zod@4 (the latest).`;
    }
  }
  return null;
}

const main = (text) => judgeEvent(text, {
  name: 'stack-guard',
  command: judgeInstall,
  write: (w) => (w.after === null ? null : basename(w.path) === 'package.json' ? judgeManifest(w.before, w.after) : CODE.has(extname(w.path)) ? judgeCode(w.before, w.after) : null),
}, process);

function selftest() {
  const hook = fileURLToPath(import.meta.url);
  const pkg = (deps) => JSON.stringify({ name: 'x', dependencies: deps }, null, 2);
  const dir = scratchProject({ 'api/package.json': pkg({ fastify: '5.6.1' }), 'api/src/old.ts': "import express from 'express';\n" });
  const w = (rel, text) => runHook(hook, dir, writeOf(join(dir, rel), text)).status;
  const sh = (cmd) => runHook(hook, dir, bashOf(cmd, dir)).status;
  const cases = [
    ['express added to package.json', w('api/package.json', pkg({ fastify: '5.6.1', express: '5.1.0' })), 2],
    ['vite added as a dev dependency', w('api/package.json', JSON.stringify({ devDependencies: { vite: '7.1.0' } })), 2],
    ['zod 3 pinned', w('api/package.json', pkg({ fastify: '5.6.1', zod: '^3.23.8' })), 2],
    ['zod 4 and fastify plugins', w('api/package.json', pkg({ fastify: '5.6.1', zod: '4.1.12', '@fastify/helmet': '13.0.2' })), 0],
    ['an import of express added', w('api/src/server.ts', "import express from 'express';\n"), 2],
    ['a require of vite', w('tools/build.cjs', "const { build } = require('vite');\n"), 2],
    ['an import of @vitejs/plugin-react', w('channel/vite.config.ts', "import react from '@vitejs/plugin-react';\n"), 2],
    ['a file that already had the import keeps it', w('api/src/old.ts', "import express from 'express';\nexport const x = 1;\n"), 0],
    ['fastify imported', w('api/src/server.ts', "import Fastify from 'fastify';\n"), 0],
    ['a doc that names express', w('docs/why.md', "We never use express.\n"), 0],
    ['npm install express', sh('npm install express'), 2],
    ['pnpm add -D vite@7', sh('pnpm add -D vite@7'), 2],
    ['npm i zod@3', sh('npm i zod@3.23.8'), 2],
    ['npm i zod@4 fastify', sh('npm i zod@4.1.12 fastify'), 0],
  ];
  return verdicts('stack-guard', cases);
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? selftest() : await asHook('stack-guard', main));
