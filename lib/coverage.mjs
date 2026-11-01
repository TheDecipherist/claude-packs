// "Do the rules actually fire?" Two numbers per project: rules whose paths match no file
// (the folder structure and the rules disagree) and source files no rule covers (code that
// grew outside the structure). doctor prints both; `doctor --strict` fails on either.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const SKIP = /(^|\/)(\.git|node_modules|build|Builds|_deps|JUCE|JuceLibraryCode|cmake-build[^/]*)(\/|$)/;
// Inside any .claude/ only the kit's own files are walked: skills, rules and agents, which rules on
// the `claude` concept aim at (Sub37 WB-1: skipping .claude made those rules look dead in --strict).
// Worktrees, hooks, state and backups stay out, so a worktree's copy never counts as the project's.
const CLAUDE_KEEP = new Set(['skills', 'rules', 'agents']);
const SOURCE = /\.(c|cc|cpp|cxx|h|hh|hpp|mm|m|wgsl|metal|hlsl)$/i;

function files(root) {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, e.name);
      const rel = relative(root, abs).replace(/\\/g, '/');
      if (SKIP.test(rel)) continue;
      if (e.isDirectory() && dir.endsWith('/.claude') && !CLAUDE_KEEP.has(e.name)) continue;
      if (e.isDirectory()) walk(abs);
      else out.push(rel);
    }
  };
  walk(root);
  return out;
}

function rulePaths(claudeDir) {
  const dir = join(claudeDir, 'rules');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => {
    const fm = readFileSync(join(dir, f), 'utf8').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
    return { rule: f, globs: [...fm.matchAll(/^\s*-\s*"([^"]+)"/gm)].map((m) => m[1]) };
  });
}

export async function coverage(projectDir) {
  const claudeDir = join(projectDir, '.claude');
  const { matchesAny } = await import(pathToFileURL(join(claudeDir, 'hooks', 'lib', 'glob.mjs')).href);
  const { readLayout } = await import(pathToFileURL(join(claudeDir, 'hooks', 'lib', 'layout.mjs')).href);
  const all = files(projectDir);
  const rules = rulePaths(claudeDir);
  const deadRules = rules.filter((r) => r.globs.length && !all.some((f) => matchesAny(f, r.globs))).map((r) => r.rule);
  const protectedGlobs = readLayout(projectDir).protected ?? [];
  const uncovered = all.filter((f) => SOURCE.test(f) && !matchesAny(f, protectedGlobs) && !rules.some((r) => matchesAny(f, r.globs)));
  return { deadRules, uncovered, sourceCount: all.filter((f) => SOURCE.test(f)).length };
}
