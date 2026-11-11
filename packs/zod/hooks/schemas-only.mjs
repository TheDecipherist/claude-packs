#!/usr/bin/env node
// schemas-only (PreToolUse, Write|Edit|MultiEdit|NotebookEdit|Bash): a Zod schema is written once, in the schemas folder
// (STEP 3 item 4: "Zod v4 schemas only under schemas/"). Routes, handlers, adapters and the web app import the shape
// from there (and infer its type with z.infer), so a request, a record and a form never drift apart.
// Refused, by every write route (lib/writes.mjs): a write that ADDS a `z.object(` (or `z.strictObject(` / `z.looseObject(`)
// to a JS or TS file outside the layout's "schemas" concept (default: any schemas/ folder). env.ts is the one other place a
// shape lives (the environment's names and types); it is let through. Another project's files are not judged.
//   node schemas-only.mjs --selftest
import { basename, extname, join } from 'node:path';
import { judgeEvent } from './lib/writes.mjs';
import { matchesAny } from './lib/glob.mjs';
import { conceptGlobs, readLayout } from './lib/layout.mjs';
import { blankCode } from './lib/cpp-scan.mjs';
import { claudeRoot } from './lib/project.mjs';
import { runHook, scratchProject, verdicts, writeOf } from './lib/selftest.mjs';
import { asHook, isMain, projectRoot } from './lib/hook-log.mjs';
import { fileURLToPath } from 'node:url';


const CODE = new Set(['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts', '.tsx', '.jsx']);
const SCHEMA = /\bz\.(?:object|strictObject|looseObject)\s*\(/g;
const count = (t) => (blankCode(t ?? '').match(SCHEMA) ?? []).length;

export function verdict(rel, before, after, globs) {
  if (!CODE.has(extname(rel)) || after === null || /^env\.[cm]?[jt]s$/.test(basename(rel))) return null;
  if (matchesAny(rel, globs) || count(after) <= count(before)) return null;
  return `BLOCKED by schemas-only: ${rel} gains a Zod schema (z.object) outside the schemas folder (${globs.join(', ')}).\n` +
    'Write the schema once in the schemas folder (packages/core/src/schemas), export it, and import it here; take its type with z.infer.\n';
}

const main = (text) => judgeEvent(text, {
  name: 'schemas-only',
  write: (w, rel) => verdict(rel, w.before, w.after, conceptGlobs(readLayout(claudeRoot(projectRoot(), w.path, process.cwd())), 'schemas') ?? ['**/schemas/**']),
}, process);

function selftest() {
  const hook = fileURLToPath(import.meta.url);
  const layout = { folders: { schemas: { path: 'packages/core/src/schemas', purpose: 'schemas' } }, concepts: { schemas: ['schemas'] } };
  const dir = scratchProject({ 'api/src/routes/old.ts': 'const Q = z.object({ id: z.string() });\n' }, layout);
  const w = (rel, text) => runHook(hook, dir, writeOf(join(dir, rel), text)).status;
  const cases = [
    ['a schema in the schemas folder', w('packages/core/src/schemas/user.ts', 'export const User = z.object({ id: z.string() });\n'), 0],
    ['a schema in a route', w('api/src/routes/user.ts', 'const Body = z.object({ name: z.string() });\n'), 2],
    ['a strictObject in a handler', w('api/src/handlers/user.ts', 'const B = z.strictObject({});\n'), 2],
    ['a schema in the web app', w('channel/app/form.tsx', 'const F = z.object({});\n'), 2],
    ['the route imports the schema', w('api/src/routes/user.ts', "import { User } from '@core/schemas/user';\n"), 0],
    ['env.ts shapes the environment', w('api/src/env.ts', 'export const Env = z.object({ PORT: z.coerce.number() });\n'), 0],
    ['a file that already had one keeps it', w('api/src/routes/old.ts', 'const Q = z.object({ id: z.string() });\nexport { Q };\n'), 0],
    ['a comment that shows z.object is not a schema', w('api/src/routes/c.ts', '// never z.object( here\n'), 0],
  ];
  return verdicts('schemas-only', cases);
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? selftest() : await asHook('schemas-only', main));
