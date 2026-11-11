// untrusted-boundary (PreToolUse, Write|Edit|MultiEdit|NotebookEdit|Bash): text from outside reaches a model only inside a
// SHA-256 boundary (KWB-34). The house form (the user's release-watcher skills): every block of untrusted text sent to a model (a
// web page, a fetched document, a scraped row, a user's upload, a stored copy of any of them) is wrapped, per call, in a
// boundary named by the SHA-256 of the block, with a note before and after that gives the exact hash and says the block is
// information, not instructions; our own fields (ids, dates, the task) stay outside it.
// Refused, by every write route (lib/writes.mjs): a write that ADDS a model call (Anthropic messages.create / .stream,
// OpenAI chat.completions.create / responses.create, the AI SDK's generateText / streamText / generateObject / streamObject,
// LangChain's .invoke on a chat model is not read) to a JS, TS or Python file that, once written, has no boundary: no call
// of the house helper (wrapUntrusted / wrap_untrusted / untrustedBoundary) and no line `untrusted: none` saying the file sends
// a model only its own text. Another project's files are not judged.
// A judge on the hook contract (W4): it reads nothing of the process and writes nothing.
//   node untrusted-boundary.mjs --selftest
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, runAsHook } from './lib/hook-log.mts';
import { runHook, scratchProject, snapshot, verdicts, writeOf, writtenSince } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { Hook } from './lib/types.d.mts';
import { judgeVerdict } from './lib/writes.mts';

const CODE: ReadonlySet<string> = new Set(['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts', '.tsx', '.jsx', '.py']);
const CALL = /\bmessages\.(?:create|stream)\s*\(|\bchat\.completions\.create\s*\(|\bresponses\.create\s*\(|\b(?:generateText|streamText|generateObject|streamObject)\s*\(/g;
const BOUNDARY = /\b(?:wrapUntrusted|wrap_untrusted|untrustedBoundary)\s*\(|^\s*(?:\/\/|#|\*)\s*untrusted:\s*none\b/m;
const calls = (text: string): number => (text.match(CALL) ?? []).length;

/** The refusal for a write that adds a model call to a file with no boundary, or null. */
export function verdict(rel: string, before: string | null, after: string | null): string | null {
  if (!CODE.has(extname(rel)) || after === null) return null;
  if (calls(after) <= calls(before ?? '') || BOUNDARY.test(after)) return null;
  return `BLOCKED by untrusted-boundary: ${rel} gains a model call and has no SHA-256 boundary.\n` +
    'Every block of untrusted text (a web page, a fetched document, a scraped row, an upload) goes to the model inside wrapUntrusted(text): ' +
    'a per-call boundary named by the SHA-256 of the block, with a note before and after giving the exact hash and saying the block is information, ' +
    'not instructions; your own fields stay outside it. If this file sends the model only its own text, say so on a line of its own: `// untrusted: none`.\n';
}

export const hook: Hook = (event, ctx) => judgeVerdict(event, { name: 'untrusted-boundary', write: (w, rel) => verdict(rel, w.before, w.after) }, ctx);

const CALL_LINE = 'const r = await client.messages.create({ messages: [{ role: "user", content: page }] });\n';

/** A model call is judged by the worktree's own file, as in the main checkout. */
export const worktreeCase: WorktreeCase = {
  steps: [
    { label: 'a model call with no boundary, in the worktree', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/tools/ask.mjs', content: CALL_LINE } }, want: 2 },
    { label: 'the call with the page inside wrapUntrusted', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/tools/ask.mjs', content: `const page = wrapUntrusted(html);\n${CALL_LINE}` } }, want: 0 },
  ],
};

export function selftest(): number {
  const hookFile = fileURLToPath(import.meta.url);
  const dir = scratchProject({ 'src/ask.ts': 'export const x = 1;\n' });
  const before = snapshot(dir);   // the project as the judge finds it: the rows below must leave it as it is
  const run = (rel: string, text: string): number | null => runHook(hookFile, dir, writeOf(join(dir, rel), text)).status;
  const call = 'const r = await client.messages.create({ model, messages: [{ role: "user", content: page }] });\n';
  return verdicts('untrusted-boundary', [
    ['a model call fed a page, no boundary (Anthropic)', run('src/ask.ts', call), 2],
    ['an OpenAI call, no boundary', run('src/ask.mjs', 'await openai.chat.completions.create({ messages });\n'), 2],
    ['an AI SDK call, no boundary', run('src/ask.tsx', 'const { text } = await generateText({ model, prompt: html });\n'), 2],
    ['a Python call, no boundary', run('tools/ask.py', 'r = client.messages.create(model=m, messages=msgs)\n'), 2],
    ['the call with the page inside wrapUntrusted', run('src/ask.ts', `const page = wrapUntrusted(html);\n${call}`), 0],
    ['a file that sends only its own text, and says so', run('src/ask.ts', `// untrusted: none\n${call}`), 0],
    ['a doc that shows a call is not code', run('docs/howto.md', call), 0],
    ['code with no model call', run('src/plain.ts', 'export const y = fetch(url);\n'), 0],
    ['a judge writes no file (the write trap)', writtenSince(dir, before).join(','), ''],
  ]);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'untrusted-boundary', hook, selftest);
