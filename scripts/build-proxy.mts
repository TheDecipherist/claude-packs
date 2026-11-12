// Builds the hook proxy's client (typescript order W8.2, d-13, review-2-go 5.1 to 5.5): four binaries, darwin and linux on arm64 and
// amd64, each `CGO_ENABLED=0 go build -trimpath -buildvcs=false -ldflags "-s -w"` so two builds of one source give one sha256, in
// parallel, the Go build cache in ~/.cache/claude-packs/go. A build is skipped when the sources' hash and Go's version are the last
// build's. No tool edits a binary after `go build`: the darwin two are checked with `codesign -v` (a changed byte fails it), and
// `npm run release` runs that check (W9).
//   node scripts/build-proxy.mts [--host] [--force] [--check]
//     --host   only this machine's binary, and only when Go is on PATH (what `npm run build` does)
//     --check  no build: the binaries are there, their signatures hold
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readText } from '../packs/base/hooks/lib/files.mts';
import { isMain } from '../packs/base/hooks/lib/hook-log.mts';
import { parseJson, writeJson } from '../packs/base/hooks/lib/json.mts';
import { binaryCache } from '../packs/base/hooks/lib/proxy-wire.mts';
import type { Env } from '../packs/base/hooks/lib/types.d.mts';
import { hashFile } from '../lib/manifest.mts';
import { writeWireGo, wireGoCurrent } from './wire-gen.mts';
import { BINARY, TARGETS, hostTarget, type Target } from '../lib/proxy-binary.mts';

const KIT = fileURLToPath(new URL('..', import.meta.url));
const FLAGS = ['-trimpath', '-buildvcs=false', '-ldflags', '-s -w'];

export interface BuildOptions {
  root?: string;
  /** Where the binaries go: `<out>/OS-ARCH/hook-proxy` (the pack's hooks/bin by default). */
  out?: string;
  targets?: readonly Target[];
  force?: boolean;
  env?: Env;
  log?: (line: string) => void;
}
export interface BuildReport { built: Target[]; skipped: boolean; problems: string[]; goVersion: string; ms: number }

export const binariesFolder = (root: string): string => join(root, 'packs', 'base', 'hooks', 'bin');
export const binaryPath = (out: string, target: Target): string => join(out, target, BINARY);

/** The hash of what the binaries are built from: the names and bytes of go.mod and every non-test .go file of the proxy folder. */
export function sourceHash(root: string): string {
  const dir = join(root, 'proxy');
  const h = createHash('sha256');
  for (const f of readdirSync(dir).filter((n) => n === 'go.mod' || (n.endsWith('.go') && !n.endsWith('_test.go'))).sort()) h.update(`${f}\0`).update(readFileSync(join(dir, f))).update('\0');
  return h.digest('hex');
}

const goCache = (env: Env): string => env.CLAUDE_PACKS_GO_CACHE ?? join(binaryCache(env, homedir()), 'go');

/** Go's version as the proxy folder builds it (its go.mod's toolchain line may fetch a newer one), or null when Go is not on PATH. */
export function goVersion(root: string, env: Env): string | null {
  const r = spawnSync('go', ['version'], { cwd: join(root, 'proxy'), encoding: 'utf8', env: { ...process.env, ...env } });
  return r.status === 0 ? r.stdout.trim() : null;
}

/** The signature problems of a built set: a missing binary, and on macOS a darwin binary `codesign -v` does not accept. */
export function releaseCheck(out: string, targets: readonly Target[] = TARGETS): string[] {
  const problems: string[] = [];
  for (const t of targets) {
    const file = binaryPath(out, t);
    if (!existsSync(file)) { problems.push(`${t}: no binary at ${file}`); continue; }
    if (!t.startsWith('darwin') || process.platform !== 'darwin') continue;
    const r = spawnSync('codesign', ['-v', file], { encoding: 'utf8' });
    // Go's linker signs darwin/arm64 only; a darwin/amd64 binary carries no signature to break (its hash is the stamp's, and a build that
    // finds the file changed builds again), but one that is signed must verify
    if (r.status !== 0 && !(t === 'darwin-amd64' && /not signed at all/.test(r.stderr))) problems.push(`${t}: codesign -v refuses it (${(r.stderr || r.stdout || String(r.error)).trim().split('\n')[0]})`);
  }
  return problems;
}

