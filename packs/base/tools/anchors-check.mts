// Check the anchors of documents: a `{#anchor}` defined twice in the document that owns it fails, and a reference
// resolves to an anchor that exists.
//   node .claude/tools/anchors-check.mjs <doc.md> [<doc.md> ...] [--project <name>=<folder> ...]
// An anchor is defined where a line ends in `{#id}`. A reference is `(#id)` in the same document, or `project:path.md#id`
// into another project, read from the folder `--project` names for it. A project whose folder is absent on this machine is
// a warning and exit 0 stays: its references cannot be judged here. Exit 0: no duplicate and every judged reference
// resolves. Exit 1: the failures, listed. Exit 2: the command was used wrongly.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMain } from '../hooks/lib/hook-log.mts';

const DEFINITION = /\{#([A-Za-z0-9_-]+)\}\s*$/;
const LOCAL_REF = /\]\(#([A-Za-z0-9_-]+)\)/g;
const CROSS_REF = /\b([A-Za-z0-9_-]+):([A-Za-z0-9_.-][A-Za-z0-9_./-]*\.md)#([A-Za-z0-9_-]+)/g;

/** The anchors a document defines, in order, with every one that repeats. */
export function anchorsOf(text: string): { all: string[]; duplicates: string[] } {
  const all = text.split('\n').flatMap((line) => DEFINITION.exec(line)?.[1] ?? []);
  return { all, duplicates: [...new Set(all.filter((id, at) => all.indexOf(id) !== at))] };
}

/** What is wrong, as failures, and what could not be judged here, as warnings. */
export interface AnchorVerdict { failures: string[]; warnings: string[] }

export function check(docs: readonly string[], projects: Readonly<Record<string, string>>): AnchorVerdict {
  const verdict: AnchorVerdict = { failures: [], warnings: [] };
  for (const doc of docs) {
    const text = readFileSync(doc, 'utf8');
    const { all, duplicates } = anchorsOf(text);
    for (const id of duplicates) verdict.failures.push(`${doc}: anchor {#${id}} is defined more than once`);
    // A document with no explicit {#id} uses heading slugs: its links are not this tool's to judge.
    for (const [, id] of all.length > 0 ? text.matchAll(LOCAL_REF) : []) if (id && !all.includes(id)) verdict.failures.push(`${doc}: (#${id}) has no anchor`);
    for (const [, project, path, id] of text.matchAll(CROSS_REF)) {
      const folder = project ? projects[project] : undefined;
      if (!project || !path || !id) continue;
      if (!folder || !existsSync(folder)) { verdict.warnings.push(`${doc}: ${project}:${path}#${id} not judged, project ${project} is not on this machine`); continue; }
      const target = join(folder, path);
      if (!existsSync(target)) verdict.failures.push(`${doc}: ${project}:${path} does not exist`);
      else if (!anchorsOf(readFileSync(target, 'utf8')).all.includes(id)) verdict.failures.push(`${doc}: ${project}:${path} has no anchor {#${id}}`);
    }
  }
  return verdict;
}

/** The command line: documents, and `--project name=folder` pairs. */
export function main(argv: readonly string[]): number {
  const docs: string[] = [];
  const projects: Record<string, string> = {};
  for (let at = 0; at < argv.length; at++) {
    const arg = argv[at] ?? '';
    if (arg !== '--project') { docs.push(arg); continue; }
    const [name, folder] = (argv[++at] ?? '').split('=');
    if (!name || !folder) { console.error('--project takes name=folder'); return 2; }
    projects[name] = folder;
  }
  if (docs.length === 0 || docs.some((doc) => !existsSync(doc))) { console.error('usage: anchors-check <doc.md>... [--project name=folder]'); return 2; }
  const verdict = check(docs, projects);
  for (const line of verdict.warnings) console.warn(`warning: ${line}`);
  for (const line of verdict.failures) console.error(line);
  return verdict.failures.length === 0 ? 0 : 1;
}

if (isMain(import.meta.url)) process.exit(main(process.argv.slice(2)));
