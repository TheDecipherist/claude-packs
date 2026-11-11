// doctor's part for the generated gate shape_symmetry: the installed tool proves itself (its selftest plants a missing member
// and a swap difference), and every many concept in design/shape.json without a symmetry block is named (its generated test
// is red until it has one).
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readJson } from '../packs/base/hooks/lib/json.mts';
import type { Logger } from '../packs/base/hooks/lib/types.d.mts';

/** The part of design/shape.json this check reads. */
interface SymmetryShape { concepts?: Record<string, { shape?: string; symmetry?: { members?: unknown; swap?: unknown } }> }

const NOT_JSON = Symbol('not JSON');

/** What a failed selftest printed: its stdout, then its stderr (the failing cases are on either). */
function printedBy(error: unknown): string {
  if (error === null || typeof error !== 'object') return String(error);
  const out = 'stdout' in error ? String(error.stdout) : '';
  const err = 'stderr' in error ? String(error.stderr) : '';
  return `${out}${err}` || ('message' in error ? String(error.message) : String(error));
}

/** The problems doctor lists for the shape_symmetry gate; `env` is the caller's (the selftest runs under it, in `projectDir`). */
export function symmetryProblems(projectDir: string, log: Logger = console.log, env: Readonly<Record<string, string | undefined>> = process.env): string[] {
  const problems: string[] = [];
  const tool = join(projectDir, '.claude', 'tools', 'shape-symmetry.mjs');
  if (existsSync(tool)) {
    try {
      execFileSync('node', [tool, '--selftest'], { env: { ...env, CLAUDE_PROJECT_DIR: projectDir }, stdio: 'pipe' });
    } catch (e) {
      problems.push(`shape-symmetry.mjs fails its selftest:\n${printedBy(e)}`.trim());
    }
  }
  const file = join(projectDir, 'design', 'shape.json');
  if (existsSync(file)) {
    const shape = readJson<SymmetryShape | typeof NOT_JSON>(file, NOT_JSON);
    if (shape === NOT_JSON || shape === null) return [...problems, 'design/shape.json is not JSON'];
    const bare = Object.entries(shape.concepts ?? {}).filter(([, c]) => c.shape === 'many' && !(c.symmetry?.members && c.symmetry?.swap)).map(([n]) => n);
    if (bare.length) log(`  note: many concept(s) with no symmetry commands, so shape_symmetry is red for them: ${bare.join(', ')}`);
  }
  return problems;
}
