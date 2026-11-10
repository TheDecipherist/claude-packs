// A menu's route table drawn as Mermaid: one flowchart per branch of the menu, for a person to read. Drawn from the table, never
// edited: the table is the source, and the picture is made again whenever it changes.
//   - each page of the branch is a node, labelled by its label (else its id);
//   - a route to a page of another branch goes to a stub naming that page, drawn dashed;
//   - "back" goes to one "back" node; a route from "*" is drawn once, from an "any page" node.
import { ANY, BACK, readTable } from './route-judge.mjs';

const mermaidText = (text) => `"${String(text).replace(/"/g, '#quot;')}"`;
const NO_BRANCH = 'menu';
const menuBranchOf = (page) => page?.branch || NO_BRANCH;

/** The menu's branches, each with its Mermaid text: { name, file, text }. */
export function diagrams(table) {
  const t = readTable(table);
  const names = [...new Set([...t.pages.values()].map(menuBranchOf))];
  return names.map((name) => ({ name, file: `${name.replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '') || NO_BRANCH}.mmd`, text: diagram(t, name) }));
}

function diagram(t, name) {
  const ids = new Map();
  const node = (key) => ids.get(key) ?? (ids.set(key, `n${ids.size}`), ids.get(key));
  const lines = ['flowchart LR'];
  const inBranch = [...t.pages.values()].filter((p) => menuBranchOf(p) === name);
  const here = new Set(inBranch.map((p) => p.id));
  for (const p of inBranch) lines.push(`  ${node(p.id)}[${mermaidText(p.label ?? p.id)}]`);
  const stubs = new Set();
  for (const r of t.routes.filter((r) => here.has(r.from) || r.from === ANY)) {
    const from = node(r.from);
    const label = mermaidText(r.when ? `${r.input} (${r.when})` : r.input);
    const outside = r.to !== BACK && !here.has(r.to);
    if (outside) stubs.add(r.to);
    lines.push(`  ${from} ${outside ? '-.->' : '-->'}|${label}| ${node(r.to)}`);
  }
  if (ids.has(ANY)) lines.push(`  ${node(ANY)}{{${mermaidText('any page')}}}`);
  if (ids.has(BACK)) lines.push(`  ${node(BACK)}((${mermaidText('back')}))`);
  for (const id of stubs) lines.push(`  ${node(id)}([${mermaidText(`${menuBranchOf(t.pages.get(id))}: ${t.pages.get(id)?.label ?? id}`)}])`);
  return `${lines.join('\n')}\n`;
}
