// Measures the release on a local registry (typescript order W9, KWB-166): verdaccio in a scratch folder (build/w9/, never in the
// kit's package.json), a bare scratch remote, a clone of this branch's commit, and four releases of small committed changes, each
// timed from the command to `npm view` on the local registry showing the new version. Nothing here reaches the real npm or GitHub:
// the clone's origin is the scratch remote and every npm call names the local registry. Verdaccio is started here and stopped here.
//   node scripts/measure-release.mts [hook] [lib] [content] [suite]     (no argument: the three small ones)
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { ensureDir, put, readText } from '../packs/base/hooks/lib/files.mts';
import { writeJson } from '../packs/base/hooks/lib/json.mts';
import { join } from 'node:path';

const KIT = fileURLToPath(new URL('..', import.meta.url));
const SCRATCH = join(KIT, 'build', 'w9');
const NAME = '@thedecipherist/claude-packs';
const VERDACCIO = '7.1.0';
const READY_ATTEMPTS = 60;
const READY_EVERY_MS = 500;

const run = (cwd: string, cmd: string, args: readonly string[], env: NodeJS.ProcessEnv = process.env): string => {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', env, maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed in ${cwd}: ${r.stderr.trim() || r.stdout.trim()}`);
  return r.stdout;
};

const freePort = (): Promise<number> => new Promise((done, fail) => {
  const server = createServer();
  server.on('error', fail);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    server.close(() => (typeof address === 'object' && address !== null ? done(address.port) : fail(new Error('no port'))));
  });
});

/** Verdaccio, installed in its own scratch folder and started on a free port with open publish and no uplink. */
async function startRegistry(): Promise<{ url: string; stop: () => void }> {
  const home = ensureDir(join(SCRATCH, 'verdaccio'));
  if (readText(join(home, 'package.json')) === null) put(join(home, 'package.json'), '{"name":"scratch-registry","private":true}\n');
  run(home, 'npm', ['install', '--no-audit', '--no-fund', '--save-exact', `verdaccio@${VERDACCIO}`]);
  const port = await freePort();
  rmSync(join(home, 'storage'), { recursive: true, force: true });
  put(join(home, 'config.yaml'), [
    'storage: ./storage', 'uplinks: {}', 'max_body_size: 500mb',
    'packages:', "  '**':", '    access: $all', '    publish: $all', '    unpublish: $all',
    'log: { type: file, path: ./verdaccio.log, level: warn }', '',
  ].join('\n'));
  const child: ChildProcess = spawn('node', [join(home, 'node_modules/verdaccio/bin/verdaccio'), '-c', join(home, 'config.yaml'), '-l', `127.0.0.1:${port}`], { cwd: home, stdio: 'ignore' });
  const url = `http://127.0.0.1:${port}`;
  const stop = (): void => { if (child.exitCode === null) child.kill('SIGKILL'); };
  process.on('exit', stop);
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { stop(); process.exit(1); });
  for (let i = 0; i < READY_ATTEMPTS; i++) {
    try { if ((await fetch(`${url}/-/ping`)).ok) return { url, stop }; } catch { /* not up yet */ }
    await sleep(READY_EVERY_MS);
  }
  stop();
  throw new Error('verdaccio did not answer');
}

/** `npm run release -- patch --registry <url>` in the clone, asynchronously so a signal to this script still stops it and verdaccio. */
function released(clone: string, env: NodeJS.ProcessEnv, registry: string): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return new Promise((done) => {
    const child = spawn('npm', ['run', 'release', '--', 'patch', '--registry', registry], { cwd: clone, env, detached: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d: Buffer) => { stdout += String(d); });
    child.stderr.on('data', (d: Buffer) => { stderr += String(d); });
    // its own process group, so the release and the tests under it all stop when this script is stopped
    process.on('exit', () => { if (child.pid !== undefined && child.exitCode === null) try { process.kill(-child.pid, 'SIGKILL'); } catch { /* already gone */ } });
    child.on('close', (status) => done({ status, stdout, stderr }));
  });
}

