// Preloaded by `npm test`: every test process gets its own empty temp folder. Profiles with
// `siblings: ["../"]` make doctor read the folder around a project, and the shared system temp
// folder holds tens of thousands of other programs' files (and other tests' repos).
import { existsSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// real: on macOS /var is a link to /private/var, and git names a checkout by its real path (KWB-158)
const dir = realpathSync(mkdtempSync(join(tmpdir(), 'claude-packs-test-')));
process.env.TMPDIR = dir;
process.on('exit', () => rmSync(dir, { recursive: true, force: true }));

// One memory of proved hooks for the whole run (the runner's preload makes it, its test processes inherit it), so a hook is proved once
// per run, never carried over from an earlier run (lib/selftest-cache.mjs, KWB-41).
process.env.CLAUDE_PACKS_SELFTEST_CACHE ??= join(dir, 'selftests');

// once-only's detector (jscpd, the kit's optional dependency) for hooks installed into a test's throwaway project, which
// sit outside the kit's node_modules (0.9.0).
const jscpd = fileURLToPath(new URL('../node_modules/.bin/jscpd', import.meta.url));
if (existsSync(jscpd)) process.env.CLAUDE_PACKS_JSCPD ??= jscpd;

// A test's simulated sessions are not this Claude process: kit-lock reads CLAUDE_PID as its holder (KWB-40).
delete process.env.CLAUDE_PID;
