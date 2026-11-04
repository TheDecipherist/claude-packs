#!/usr/bin/env node
// UserPromptSubmit: repetition is cheapest to stop before a line is drafted. When a prompt's words name something the repo already has, what exists
// goes in front of the prompt, so it is called and never written again. Only real matches, six at most; a prompt that matches nothing adds nothing.
// `--selftest` proves it.
import { TESTS, skippedBy } from './lib/elements.mjs';
import { readLayout } from './lib/layout.mjs';
import { checkoutRoot, claudeRoot } from './lib/project.mjs';
import { repoIndex } from './lib/repo-index.mjs';
import { scratchProject, verdicts } from './lib/selftest.mjs';
import { asHook, isMain } from './lib/hook-log.mjs';

const SHOWN = 6;
const COMMON = new Set(`this that with from have make need want when what where which their there then them they will would should could into only also more
  some just like been were does each every code file files function method class value data line test tests work works using used change update write read
  please thing things sure right added adding`.split(/\s+/));

const stem = (w) => w.toLowerCase().replace(/(?:ing|ers|er|es|ed|s)$/, '');
const piecesOf = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[\s_-]+/).filter((w) => w.length >= 3).map(stem);
const wordsOf = (prompt) => new Set((prompt.match(/[A-Za-z]{4,}/g) ?? []).filter((w) => !COMMON.has(w.toLowerCase())).map(stem));

// A compound name, with at least two of its pieces in the prompt. One word in common says nothing.
export function matches(prompt, index) {
  const words = wordsOf(prompt);
  const out = [];
  for (const [file, e] of Object.entries(index)) {
    for (const [name, line] of e.defs ?? []) {
      const pieces = piecesOf(name);
      const hits = pieces.filter((p) => words.has(p)).length;
      if (pieces.length >= 2 && hits >= 2) out.push({ name, at: `${file}:${line}`, score: hits / pieces.length });
    }
  }
  return out.sort((a, b) => b.score - a.score).slice(0, SHOWN);
}

function main(text) {
  const event = JSON.parse(text || '{}');
  const at = `${event.cwd ?? process.cwd()}/x`;
  const found = matches(event.prompt ?? '', repoIndex(checkoutRoot(at), [...TESTS, ...skippedBy(readLayout(claudeRoot(at)))]));
  if (found.length) console.log(`Already in this repo, call it rather than write it again:\n${found.map((f) => `- ${f.name} (${f.at})`).join('\n')}`);
  return 0;
}

function selftest() {
  const dir = scratchProject({ 'src/dates.ts': 'export function formatDateRange(a, b) { return a + b; }\n', 'src/a.py': 'def parse_price_table(text):\n    return text\n', 'src/one.ts': 'export function render(a) { return a; }\n' });
  const index = repoIndex(dir, []);
  const named = (prompt) => matches(prompt, index).map((m) => m.name).join();
  return verdicts('reuse-hint', [
    ['a prompt naming what exists, camelCase', named('add a page that will format the date range of a booking'), 'formatDateRange'],
    ['a prompt naming what exists, snake_case', named('parse the price table from the upload'), 'parse_price_table'],
    ['it says where', matches('format the date range', index)[0]?.at, 'src/dates.ts:1'],
    ['one word in common says nothing', named('the date of the last deploy'), ''],
    ['a one-word name is never matched', named('render the render view'), ''],
    ['an empty prompt', named(''), ''],
    ['a prompt about nothing here', named('rename the settings page title'), ''],
  ]);
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? selftest() : await asHook('reuse-hint', main));
