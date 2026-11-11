// The repo lint's Go gate (typescript order W8.2): `go vet` and `go test` over the hook proxy's folder (proxy/ is a Go module of its
// own, so they run from inside it, `./...`). Skipped with a note where Go is not on PATH: the kit then builds no client, and the
// TypeScript runner is the live path (doctor says so). Beside test/repo-lint.test.mts, which holds the lint of the TypeScript tree.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { put, scratchDir } from '../packs/base/hooks/lib/files.mts';

const KIT = fileURLToPath(new URL('..', import.meta.url));
type Env = Readonly<Record<string, string | undefined>>;

/** What Go says of a module: null when Go is not on PATH (the gate is skipped, with a note), else each command's first lines of complaint. */
export function goGates(folder: string, env: Env = process.env): { skipped: string } | { problems: string[] } {
  if (spawnSync('go', ['version'], { env, cwd: folder }).error !== undefined) return { skipped: 'go is not on PATH: proxy/ is not vetted or tested here' };
  const problems = [['vet', './...'], ['test', './...']].flatMap(([sub = '', target = '']) => {
    const r = spawnSync('go', [sub, target], { cwd: folder, encoding: 'utf8', env });
    return r.status === 0 ? [] : [`go ${sub} ${target}: ${(r.stdout + r.stderr).trim().split('\n').slice(0, 6).join(' / ')}`];
  });
  return { problems };
}

const hasGo = spawnSync('go', ['version']).error === undefined;

test('proxy/ passes go vet and go test', { skip: hasGo ? false : 'go is not on PATH' }, () => {
  assert.deepEqual(goGates(join(KIT, 'proxy')), { problems: [] });
});

test('a module that vet refuses is found (planted: a Printf with the wrong verb)', { skip: hasGo ? false : 'go is not on PATH' }, () => {
  const dir = scratchDir('go-lint-');
  put(join(dir, 'go.mod'), 'module planted\n\ngo 1.27\n');
  put(join(dir, 'main.go'), 'package main\n\nimport "fmt"\n\nfunc main() { fmt.Printf("%d\\n", "text") }\n');
  const found = goGates(dir);
  assert.ok('problems' in found && found.problems.length >= 1 && /go vet/.test(found.problems[0] ?? ''), JSON.stringify(found));
});

test('with no Go on PATH the gate is skipped with a note, never passed silently', () => {
  const found = goGates(KIT, { PATH: '' });
  assert.ok('skipped' in found && /go is not on PATH/.test(found.skipped));
});
