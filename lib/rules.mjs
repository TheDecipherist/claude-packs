// Regenerates every rule's `paths:` from its `# concepts:` line and the layout.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

async function layoutLib(projectDir) {
  return import(pathToFileURL(join(projectDir, '.claude', 'hooks', 'lib', 'layout.mjs')).href);
}

export async function applyPaths(projectDir, { checkOnly = false, skip = new Set() } = {}) {
  const { readLayout, globsForConcepts } = await layoutLib(projectDir);
  const layout = readLayout(projectDir);
  const dir = join(projectDir, '.claude', 'rules');
  if (!existsSync(dir)) return { stale: 0 };
  let stale = 0;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    if (skip.has(join('.claude', 'rules', file))) continue; // the user's file or a rule they edited
    const text = readFileSync(join(dir, file), 'utf8');
    const fm = text.match(/^---\n([\s\S]*?)\n---/);
    const line = fm?.[1].match(/^# concepts:\s*(.+)$/m);
    if (!fm || !line) continue;
    const concepts = line[1].split(',').map((s) => s.trim()).filter(Boolean);
    const globs = globsForConcepts(layout, concepts);
    const head = ['---', `# concepts: ${concepts.join(', ')}`, 'paths:', ...globs.map((g) => `  - "${g}"`), '---'].join('\n');
    const next = text.replace(fm[0], head);
    if (next !== text) {
      stale += 1;
      if (!checkOnly) writeFileSync(join(dir, file), next);
    }
  }
  return { stale };
}
