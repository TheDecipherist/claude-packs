// "Do the rules actually fire?" Two numbers per project: rules whose paths match no file
// (the folder structure and the rules disagree) and source files no rule covers (code that
// grew outside the structure). doctor prints both; `doctor --strict` fails on either.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const SKIP = /(^|\/)(\.git|node_modules|build|Builds|_deps|JUCE|JuceLibraryCode|cmake-build[^/]*)(\/|$)/;
// Inside any .claude/ only the kit's own files are walked: skills, rules and agents, which rules on
// the `claude` concept aim at (Sub37 WB-1: skipping .claude made those rules look dead in --strict).
// Worktrees, hooks, state and backups stay out, so a worktree's copy never counts as the project's.
const CLAUDE_KEEP = new Set(['skills', 'rules', 'agents']);
export const SOURCE = /\.(c|cc|cpp|cxx|h|hh|hpp|mm|m|wgsl|metal|hlsl)$/i;

// The files git would not ignore (tracked, and untracked but not ignored), relative to root; null
// when root is not inside a git work tree. Build output a project ignores (Stellix's out/**) is
// not source, wherever the build folder is and whatever it is called.
function gitVisible(root) {
  const ls = (...a) => execFileSync('git', ['ls-files', '-z', ...a], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 256 * 1024 * 1024 }).split('\0').filter(Boolean);
  try {
    return { files: new Set(ls('--cached', '--others', '--exclude-standard')), dirs: new Set(ls('--others', '--ignored', '--exclude-standard', '--directory').filter((d) => d.endsWith('/'))) };
  } catch {
    return null;
  }
}

export function projectFiles(root) {
  const git = gitVisible(root);
  const visible = git?.files;
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, e.name);
      const rel = relative(root, abs).replace(/\\/g, '/');
      if (SKIP.test(rel)) continue;
      if (e.isDirectory() && git?.dirs.has(`${rel}/`)) continue; // a whole ignored folder (build output): never walked
      if (e.isDirectory() && dir.endsWith('/.claude') && !CLAUDE_KEEP.has(e.name)) continue;
      if (e.isDirectory()) walk(abs);
      else if (!visible || visible.has(rel)) out.push(rel);
    }
  };
  walk(root);
  return out;
}

// The project's own .claude/ files (its rules, skills, agents), which rules of the "claude" concept
// fire on; agent worktrees, backups and run state are not the project's.
function claudeFiles(projectDir) {
  const out = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const rel = relative(projectDir, join(dir, e.name)).replace(/\\/g, '/');
      if (/^\.claude\/(worktrees|\.claude-packs-backup|state)(\/|$)/.test(rel)) continue;
      if (e.isDirectory()) walk(join(dir, e.name));
      else out.push(rel);
    }
  };
  walk(join(projectDir, '.claude'));
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

// `source`: what counts as source (the configuration's "sourceFiles"; default C, C++ and shaders). KWB-32: a full-stack project's
// TypeScript was never counted, so a file outside every rule could not show.
export async function coverage(projectDir, source = SOURCE) {
  const claudeDir = join(projectDir, '.claude');
  const { matchesAny } = await import(pathToFileURL(join(claudeDir, 'hooks', 'lib', 'glob.mjs')).href);
  const { readLayout } = await import(pathToFileURL(join(claudeDir, 'hooks', 'lib', 'layout.mjs')).href);
  const all = projectFiles(projectDir);
  const rules = rulePaths(claudeDir);
  const reachable = [...all, ...claudeFiles(projectDir)];
  const deadRules = rules.filter((r) => r.globs.length && !reachable.some((f) => matchesAny(f, r.globs))).map((r) => r.rule);
  const protectedGlobs = readLayout(projectDir).protected ?? [];
  const uncovered = all.filter((f) => source.test(f) && !matchesAny(f, protectedGlobs) && !rules.some((r) => matchesAny(f, r.globs)));
  return { deadRules, uncovered, sourceCount: all.filter((f) => source.test(f)).length };
}
