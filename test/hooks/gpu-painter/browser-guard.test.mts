// browser-guard: code that starts a browser is refused. The contract, then the refusals of the old root files.
import { join } from 'node:path';
import { write } from '../../fixtures/installs.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'browser-guard.mjs',
  dir: () => fixture('audio-core+gpu-painter'),
  same: (project) => ({ payload: write(join(project, 'tools/shot.mjs'), "import puppeteer from 'puppeteer';\nconst b = await puppeteer.launch();\n"), status: 2 }),
});
