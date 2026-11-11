// schemas-only (PreToolUse, Write|Edit|MultiEdit|NotebookEdit|Bash): a Zod schema is written once, in the schemas folder
// (STEP 3 item 4: "Zod v4 schemas only under schemas/"). Routes, handlers, adapters and the web app import the shape
// from there (and infer its type with z.infer), so a request, a record and a form never drift apart.
// Refused, by every write route (lib/writes.mjs): a write that ADDS a `z.object(` (or `z.strictObject(` / `z.looseObject(`)
// to a JS or TS file outside the layout's "schemas" concept (default: any schemas/ folder). env.ts is the one other place a
// shape lives (the environment's names and types); it is let through. Another project's files are not judged.
//   node schemas-only.mjs --selftest
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { blankCode } from './lib/cpp-scan.mts';
import { matchesAny } from './lib/glob.mts';
import { isMain, runAsHook } from './lib/hook-log.mts';
import { conceptGlobs, readLayout } from './lib/layout.mts';
import { claudeRoot } from './lib/project.mts';
import { runHook, scratchProject, snapshot, verdicts, writeOf, writtenSince } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { Hook } from './lib/types.d.mts';
import { judgeVerdict } from './lib/writes.mts';

const CODE: ReadonlySet<string> = new Set(['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts', '.tsx', '.jsx']);
const SCHEMA = /\bz\.(?:object|strictObject|looseObject)\s*\(/g;
const count = (t: string | null): number => (blankCode(t ?? '').match(SCHEMA) ?? []).length;

/** The refusal for a write to `rel` that adds a schema outside `globs`, or null. */
export function verdict(rel: string, before: string | null, after: string | null, globs: readonly string[]): string | null {
  if (!CODE.has(extname(rel)) || after === null || /^env\.[cm]?[jt]s$/.test(basename(rel))) return null;
  if (matchesAny(rel, globs) || count(after) <= count(before)) return null;
  return `BLOCKED by schemas-only: ${rel} gains a Zod schema (z.object) outside the schemas folder (${globs.join(', ')}).\n` +
    'Write the schema once in the schemas folder (packages/core/src/schemas), export it, and import it here; take its type with z.infer.\n';
}

export const hook: Hook = (event, ctx) => judgeVerdict(event, {
  name: 'schemas-only',
  write: (w, rel) => verdict(rel, w.before, w.after, conceptGlobs(readLayout(claudeRoot(ctx.projectDir, w.path, ctx.cwd)), 'schemas') ?? ['**/schemas/**']),
}, ctx);

/** A schema is judged against the worktree's own layout and folders too: one written in a route there is refused. */
export const worktreeCase: WorktreeCase = {
  steps: [
    { label: 'a schema in a route of the worktree', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/api/src/routes/user.ts', content: 'const B = z.object({ id: z.string() });\n' } }, want: 2 },
    { label: 'a schema in a schemas folder of the worktree', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/packages/core/src/schemas/user.ts', content: 'export const U = z.object({ id: z.string() });\n' } }, want: 0 },
  ],
};

export function selftest(): number {
  const hookFile = fileURLToPath(import.meta.url);
  const layout = { folders: { schemas: { path: 'packages/core/src/schemas', purpose: 'schemas' } }, concepts: { schemas: ['schemas'] } };
  const dir = scratchProject({ 'api/src/routes/old.ts': 'const Q = z.object({ id: z.string() });\n' }, layout);
  const before = snapshot(dir);   // the project as the judge finds it: the rows below must leave it as it is
  const w = (rel: string, text: string): number | null => runHook(hookFile, dir, writeOf(join(dir, rel), text)).status;
  return verdicts('schemas-only', [
    ['a schema in the schemas folder', w('packages/core/src/schemas/user.ts', 'export const User = z.object({ id: z.string() });\n'), 0],
    ['a schema in a route', w('api/src/routes/user.ts', 'const Body = z.object({ name: z.string() });\n'), 2],
    ['a strictObject in a handler', w('api/src/handlers/user.ts', 'const B = z.strictObject({});\n'), 2],
    ['a schema in the web app', w('channel/app/form.tsx', 'const F = z.object({});\n'), 2],
    ['the route imports the schema', w('api/src/routes/user.ts', "import { User } from '@core/schemas/user';\n"), 0],
    ['env.ts shapes the environment', w('api/src/env.ts', 'export const Env = z.object({ PORT: z.coerce.number() });\n'), 0],
    ['a file that already had one keeps it', w('api/src/routes/old.ts', 'const Q = z.object({ id: z.string() });\nexport { Q };\n'), 0],
    ['a comment that shows z.object is not a schema', w('api/src/routes/c.ts', '// never z.object( here\n'), 0],
    ['a judge writes no file (the write trap)', writtenSince(dir, before).join(','), ''],
  ]);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'schemas-only', hook, selftest);
