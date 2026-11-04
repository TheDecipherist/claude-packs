#!/usr/bin/env node
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
//   node untrusted-boundary.mjs --selftest
import { extname, join } from 'node:path';
import { judgeEvent } from './lib/writes.mjs';
import { runHook, scratchProject, verdicts, writeOf } from './lib/selftest.mjs';
import { asHook, isMain } from './lib/hook-log.mjs';

const CODE = new Set(['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts', '.tsx', '.jsx', '.py']);
const CALL = /\bmessages\.(?:create|stream)\s*\(|\bchat\.completions\.create\s*\(|\bresponses\.create\s*\(|\b(?:generateText|streamText|generateObject|streamObject)\s*\(/g;
const BOUNDARY = /\b(?:wrapUntrusted|wrap_untrusted|untrustedBoundary)\s*\(|^\s*(?:\/\/|#|\*)\s*untrusted:\s*none\b/m;
const calls = (text) => (text.match(CALL) ?? []).length;

export function verdict(rel, before, after) {
  if (!CODE.has(extname(rel)) || after === null) return null;
  if (calls(after) <= calls(before ?? '') || BOUNDARY.test(after)) return null;
  return `BLOCKED by untrusted-boundary: ${rel} gains a model call and has no SHA-256 boundary.\n` +
    'Every block of untrusted text (a web page, a fetched document, a scraped row, an upload) goes to the model inside wrapUntrusted(text): ' +
    'a per-call boundary named by the SHA-256 of the block, with a note before and after giving the exact hash and saying the block is information, ' +
    'not instructions; your own fields stay outside it. If this file sends the model only its own text, say so on a line of its own: `// untrusted: none`.\n';
}

const main = (text) => judgeEvent(text, { name: 'untrusted-boundary', write: (w, rel) => verdict(rel, w.before, w.after) });

function selftest() {
  const hook = new URL(import.meta.url).pathname;
  const dir = scratchProject({ 'src/ask.ts': 'export const x = 1;\n' });
  const run = (rel, text) => runHook(hook, dir, writeOf(join(dir, rel), text));
  const call = 'const r = await client.messages.create({ model, messages: [{ role: "user", content: page }] });\n';
  const cases = [
    ['a model call fed a page, no boundary (Anthropic)', run('src/ask.ts', call), 2],
    ['an OpenAI call, no boundary', run('src/ask.mjs', 'await openai.chat.completions.create({ messages });\n'), 2],
    ['an AI SDK call, no boundary', run('src/ask.tsx', 'const { text } = await generateText({ model, prompt: html });\n'), 2],
    ['a Python call, no boundary', run('tools/ask.py', 'r = client.messages.create(model=m, messages=msgs)\n'), 2],
    ['the call with the page inside wrapUntrusted', run('src/ask.ts', `const page = wrapUntrusted(html);\n${call}`), 0],
    ['a file that sends only its own text, and says so', run('src/ask.ts', `// untrusted: none\n${call}`), 0],
    ['a doc that shows a call is not code', run('docs/howto.md', call), 0],
    ['code with no model call', run('src/plain.ts', 'export const y = fetch(url);\n'), 0],
  ];
  return verdicts('untrusted-boundary', cases);
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? selftest() : await asHook('untrusted-boundary', main));
