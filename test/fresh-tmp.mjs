// Preloaded by `npm test`: every test process gets its own empty temp folder. Profiles with
// `siblings: ["../"]` make doctor read the folder around a project, and the shared system temp
// folder holds tens of thousands of other programs' files (and other tests' repos).
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'claude-packs-test-'));
process.env.TMPDIR = dir;
process.on('exit', () => rmSync(dir, { recursive: true, force: true }));
