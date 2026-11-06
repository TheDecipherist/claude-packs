// The kit's command as the 0.10.0 tests run it (one place, so their headers are not copies of each other): the CLI path, run
// (throws on a non-zero exit, returns stdout), cli (returns the spawn result), a fresh folder, a hook fired as Claude Code fires it.
import { execFileSync, spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { test } from 'node:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export { default as assert } from 'node:assert/strict';
export { test } from 'node:test';
export { execFileSync, spawnSync, join };
export { appendFileSync, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';

export const KIT = fileURLToPath(new URL('..', import.meta.url));
export const CLI = join(KIT, 'bin/claude-packs.mjs');
export const run = (dir, ...args) => execFileSync('node', [CLI, ...args, '--dir', dir], { encoding: 'utf8' });
export const cli = (dir, ...args) => spawnSync('node', [CLI, ...args, '--dir', dir], { encoding: 'utf8' });
export const fresh = (prefix) => mkdtempSync(join(tmpdir(), prefix));
// A fresh folder holding these files: { "rel/path": "text" }.
export function projectWith(files, prefix = 'find-') {
  const dir = fresh(prefix);
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(join(dir, rel, '..'), { recursive: true });
    writeFileSync(join(dir, rel), text);
  }
  return dir;
}
export const hookRun = (dir, name, payload) =>
  spawnSync('node', [join(dir, '.claude/hooks', name)], { input: JSON.stringify(payload), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir } });
export const hookStatus = (dir, name, payload) => hookRun(dir, name, payload).status;
// A Write fired at the project's lesson checks, and a set of checks held to their examples through the hook, in a real install.
export const lessonWrite = (dir, rel, content) => hookRun(dir, 'lesson-checks.mjs', { tool_name: 'Write', tool_input: { file_path: join(dir, rel), content } });
// One test per [pack, file, bad, good]: the pack installs, refuses the fault and takes the fix.
export function holdsEachCase(cases, ...initArgs) {
  for (const [pack, file, bad, good] of cases) {
    test(`${pack}: ${file} is refused its fault and takes the fix`, () => {
      const dir = fresh(`case-${pack}-`);
      const r = cli(dir, 'init', pack, ...initArgs);
      assert.equal(r.status, 0, r.stdout + r.stderr);
      mkdirSync(join(dir, file, '..'), { recursive: true });
      assert.equal(lessonWrite(dir, file, bad).status, 2);
      assert.equal(lessonWrite(dir, file, good).status, 0);
    });
  }
}

export function holdToExamples(dir, checks, fileFor) {
  for (const c of checks) {
    const file = fileFor(c);
    const r = lessonWrite(dir, file, c.bad);
    if (r.status !== 2 || !r.stderr.includes(c.id)) throw new Error(`${c.id}: its bad example was not refused in ${file}: ${r.status} ${r.stderr}`);
    if (lessonWrite(dir, file, c.good).status !== 0) throw new Error(`${c.id}: its good example was refused in ${file}`);
  }
}
export const selftest = (dir, hook) => spawnSync('node', [join(dir, '.claude/hooks', hook), '--selftest'], { encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir } });
