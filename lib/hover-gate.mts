// 0.10.1 (Stellix B-261): a project with UI code names the gate that proves its hover.
// layout.json "gates": { "hover": "<command>" }. doctor is red when the hover rule is installed, a file stands under its paths (the
// ui concept), and no gate is declared; or the command names a file (a word with a "/") that is not there. "none: <reason>" declines.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readText } from '../packs/base/hooks/lib/files.mts';
import type { Env, InstalledGlobModule, Layout } from '../packs/base/hooks/lib/types.d.mts';
import { projectFiles } from './coverage.mts';

/** One gate: the rule whose paths say where it applies, its key in layout.json "gates", and the skill that builds it. */
interface Gate { rule: RegExp; key: string; skill: string }

/** The gate a layout declares under a key: its text, or undefined when "gates" or the key is not there or not text. */
function declared(layout: Layout, key: string): string | undefined {
  const gates: unknown = layout.gates;
  if (gates === null || typeof gates !== 'object') return undefined;
  const gate: unknown = Object.entries(gates).find(([name]) => name === key)?.[1];
  return typeof gate === 'string' ? gate : undefined;
}

async function gateProblems(projectDir: string, layout: Layout, { rule, key, skill }: Gate, env: Env): Promise<string[]> {
  const rulesDir = join(projectDir, '.claude', 'rules');
  const rules = existsSync(rulesDir) ? readdirSync(rulesDir).filter((f) => rule.test(f)) : [];
  if (!rules.length) return [];
  const globs = rules.flatMap((f) => [...(readText(join(rulesDir, f))?.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '').matchAll(/^\s*-\s*"([^"]+)"/gm)].flatMap((m) => (m[1] === undefined ? [] : [m[1]])));
  if (!globs.length) return [];
  const { matchesAny }: InstalledGlobModule = await import(pathToFileURL(join(projectDir, '.claude', 'hooks', 'lib', 'glob.mjs')).href);
  const ui = projectFiles(projectDir, env).filter((f) => matchesAny(f, globs));
  const gate = declared(layout, key);
  if (gate !== undefined && /^none:\s*\S/.test(gate)) return [];
  if (ui.length === 0) return []; // no UI code yet: nothing to prove, and a gate named ahead of its file (a profile) is not red
  const hint = `name it in layout.json as "gates": { "${key}": "<command>" } (the ${skill} skill says how to build it), or "none: <reason>"`;
  if (gate === undefined || !gate.trim() || /^none:/.test(gate)) return [`no ${key} gate declared for the UI code (${ui.slice(0, 3).join(', ')}${ui.length > 3 ? ', …' : ''}): ${hint}`];
  const missing = gate.split(/\s+/).filter((w) => w.includes('/') && !w.startsWith('-') && !/^[a-z]+:\/\//.test(w)).filter((w) => !existsSync(join(projectDir, w)));
  return missing.map((w) => `the ${key} gate "${gate}" names ${w}, which is not there`);
}

export const hoverGateProblems = (projectDir: string, layout: Layout, env: Env = process.env): Promise<string[]> => gateProblems(projectDir, layout, { rule: /(?:hover-every-pressable|pointer-feedback)\.md$/, key: 'hover', skill: 'hover-state' }, env);
// 0.17.0: a page is proved rendered (rule page-proved-rendered): the same law for accessibility and layout.
export const pageGateProblems = (projectDir: string, layout: Layout, env: Env = process.env): Promise<string[]> => gateProblems(projectDir, layout, { rule: /page-proved-rendered\.md$/, key: 'a11y', skill: 'prove-page' }, env);
