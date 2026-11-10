#!/usr/bin/env node
// Check a project's ledger of source material against the folders that hold it. Every file is on the ledger, every row
// that is ticked names evidence that exists, and no converted PDF still has an image only marked by a placeholder.
//   node .claude/tools/source-ledger.mjs <ledger.md> <sources folder> [<sources folder> ...]
// The ledger is a Markdown table whose rows start `| [x] |` or `| [ ] |`, then the file's path, then what it is, then the
// evidence: reports, separated by commas, as paths relative to the ledger's folder. Exit 0: every file listed and every
// row ticked with real evidence. Exit 1: what is still to do, listed. Exit 2: the command was used wrongly.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SKIPPED = /(^|\/)(\.git|node_modules|tiles|zoom|pages)(\/|$)|\.DS_Store$|Thumbs\.db$/;
const PLACEHOLDER = '<!-- image -->';

export function rowsOf(text) {
  const rows = [];
  for (const line of text.split('\n')) {
    const cells = line.split('|').map((cell) => cell.trim());
    const tick = /^\[( |x|X)\]$/.exec(cells[1] ?? '');
    if (!tick) continue;
    const evidence = (cells[4] ?? '').split(',').map((item) => item.replace(/`/g, '').trim()).filter(Boolean);
    rows.push({ done: tick[1].toLowerCase() === 'x', path: (cells[2] ?? '').replace(/`/g, ''), evidence });
  }
  return rows;
}

/** Every file on hand in a sources folder, by node's own recursive listing, without what tools make beside it. */
const onHand = (folder) =>
  readdirSync(folder, { recursive: true })
    .filter((rel) => !SKIPPED.test(rel))
    .map((rel) => join(folder, rel))
    .filter((full) => statSync(full).isFile());

/** What is still to do: files not on the ledger, rows not ticked, ticks without evidence, PDFs read without their images. */
export function audit(ledgerPath, folders) {
  const base = dirname(resolve(ledgerPath));
  const rows = rowsOf(readFileSync(ledgerPath, 'utf8'));
  const listed = new Set(rows.map((row) => resolve(base, row.path)));
  const todo = [];
  for (const folder of folders)
    for (const file of onHand(resolve(folder)))
      if (!listed.has(file) && !(extname(file) === '.md' && existsSync(file.replace(/\.md$/i, '.pdf'))))
        todo.push(`not on the ledger: ${relative(base, file)}`);
  for (const row of rows) {
    const file = resolve(base, row.path);
    if (!existsSync(file)) todo.push(`listed but missing: ${row.path}`);
    if (!row.done) todo.push(`not done: ${row.path}`);
    if (row.done && row.evidence.length === 0) todo.push(`ticked with no evidence: ${row.path}`);
    for (const item of row.done ? row.evidence : [])
      if (!existsSync(resolve(base, item))) todo.push(`evidence missing for ${row.path}: ${item}`);
    const markdown = file.replace(/\.pdf$/i, '.md');
    if (extname(file).toLowerCase() === '.pdf' && existsSync(markdown)) {
      const unread = readFileSync(markdown, 'utf8').split(PLACEHOLDER).length - 1;
      if (unread > 0) todo.push(`${unread} images only marked in ${basename(markdown)}: export them (pdf-to-md)`);
    }
  }
  return todo;
}

function main(args) {
  if (args.length < 2) {
    console.error('usage: node .claude/tools/source-ledger.mjs <ledger.md> <sources folder> [...]');
    return 2;
  }
  const todo = audit(args[0], args.slice(1));
  if (todo.length === 0) {
    console.log('source ledger: every file listed, every row done with evidence');
    return 0;
  }
  console.log(`source ledger: ${todo.length} still to do`);
  for (const item of todo) console.log(`  ${item}`);
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(main(process.argv.slice(2)));
