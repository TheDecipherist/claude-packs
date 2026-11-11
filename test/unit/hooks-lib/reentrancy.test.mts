// W3.3 (d-10, review-2 2.8): the hooks hold no state that outlives an event, and importing one does no work. (a) Events of
// different checkouts, judged in one process one after the other, are each judged by their own checkout; a worktree is judged
// by the worktree's layout while the project is the main checkout. (b) Every base hook imports in a worker thread, stdin
// closed, and neither exits nor throws.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker } from 'node:worker_threads';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { gitRun } from '../../../packs/base/hooks/lib/git-run.mts';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';
import { runAll } from '../../../packs/base/hooks/run-hooks.mts';
import type { Layout } from '../../../packs/base/hooks/lib/types.d.mts';

const HOOKS = fileURLToPath(new URL('../../../packs/base/hooks/', import.meta.url));
const FOLDER_LAW = join(HOOKS, 'folder-law.mjs');

const layoutOf = (...paths: string[]): Layout => ({
  folders: Object.fromEntries(paths.map((p) => [p, { path: p, purpose: `the ${p} code` }])),
  concepts: {},
  sourceFiles: '\\.cpp$',
});

const git = (cwd: string, ...args: string[]): void => {
  const r = gitRun(args, { cwd, env: process.env, identity: { name: 't', email: 't@t' } });
  assert.ok(r.ok, r.stderr);
};

/** One event as the runner's caller makes it: this checkout is the project, and the file is a new source file. */
async function judge(project: string, cwd: string, file: string): Promise<number> {
  const env = { ...process.env, CLAUDE_PROJECT_DIR: project };
  const was = { dir: process.env.CLAUDE_PROJECT_DIR, cwd: process.cwd() };
  process.env.CLAUDE_PROJECT_DIR = project; // the hooks read the project per call (hook-log's projectRoot)
  process.chdir(cwd);
  try {
    const text = toJson({ hook_event_name: 'PreToolUse', tool_name: 'Write', tool_input: { file_path: file, content: 'int x;\n' } });
    return (await runAll([FOLDER_LAW], text, project, { env, stdout: process.stdout, stderr: process.stderr, cwd: project, sessionPid: 1 })).code;
  } finally {
    process.chdir(was.cwd);
    if (was.dir === undefined) delete process.env.CLAUDE_PROJECT_DIR; else process.env.CLAUDE_PROJECT_DIR = was.dir;
  }
}

test('two checkouts in one process are each judged by their own layout, then a worktree by its own under the main project', async () => {
  const strict = scratchDir('reentrant-a-');
  const loose = scratchDir('reentrant-b-');
  put(join(strict, '.claude/layout.json'), toJson(layoutOf('src')));
  put(join(loose, '.claude/layout.json'), toJson(layoutOf('src', 'other')));
  assert.equal(await judge(strict, strict, join(strict, 'other/x.cpp')), 2, 'outside strict\'s layout');
  assert.equal(await judge(loose, loose, join(loose, 'other/x.cpp')), 0, 'inside loose\'s layout');
  assert.equal(await judge(strict, strict, join(strict, 'other/y.cpp')), 2, 'strict again, after loose: no memory of it');

  // a worktree of `strict`, whose own layout allows `other`; the project the caller names is still the main checkout
  git(strict, 'init', '-q', '-b', 'main');
  git(strict, 'add', '.claude/layout.json');
  git(strict, 'commit', '-q', '-m', 'layout', '--', '.claude/layout.json');
  const tree = join(strict, '.claude', 'worktrees', 'wt');
  git(strict, 'worktree', 'add', '-q', tree, '-b', 'wt');
  put(join(tree, '.claude/layout.json'), toJson(layoutOf('src', 'other')));
  assert.equal(await judge(strict, tree, join(tree, 'other/x.cpp')), 0, 'the worktree\'s layout, not the main checkout\'s');
  assert.equal(await judge(strict, tree, join(strict, 'other/z.cpp')), 2, 'a file of the main checkout is still the main checkout\'s');
});

// A worker holds only what the module does when it loads: it says it imported, or it exits or throws before it can.
function importInWorker(file: string): Promise<string> {
  return new Promise((done) => {
    const worker = new Worker('const { workerData, parentPort } = require("node:worker_threads"); import(workerData).then(() => parentPort.postMessage("imported"))', {
      eval: true, workerData: pathToFileURL(file).href, stdin: true, stdout: true, stderr: true,
      env: { CLAUDE_PROJECT_DIR: scratchDir('reentrant-w-') },
    });
    const timer = setTimeout(() => { void worker.terminate(); done('still waiting after 15 s (reads stdin at import?)'); }, 15000);
    const end = (said: string): void => { clearTimeout(timer); done(said); };
    worker.stdin?.end();
    worker.on('message', (m) => { end(String(m)); void worker.terminate(); });
    worker.on('error', (e) => end(`threw: ${e.message}`));
    worker.on('exit', (code) => end(`exited with ${code} at import`));
  });
}

test('every base hook imports in a worker thread with stdin closed: none exits or throws', async () => {
  const hooks = readdirSync(HOOKS).filter((f) => f.endsWith('.mjs')).sort();
  assert.ok(hooks.length >= 20, `found ${hooks.length} hooks`);
  const said = await Promise.all(hooks.map(async (h) => [h, await importInWorker(join(HOOKS, h))] as const));
  assert.deepEqual(said.filter(([, s]) => s !== 'imported'), []);
});

test('the worker check sees a planted hook that exits, and one that throws, at import', async () => {
  const dir = scratchDir('reentrant-plant-');
  put(join(dir, 'exits.mjs'), 'process.exit(0);\n');
  put(join(dir, 'throws.mjs'), "throw new Error('planted');\n");
  put(join(dir, 'fine.mjs'), 'export const hook = () => 0;\n');
  assert.match(await importInWorker(join(dir, 'exits.mjs')), /^exited with 0 at import/);
  assert.match(await importInWorker(join(dir, 'throws.mjs')), /^threw: planted/);
  assert.equal(await importInWorker(join(dir, 'fine.mjs')), 'imported');
});
