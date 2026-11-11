// Regenerates every rule's `paths:` from its `# concepts:` line and the layout.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { globsForConcepts as kitGlobs } from '../packs/base/hooks/lib/layout.mts';
import type { InstalledLayoutModule, Layout } from '../packs/base/hooks/lib/types.d.mts';

/** What turns a layout and a rule's concepts into globs: the kit's own, or the one a project's installed layout.mjs holds. */
export type GlobsForConcepts = InstalledLayoutModule['globsForConcepts'];

/** A rule's text with its `paths:` written from its concepts and the layout; null for a rule
 *  without a `# concepts:` line, or (unless strict, which throws) whose concepts resolve to nothing. */
export function renderRule(text: string, layout: Layout, globsForConcepts: GlobsForConcepts = kitGlobs, strict = false): string | null {
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  const line = fm?.[1]?.match(/^# concepts:\s*(.+)$/m);
  if (!fm || !line?.[1]) return null;
  const concepts = line[1].split(',').map((s) => s.trim()).filter(Boolean);
  let globs: string[];
  try { globs = globsForConcepts(layout, concepts); } catch (e) { if (strict) throw e; return null; }
  const head = ['---', `# concepts: ${concepts.join(', ')}`, 'paths:', ...globs.map((g) => `  - "${g}"`), '---'].join('\n');
  return text.replace(fm[0], head);
}

/** The project's own installed layout reader: a rule is rendered by the law the project holds, not the kit's. */
async function layoutLib(projectDir: string): Promise<InstalledLayoutModule> {
  const installed: InstalledLayoutModule = await import(pathToFileURL(join(projectDir, '.claude', 'hooks', 'lib', 'layout.mjs')).href);
  return installed;
}

export interface ApplyPathsOptions { checkOnly?: boolean; skip?: ReadonlySet<string> }

/** Rewrites each rule of a project whose `paths:` is stale (only counts them when checkOnly); a rule in `skip` is the user's. */
export async function applyPaths(projectDir: string, { checkOnly = false, skip = new Set<string>() }: ApplyPathsOptions = {}): Promise<{ stale: number }> {
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
