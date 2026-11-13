// Check a project's ledger of source material against the folders that hold it. Every file is on the ledger, every row
// that is ticked names evidence that exists, and no converted PDF still has an image only marked by a placeholder.
//   node .claude/tools/source-ledger.mjs <ledger.md> <sources folder> [<sources folder> ...]
//   node .claude/tools/source-ledger.mjs --hash <sources folder> [...]   the hash pass: every file's sha256, and the files that are one image under two names (exit 1 when there are any)
// The ledger is a Markdown table whose rows start `| [x] |` or `| [ ] |`, then the file's path, then what it is, then the
// evidence: reports, separated by commas, as paths relative to the ledger's folder. Exit 0: every file listed and every
// row ticked with real evidence. Exit 1: what is still to do, listed. Exit 2: the command was used wrongly.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { isMain } from '../hooks/lib/hook-log.mts';

const SKIPPED = /(^|\/)(\.git|node_modules|tiles|zoom|pages)(\/|$)|\.DS_Store$|Thumbs\.db$/;
const PLACEHOLDER = '<!-- image -->';

/** One ledger row: ticked or not, the file's path, and the evidence it names. */
export interface LedgerRow { done: boolean; path: string; evidence: string[] }

export function rowsOf(text: string): LedgerRow[] {
  const rows: LedgerRow[] = [];
  for (const line of text.split('\n')) {
    const cells = line.split('|').map((cell) => cell.trim());
    const tick = /^\[( |x|X)\]$/.exec(cells[1] ?? '');
    if (!tick) continue;
    const evidence = (cells[4] ?? '').split(',').map((item) => item.replace(/`/g, '').trim()).filter(Boolean);
    rows.push({ done: (tick[1] ?? '').toLowerCase() === 'x', path: (cells[2] ?? '').replace(/`/g, ''), evidence });
  }
  return rows;
}

/** Every file on hand in a sources folder, by node's own recursive listing, without what tools make beside it. */
const onHand = (folder: string): string[] =>
  readdirSync(folder, { recursive: true, encoding: 'utf8' })
    .filter((rel) => !SKIPPED.test(rel))
    .map((rel) => join(folder, rel))
    .filter((full) => statSync(full).isFile());

/** What is still to do: files not on the ledger, rows not ticked, ticks without evidence, PDFs read without their images. */
export function audit(ledgerPath: string, folders: readonly string[]): string[] {
  const base = dirname(resolve(ledgerPath));
  const rows = rowsOf(readFileSync(ledgerPath, 'utf8'));
  const listed = new Set(rows.map((row) => resolve(base, row.path)));
  const todo: string[] = [];
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

/** Files with identical bytes, grouped by their sha256: one image under several names, or a sibling's dump filed under another model. */
export function duplicateGroups(folders: readonly string[]): { hash: string; files: string[] }[] {
  const byHash = new Map<string, string[]>();
  for (const folder of folders)
    for (const file of onHand(resolve(folder))) {
      const hash = createHash('sha256').update(readFileSync(file)).digest('hex');
      byHash.set(hash, [...(byHash.get(hash) ?? []), file]);
    }
  return [...byHash].filter(([, files]) => files.length > 1).map(([hash, files]) => ({ hash, files }));
}

function hashPass(folders: readonly string[]): number {
  const groups = duplicateGroups(folders);
  if (groups.length === 0) { console.log('hash pass: no two files have the same bytes'); return 0; }
  console.log(`hash pass: ${groups.length} groups of identical files; write the inheritance down with the hashes`);
  for (const g of groups) console.log(`  ${g.hash.slice(0, 16)}: ${g.files.join(' = ')}`);
  return 1;
}

function main(args: readonly string[]): number {
  if (args[0] === '--hash') return args.length > 1 ? hashPass(args.slice(1)) : 2;
  const [ledger, ...folders] = args;
  if (ledger === undefined || folders.length === 0) {
    console.error('usage: node .claude/tools/source-ledger.mjs <ledger.md> <sources folder> [...]');
    return 2;
  }
  const todo = audit(ledger, folders);
  if (todo.length === 0) {
    console.log('source ledger: every file listed, every row done with evidence');
    return 0;
  }
  console.log(`source ledger: ${todo.length} still to do`);
  for (const item of todo) console.log(`  ${item}`);
  return 1;
}

if (isMain(import.meta.url)) process.exit(main(process.argv.slice(2)));
