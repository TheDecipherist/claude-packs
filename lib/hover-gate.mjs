// 0.10.1 (Tim 2026-11-03; Stellix B-261): a project with UI code names the gate that proves its hover.
// layout.json "gates": { "hover": "<command>" }. doctor is red when the hover rule is installed, a file stands under its paths (the
// ui concept), and no gate is declared; or the command names a file (a word with a "/") that is not there. "none: <reason>" declines.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { projectFiles } from './coverage.mjs';

const RULE = /hover-every-pressable\.md$/;

export async function hoverGateProblems(projectDir, layout) {
  const rulesDir = join(projectDir, '.claude', 'rules');
  const rules = existsSync(rulesDir) ? readdirSync(rulesDir).filter((f) => RULE.test(f)) : [];
  if (!rules.length) return [];
  const globs = rules.flatMap((f) => [...(readFileSync(join(rulesDir, f), 'utf8').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '').matchAll(/^\s*-\s*"([^"]+)"/gm)].map((m) => m[1]));
  if (!globs.length) return [];
  const { matchesAny } = await import(pathToFileURL(join(projectDir, '.claude', 'hooks', 'lib', 'glob.mjs')).href);
  const ui = projectFiles(projectDir).filter((f) => matchesAny(f, globs));
  const gate = layout.gates?.hover;
  if (typeof gate === 'string' && /^none:\s*\S/.test(gate)) return [];
  if (ui.length === 0) return []; // no UI code yet: nothing to prove, and a gate named ahead of its file (a profile) is not red
  const hint = 'name it in layout.json as "gates": { "hover": "<command>" } (the hover-state skill says how to build it), or "none: <reason>"';
  if (typeof gate !== 'string' || !gate.trim() || /^none:/.test(gate)) return [`no hover gate declared for the UI code (${ui.slice(0, 3).join(', ')}${ui.length > 3 ? ', …' : ''}): ${hint}`];
  const missing = gate.split(/\s+/).filter((w) => w.includes('/') && !w.startsWith('-') && !/^[a-z]+:\/\//.test(w)).filter((w) => !existsSync(join(projectDir, w)));
  return missing.map((w) => `the hover gate "${gate}" names ${w}, which is not there`);
}