function buildOne(root: string, out: string, target: Target, env: Env): Promise<string | null> {
  const [goos = '', goarch = ''] = target.split('-');
  const final = binaryPath(out, target);
  mkdirSync(join(out, target), { recursive: true });
  const temp = `${final}.new`;
  return new Promise((done) => {
    const child = spawn('go', ['build', ...FLAGS, '-o', temp, '.'], { cwd: join(root, 'proxy'), env: { ...process.env, ...env, CGO_ENABLED: '0', GOOS: goos, GOARCH: goarch, GOCACHE: goCache(env), GOFLAGS: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let said = '';
    child.stdout.on('data', (d: Buffer) => { said += String(d); });
    child.stderr.on('data', (d: Buffer) => { said += String(d); });
    child.on('error', (e) => done(`${target}: ${e.message}`));
    child.on('close', (code) => {
      if (code !== 0) { rmSync(temp, { force: true }); done(`${target}: go build failed: ${said.trim().split('\n').slice(0, 4).join(' / ')}`); return; }
      renameSync(temp, final); // a new file, never the old one rewritten: a signed binary changed in place is killed on Apple silicon
      done(null);
    });
  });
}

interface Stamp { source: string; go: string; sha: Partial<Record<Target, string>> }
const stampFile = (root: string): string => join(root, 'build', 'proxy-build.json');

/** Builds the targets in parallel, unless the sources and Go's version are the last build's and every binary is there. */
export async function buildProxy({ root = KIT, out = binariesFolder(root), targets = TARGETS, force = false, env = process.env, log = () => undefined }: BuildOptions = {}): Promise<BuildReport> {
  const started = Date.now();
  const go = goVersion(root, env);
  if (go === null) return { built: [], skipped: false, problems: ['go is not on PATH'], goVersion: '', ms: 0 };
  if (root === KIT) writeWireGo(root);   // the generated Go constants are part of what the hash covers
  const source = sourceHash(root);
  const last = parseJson<Stamp>(readText(stampFile(root)));
  const custom = out !== binariesFolder(root);
  const upToDate = !force && !custom && last?.source === source && last.go === go && targets.every((t) => existsSync(binaryPath(out, t)) && last.sha[t] === hashFile(binaryPath(out, t)));
  if (upToDate) {
    log(`proxy: up to date (${go}, sources ${source.slice(0, 12)})`);
    return { built: [], skipped: true, problems: releaseCheck(out, targets), goVersion: go, ms: Date.now() - started };
  }
  const failed = (await Promise.all(targets.map((t) => buildOne(root, out, t, env)))).filter((f): f is string => f !== null);
  const problems = [...failed, ...releaseCheck(out, targets.filter((t) => existsSync(binaryPath(out, t))))];
  if (!custom && failed.length === 0) {
    const sha = Object.fromEntries(targets.map((t) => [t, hashFile(binaryPath(out, t))]));
    mkdirSync(join(root, 'build'), { recursive: true });
    writeJson(stampFile(root), { source, go, sha: { ...(last?.source === source && last.go === go ? last.sha : {}), ...sha } } satisfies Stamp, { pretty: true });
  }
  log(`proxy: built ${targets.join(', ')} with ${go} in ${Date.now() - started} ms`);
  return { built: failed.length === 0 ? [...targets] : [], skipped: false, problems, goVersion: go, ms: Date.now() - started };
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  const host = hostTarget();
  if (args.includes('--check')) {
    const problems = releaseCheck(binariesFolder(KIT));
    if (!wireGoCurrent(KIT)) problems.push('proxy/wire_gen.go is not the wire table\'s rendering (node scripts/wire-gen.mts)');
    for (const p of problems) console.error(`proxy: ${p}`);
    process.exit(problems.length === 0 ? 0 : 1);
  }
  if (args.includes('--host') && (host === null || goVersion(KIT, process.env) === null)) {
    console.log('proxy: Go is not on PATH (or this machine has no client): the TypeScript runner is the live path here, and doctor says so');
    process.exit(0);
  }
  const report = await buildProxy({ force: args.includes('--force'), targets: args.includes('--host') && host !== null ? [host] : TARGETS, log: console.log });
  for (const p of report.problems) console.error(`proxy: ${p}`);
  process.exit(report.problems.length === 0 ? 0 : 1);
}
