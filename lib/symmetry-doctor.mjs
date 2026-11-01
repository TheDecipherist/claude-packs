// doctor's part for the generated gate shape_symmetry: the installed tool proves itself (its selftest plants a missing member
// and a swap difference), and every many concept in design/shape.json without a symmetry block is named (its generated test
// is red until it has one).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function symmetryProblems(projectDir, log = console.log) {
  const problems = [];
  const tool = join(projectDir, '.claude', 'tools', 'shape-symmetry.mjs');
  if (existsSync(tool)) {
    try {
      execFileSync('node', [tool, '--selftest'], { env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir }, stdio: 'pipe' });
    } catch (e) {
      problems.push(`shape-symmetry.mjs fails its selftest:\n${String(e.stdout)}${String(e.stderr)}`.trim());
    }
  }
  const file = join(projectDir, 'design', 'shape.json');
  if (existsSync(file)) {
    let shape;
    try { shape = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { return [...problems, `design/shape.json is not JSON: ${e.message}`]; }
    const bare = Object.entries(shape.concepts ?? {}).filter(([, c]) => c.shape === 'many' && !(c.symmetry?.members && c.symmetry?.swap)).map(([n]) => n);
    if (bare.length) log(`  note: many concept(s) with no symmetry commands, so shape_symmetry is red for them: ${bare.join(', ')}`);
  }
  return problems;
}
