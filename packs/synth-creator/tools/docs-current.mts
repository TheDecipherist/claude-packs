// docs-current (synth-creator's tool): the build fails when the generated documents are stale or the generator is not deterministic.
//   node .claude/tools/docs-current.mjs [--dir <project>]
// The generator is the command `.claude/layout.json` names at `commands.docs`; the committed documents are in the folder at
// `docsFolder` (default `docs/machine`). The command runs in the project twice, each time with `{out}` in it replaced by a new
// temp folder (and the folder in the environment as DOCS_OUT). Exit 0: the two runs are byte for byte equal and equal the
// committed documents, or no generator is configured (it says so). Exit 1: not deterministic, stale, or the generator failed.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { isMain } from '../hooks/lib/hook-log.mts';
import { readJson } from '../hooks/lib/json.mts';

interface DocsLayout { commands?: { docs?: string }; docsFolder?: string }

const filesOf = (root: string): string[] =>
  existsSync(root) ? readdirSync(root, { recursive: true, encoding: 'utf8' }).filter((r) => statSync(join(root, r)).isFile()).sort() : [];

/** What differs between two folders, by file name and by bytes. */
export function differences(a: string, b: string): string[] {
  const names = [...new Set([...filesOf(a), ...filesOf(b)])].sort();
  return names.flatMap((n) => {
    const x = existsSync(join(a, n)), y = existsSync(join(b, n));
    if (x && y) return readFileSync(join(a, n)).equals(readFileSync(join(b, n))) ? [] : [`differs: ${n}`];
    return [x ? `only in the generated: ${n}` : `only in the other: ${n}`];
  });
}

/** One run of the generator into a new temp folder; throws when it fails. */
function generate(project: string, command: string): string {
  const out = mkdtempSync(join(tmpdir(), 'docs-current-'));
  const run = spawnSync('sh', ['-c', command.split('{out}').join(out)], { cwd: project, encoding: 'utf8', env: { ...process.env, DOCS_OUT: out } });
  if (run.status !== 0) throw new Error(`the generator failed (exit ${run.status}): ${run.stderr.trim()}`);
  return out;
}

const refuse = (headline: string, lines: readonly string[]): number => {
  console.log([`docs-current: ${headline}`, ...lines.map((l) => `  ${l}`)].join('\n'));
  return 1;
};

function main(args: readonly string[]): number {
  const at = args.indexOf('--dir');
  const project = resolve(at >= 0 ? args[at + 1] ?? '.' : process.env.CLAUDE_PROJECT_DIR ?? '.');
  const layout = readJson<DocsLayout>(join(project, '.claude/layout.json'), {}) ?? {};
  const command = layout.commands?.docs;
  if (command === undefined) { console.log('docs-current: no generator configured (.claude/layout.json commands.docs); nothing to check'); return 0; }
  const dirs: string[] = [];
  try {
    dirs.push(generate(project, command), generate(project, command));
    const unstable = differences(dirs[0] as string, dirs[1] as string);
    if (unstable.length > 0) return refuse('the generator is not deterministic (two runs differ): ordering, timestamps or locale', unstable);
    const stale = differences(dirs[0] as string, join(project, layout.docsFolder ?? 'docs/machine'));
    if (stale.length > 0) return refuse(`the committed documents are stale: run the generator (${command}) and commit`, stale);
    console.log('docs-current: two runs are identical and the committed documents are current');
    return 0;
  } catch (error) {
    return refuse((error as Error).message, []);
  } finally {
    for (const d of dirs) rmSync(d, { recursive: true, force: true });
  }
}

if (isMain(import.meta.url)) process.exit(main(process.argv.slice(2)));
