// Preloaded by `npm test`: every test process gets its own empty temp folder. Profiles with
// `siblings: ["../"]` make doctor read the folder around a project, and the shared system temp
// folder holds tens of thousands of other programs' files (and other tests' repos).
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'claude-packs-test-'));
process.env.TMPDIR = dir;
process.on('exit', () => rmSync(dir, { recursive: true, force: true }));

// once-only's detector (jscpd, the kit's optional dependency) for hooks installed into a test's throwaway project, which
// sit outside the kit's node_modules (0.9.0).
const jscpd = fileURLToPath(new URL('../node_modules/.bin/jscpd', import.meta.url));
if (existsSync(jscpd)) process.env.CLAUDE_PACKS_JSCPD ??= jscpd;
