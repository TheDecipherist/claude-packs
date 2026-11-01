// Regenerates every rule's `paths:` from its `# concepts:` line and the layout.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { globsForConcepts as kitGlobs } from '../packs/base/hooks/lib/layout.mjs';

// A rule's text with its `paths:` written from its concepts and the layout; null for a rule
// without a `# concepts:` line, or (unless strict, which throws) whose concepts resolve to nothing.
export function renderRule(text, layout, globsForConcepts = kitGlobs, strict = false) {
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  const line = fm?.[1].match(/^# concepts:\s*(.+)$/m);
  if (!fm || !line) return null;
  const concepts = line[1].split(',').map((s) => s.trim()).filter(Boolean);
  let globs;
  try { globs = globsForConcepts(layout, concepts); } catch (e) { if (strict) throw e; return null; }
  const head = ['---', `# concepts: ${concepts.join(', ')}`, 'paths:', ...globs.map((g) => `  - "${g}"`), '---'].join('\n');
  return text.replace(fm[0], head);
}

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
    const next = renderRule(text, layout, globsForConcepts, true);
    if (next !== null && next !== text) {
      stale += 1;
      if (!checkOnly) writeFileSync(join(dir, file), next);
    }
  }
  return { stale };
}
