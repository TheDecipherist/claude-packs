// The proxy's build (typescript order W8.2, d-13, review-2-go 5.1, 5.2, 5.5): two builds of one source give one sha256, an unchanged
// source is not built again, and a changed byte of a signed darwin binary fails the release check.
import { spawnSync } from 'node:child_process';
import { cpSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { scratchDir } from '../../packs/base/hooks/lib/files.mts';
import { hostTarget } from '../../lib/proxy-binary.mts';
import { binaryPath, buildProxy, goVersion, releaseCheck, sourceHash } from '../../scripts/build-proxy.mts';
import { hashFile } from '../../lib/manifest.mts';
import { KIT, assert, test } from '../kit-cli.mts';

const go = goVersion(KIT, process.env);
const skip = go === null ? 'go is not on PATH' : false;
const host = hostTarget() ?? 'darwin-arm64';

/** A scratch copy of the proxy's sources, so a build's stamp and binaries stay out of the kit's tree. */
function copyOfSources(): string {
  const root = scratchDir('build-proxy-');
  cpSync(join(KIT, 'proxy'), join(root, 'proxy'), { recursive: true });
  return root;
}

test('two builds of one source, the second with an empty Go build cache, give one sha256 per target', { skip, timeout: 280_000 }, async () => {
  const root = copyOfSources();
  const targets = [host, 'linux-amd64'] as const;
  const one = await buildProxy({ root, out: join(root, 'one'), targets, force: true });
  const two = await buildProxy({ root, out: join(root, 'two'), targets, force: true, env: { ...process.env, CLAUDE_PACKS_GO_CACHE: join(scratchDir('go-cache-'), 'go') } });
  assert.deepEqual([one.problems.filter((p) => !/darwin-amd64/.test(p)), two.problems.filter((p) => !/darwin-amd64/.test(p))], [[], []]);
  for (const t of targets) assert.equal(hashFile(binaryPath(join(root, 'one'), t)), hashFile(binaryPath(join(root, 'two'), t)), t);
});

test('a source and Go\'s version equal to the last build\'s are not built again; a changed source is', { skip, timeout: 120_000 }, async () => {
  const root = copyOfSources();
  const first = await buildProxy({ root, targets: [host] });
  assert.equal(first.skipped, false);
  assert.deepEqual(first.built, [host]);
  const again = await buildProxy({ root, targets: [host] });
  assert.equal(again.skipped, true);
  assert.deepEqual(again.built, []);
  const before = sourceHash(root);
  writeFileSync(join(root, 'proxy', 'main.go'), `${readFileSync(join(root, 'proxy', 'main.go'), 'utf8')}\n// changed\n`);
  assert.notEqual(sourceHash(root), before);
  assert.equal((await buildProxy({ root, targets: [host] })).skipped, false);
  const tests = sourceHash(root);
  writeFileSync(join(root, 'proxy', 'main_test.go'), 'package main\n');
  assert.equal(sourceHash(root), tests, 'a test file is no part of what the binary is built from');
});

test('a planted byte change in a signed darwin binary fails the release check, and the untouched one passes', { skip: go === null || process.platform !== 'darwin' ? 'needs Go and macOS' : false, timeout: 120_000 }, async () => {
  const root = copyOfSources();
  const out = join(root, 'out');
  const built = await buildProxy({ root, out, targets: ['darwin-arm64'], force: true });
  assert.deepEqual(built.problems, []);
  assert.deepEqual(releaseCheck(out, ['darwin-arm64']), []);
  const file = binaryPath(out, 'darwin-arm64');
  const bytes = readFileSync(file);
  const at = Math.floor(bytes.length / 3);
  bytes.writeUInt8((bytes.readUInt8(at) + 1) & 0xff, at);
  writeFileSync(file, bytes);
  assert.match(releaseCheck(out, ['darwin-arm64']).join('\n'), /darwin-arm64: codesign -v refuses it/);
  assert.match(releaseCheck(join(root, 'nowhere'), ['linux-arm64']).join('\n'), /linux-arm64: no binary/);
  assert.notEqual(spawnSync('codesign', ['-v', file]).status, 0);
});
