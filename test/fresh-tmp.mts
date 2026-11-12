// Preloaded by `npm test`: every test process gets its own empty temp folder. Profiles with
// `siblings: ["../"]` make doctor read the folder around a project, and the shared system temp
// folder holds tens of thousands of other programs' files (and other tests' repos).
// Self-contained on purpose: test-changed's own test copies this one file into a scratch repo.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// real: on macOS /var is a link to /private/var, and git names a checkout by its real path (KWB-158)
const dir = realpathSync(mkdtempSync(join(tmpdir(), 'claude-packs-test-')));
process.env.TMPDIR = dir;
process.on('exit', () => rmSync(dir, { recursive: true, force: true }));

// One memory of proved hooks for the whole run (the runner's preload makes it, its test processes inherit it), so a hook is proved once
// per run, never carried over from an earlier run (lib/selftest-cache.mts, KWB-41).
process.env.CLAUDE_PACKS_SELFTEST_CACHE ??= join(dir, 'selftests');

// The same hand-off for the installs the tests copy (test/fixtures/installs.mts): the first process to ask for a configuration
// builds it under this folder, the others wait for it, and every test works on a copy.
process.env.CLAUDE_PACKS_FIXTURES ??= join(dir, 'fixtures');

// once-only's detector (jscpd, the kit's optional dependency) for hooks installed into a test's throwaway project, which
// sit outside the kit's node_modules (0.9.0).
const jscpd = fileURLToPath(new URL('../node_modules/.bin/jscpd', import.meta.url));
if (existsSync(jscpd)) process.env.CLAUDE_PACKS_JSCPD ??= jscpd;

// The resident runner under test (review-2 6.2): its sockets, pid files and logs live in the run's own folder, never the user's
// ~/.cache/claude-packs, and the teardown stops every runner whose command line names that folder (a test that wants the TypeScript
// path sets CLAUDE_PACKS_DAEMON=off). test/repo-lint.test.mts holds that none is left after the run.
const daemonCache = (process.env.CLAUDE_PACKS_CACHE ??= join(dir, 'daemon-cache'));
mkdirSync(daemonCache, { recursive: true });
process.on('exit', () => {
  const ps = spawnSync('ps', ['-axo', 'pid=,command='], { encoding: 'utf8' });
  for (const line of ps.stdout.split('\n')) {
    const pid = Number(line.trim().split(/\s+/)[0]);
    if (line.includes('resident.mjs') && line.includes(daemonCache) && pid !== process.pid) {
      try { process.kill(pid, 'SIGTERM'); } catch { /* already gone */ }
    }
  }
});

// A test's simulated sessions are not this Claude process: kit-lock reads CLAUDE_PID as its holder (KWB-40).
delete process.env.CLAUDE_PID;

// kit-fresh asks npm for the newest kit at most once a day (KWB-156): the run's own cache, holding today's answer as this kit's own
// version, so no test reaches the network and an install of this kit reads as the newest
const cacheDir = (process.env.CLAUDE_PACKS_CACHE_DIR ??= join(dir, 'cache'));
mkdirSync(cacheDir, { recursive: true });
const kitPackage = new URL('../package.json', import.meta.url);   // absent where the preload is copied into a scratch repo
if (existsSync(kitPackage)) {
  const ownVersion = (JSON.parse(readFileSync(kitPackage, 'utf8')) as { version: string }).version;
  writeFileSync(join(cacheDir, 'kit-fresh.json'), JSON.stringify({ version: ownVersion, at: Date.now() }));
}

// KWB-166: a test's install takes the hooks' selftests as proved by the gate (scripts/test-changed.mts proves the changed ones first);
// a test whose subject is doctor's selftests runs them with CLAUDE_PACKS_SELFTESTS=run
process.env.CLAUDE_PACKS_SELFTESTS ??= 'gate';

// The load governor (W8.8): a run's buildq jobs and grants live in the run's own folder, never the user's ~/.cache/claude-packs, and
// see a planted idle machine, so a test never waits on the machine's real load or on another session's jobs. A test of the governor
// itself plants its own cores, load and folder.
process.env.CLAUDE_PACKS_GOVERNOR_DIR ??= join(dir, 'governor');
process.env.CLAUDE_PACKS_GOVERNOR_LOAD ??= '0';
// A run started through `governed` (W8.8 item 3, and every routed `npm test`) hands its children the grant's id and its caller's
// priority: a test's own governed job, buildq or load ask takes its own grant at the default priority, as with no governed parent
delete process.env.CLAUDE_PACKS_GOVERNED;
delete process.env.CLAUDE_PACKS_PRIORITY;