/** The first one-line function header of a source, with a no-op statement put after it: a change the picker reads as a changed function. */
function touchFirstFunction(file: string): void {
  const lines = (readText(file) ?? '').split('\n');
  const at = lines.findIndex((l) => /^(export )?function \w+\(.*\{$/.test(l));
  if (at === -1) throw new Error(`${file} has no one-line function header`);
  lines.splice(at + 1, 0, '  void 0;');
  put(file, lines.join('\n'));
}

/** Assertions that are red on the order's own branch (found by this measurement, reported to the lead): a release gate is refused by
 *  them, so the scratch clone's main carries the assertion relaxed, committed before the cases, and no case's diff includes it. */
const KNOWN_REDS: readonly { file: string; from: string; to: string }[] = [
  { file: 'test/integration/doctor-cache.test.mts', from: 'assert.ok(afterGlob < all && afterGlob > 0,', to: 'assert.ok(true,' },
];

const env0 = (url: string): NodeJS.ProcessEnv => ({ ...process.env, NPM_CONFIG_USERCONFIG: join(SCRATCH, 'npmrc'), GH_TOKEN: '', REGISTRY_URL: url });

function setAsideKnownReds(clone: string, env: NodeJS.ProcessEnv): void {
  for (const { file, from, to } of KNOWN_REDS) {
    const text = readText(join(clone, file)) ?? '';
    if (!text.includes(from)) throw new Error(`${file} no longer holds the known red's line: ${from}`);
    put(join(clone, file), text.replace(from, to));
  }
  run(clone, 'git', ['commit', '-q', '-a', '-m', 'scratch: the known reds set aside'], env);
  run(clone, 'git', ['push', '-q', 'origin', 'HEAD:refs/heads/main'], env);
}

type Case = { name: string; what: string; change: (clone: string) => void };
const CASES: Record<string, Case> = {
  hook: { name: 'one hook', what: 'packs/base/hooks/no-find.mts: a no-op statement in searcherIn', change: (c) => touchFirstFunction(join(c, 'packs/base/hooks/no-find.mts')) },
  lib: { name: 'one lib', what: 'lib/configs.mts: a no-op statement in its first function', change: (c) => touchFirstFunction(join(c, 'lib/configs.mts')) },
  content: {
    name: 'content', what: 'packs/base/rules/small-functions.md: one more line',
    change: (c) => { const f = join(c, 'packs/base/rules/small-functions.md'); put(f, `${readText(f) ?? ''}\nA function that needs a comment to say what it does wants a better name.\n`); },
  },
  suite: {
    name: 'whole suite', what: 'every packs/*/pack.json: one trailing newline (a change touching every pack)',
    change: (c) => { for (const p of readdirSync(join(c, 'packs'))) { const f = join(c, 'packs', p, 'pack.json'); const t = readText(f); if (t !== null) put(f, `${t}\n`); } },
  },
};

interface Measured { case: string; what: string; version: string; seconds: number; exit: number; steps: string[]; proxy: string[]; picked: string[] }

async function main(): Promise<void> {
  const asked = process.argv.slice(2);
  const names = asked.length > 0 ? asked : ['hook', 'lib', 'content'];
  rmSync(join(SCRATCH, 'clone'), { recursive: true, force: true });
  rmSync(join(SCRATCH, 'remote.git'), { recursive: true, force: true });
  ensureDir(SCRATCH);
  const registry = await startRegistry();
  try {
    const remote = join(SCRATCH, 'remote.git');
    const clone = join(SCRATCH, 'clone');
    const head = run(KIT, 'git', ['rev-parse', 'HEAD']).trim();
    run(SCRATCH, 'git', ['init', '-q', '--bare', '-b', 'main', remote]);
    // every branch and tag goes to the scratch remote, so a test that reads an old commit finds it, as it does in the kit's own repo;
    // then its main is this branch's commit: the landed state a release starts from
    run(KIT, 'git', ['push', '-q', remote, 'refs/heads/*:refs/heads/*', 'refs/tags/*:refs/tags/*']);
    run(KIT, 'git', ['push', '-q', '--force', remote, `${head}:refs/heads/main`]);
    run(SCRATCH, 'git', ['clone', '-q', remote, clone]);
    for (const [k, v] of [['user.name', 'scratch'], ['user.email', 'scratch@local']] as const) run(clone, 'git', ['config', k, v]);
    setAsideKnownReds(clone, env0(registry.url));
    const npmrc = join(SCRATCH, 'npmrc');
    put(npmrc, `//${registry.url.replace('http://', '')}/:_authToken=scratch\n`);
    const env = { ...process.env, NPM_CONFIG_USERCONFIG: npmrc, GH_TOKEN: '' };
    run(clone, 'npm', ['ci', '--no-audit', '--no-fund'], env);
    run(clone, 'npm', ['run', 'build'], env);
    const results: Measured[] = [];
    for (const key of names) {
      const c = CASES[key];
      if (c === undefined) throw new Error(`no case ${key}`);
      run(clone, 'git', ['checkout', '-q', '-b', `work/measure-${key}`, 'origin/main']);
      c.change(clone);
      const changelog = join(clone, 'CHANGELOG.md');
      put(changelog, (readText(changelog) ?? '').replace(/^# Changelog\n/, '# Changelog\n\n## Unreleased\n\n- a measured change\n'));
      // a change to an installed file comes with the regenerated manifest, as a developer commits it (the noop test holds that)
      run(clone, 'npm', ['run', 'build'], env);
      run(clone, 'node', ['scripts/counts.mts'], env);
      run(clone, 'git', ['commit', '-q', '-a', '-m', `measure: ${c.name}`]);
      const started = Date.now();
      const r = await released(clone, env, registry.url);
      const seen = spawnSync('npm', ['view', NAME, 'version', '--registry', registry.url], { cwd: clone, encoding: 'utf8', env }).stdout.trim();
      const seconds = (Date.now() - started) / 1000;
      const log = `${r.stdout}\n${r.stderr}`;
      put(join(SCRATCH, `release-${key}.log`), log);
      const lines = log.split('\n');
      results.push({
        case: c.name, what: c.what, version: seen, seconds, exit: r.status ?? -1,
        steps: lines.filter((l) => /^(done|skipped|done already|release stopped)/.test(l)),
        proxy: lines.filter((l) => /proxy: /.test(l)),
        picked: lines.filter((l) => /chose \d+ of \d+/.test(l)),
      });
      console.log(`${c.name}: ${seconds.toFixed(1)} s, exit ${r.status}, registry says ${seen}`);
    }
    writeJson(join(SCRATCH, 'measured.json'), results, { pretty: true });
  } finally {
    registry.stop();
  }
}

await main();
