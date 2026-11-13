// resident/selftest-plants: the planted hooks and the table of the daemon's selftest. A plant is the source of one hook module; its
// row names the tool its events carry (`tool_name`), so one daemon serves every case and each case fires only its own hooks.
import type { HookEventName, HookTableRow } from '../lib/types.d.mts';

export interface Plant { name: string; source: string; row: Omit<HookTableRow, 'hook'> }

const HEAD = [
  "import { appendFileSync, writeFileSync } from 'node:fs';",
  "import { join } from 'node:path';",
  'const nap = (ms) => new Promise((done) => setTimeout(done, ms));',
  "const pass = { code: 0, stdout: '', stderr: '' };",
  "const no = (why) => ({ code: 2, stdout: '', stderr: why + '\\n' });",
  'const note = (ctx, file, text) => appendFileSync(join(ctx.projectDir, file), text);',
  '',
].join('\n');
const source = (body: string): string => `${HEAD}export async function hook(event, ctx) {\n${body}\n}\n`;

const judge = (tool: string, order = 50, events: readonly HookEventName[] = ['PreToolUse']): Omit<HookTableRow, 'hook'> => ({ events, matcher: tool, role: 'judge', order });
const recorder = (tool: string, order: number, events: readonly HookEventName[] = ['PreToolUse']): Omit<HookTableRow, 'hook'> => ({ events, matcher: tool, role: 'recorder', order });

/** The message the lock-change case plants: the hook says `v1`, and after the lock changes it says `v2`. */
export const MSG = (version: string): string => source(`return { code: 0, stdout: '{"systemMessage":"MSG ${version}"}', stderr: '' };`);

export const PLANTS: readonly Plant[] = [
  { name: 'throws', source: source("throw new Error('planted throw');"), row: judge('Throw') },
  { name: 'msg', source: MSG('v1'), row: judge('Msg') },
  { name: 'hold', source: source('await nap(event.tool_input?.ms ?? 0);\nreturn pass;'), row: judge('Hold') },
  { name: 'quick', source: source('return pass;'), row: judge('Fast|Over', 10) },
  { name: 'rec-fast', source: source('return pass;'), row: recorder('Fast', 90) },
  { name: 'nap-a', source: source('await nap(100);\nreturn pass;'), row: judge('Par', 10) },
  { name: 'nap-b', source: source('await nap(100);\nreturn pass;'), row: judge('Par', 20) },
  { name: 'ref-slow', source: source("await nap(20);\nreturn no('REFUSED by ref-slow');"), row: judge('Ref', 10) },
  { name: 'ref-fast', source: source("await nap(5);\nreturn no('REFUSED by ref-fast');"), row: judge('Ref', 20) },
  { name: 'rec-ref', source: source("note(ctx, 'rec.txt', 'rec-ref\\n');\nreturn pass;"), row: recorder('Ref', 50) },
  { name: 'ser-a', source: source("await nap(30);\nnote(ctx, 'ser.txt', 'a');\nreturn pass;"), row: recorder('Ser', 10) },
  { name: 'ser-b', source: source("note(ctx, 'ser.txt', 'b');\nreturn pass;"), row: recorder('Ser', 20) },
  { name: 'exits', source: source('process.exit(0);\nreturn pass;'), row: judge('Exit') },
  { name: 'rejects', source: source("Promise.reject(new Error('rejected after return'));\nreturn pass;"), row: judge('Reject') },
  { name: 'secrets-guard', source: source("await nap(1500);\nreturn no('LATE refusal from secrets-guard');"), row: judge('Over', 10) },
  { name: 'kill-judge', source: source("await nap(800);\nreturn no('judged by the TypeScript runner');"), row: judge('Kill') },
  { name: 'rm-judge', source: source("return no('rm refused');"), row: judge('Race') },
  { name: 'post-judge', source: source("return no('post refused');"), row: judge('PostRef', 10, ['PostToolUse']) },
  { name: 'rec-post', source: source("note(ctx, 'post.txt', 'rec-post\\n');\nreturn pass;"), row: recorder('PostRef', 20, ['PostToolUse']) },
  { name: 'rec-post-slow', source: source("await nap(300);\nnote(ctx, 'postslow.txt', 'rec-post-slow\\n');\nreturn pass;"), row: recorder('PostSlow', 20, ['PostToolUse']) },
];

/** A judge that writes a file: the table check of a judge (parallel, writes nothing) finds it. Not in the daemon's table. */
export const WRITER: Plant = { name: 'writer', source: source("writeFileSync(join(ctx.projectDir, 'judge-wrote.txt'), 'x');\nreturn pass;"), row: judge('Writes') };

/** A hook that asks the index (`ctx.candidates`) which files hold the statements of the text in the event, and says their names. */
export const asks = (near: string): Plant => ({
  name: 'asks',
  source: [
    `import { fingerprint } from '${near}';`,
    'export async function hook(event, ctx) {',
    "  const hashes = fingerprint(event.tool_input.content, '.ts').map(([h]) => h);",
    '  const files = await ctx.candidates(hashes);',
    "  return { code: 0, stdout: '', stderr: 'FILES ' + files.map((f) => f.file).sort().join(',') + '\\n' };",
    '}',
    '',
  ].join('\n'),
  row: judge('Ask'),
});

/** A hook of another project: if the daemon imported or ran it, it would leave its mark. */
export const INTRUDER = [
  "import { writeFileSync } from 'node:fs';",
  "writeFileSync(new URL('./intruder-ran', import.meta.url), 'ran');",
  "export function hook() { return { code: 2, stdout: '', stderr: 'INTRUDER judged\\n' }; }",
  '',
].join('\n');
