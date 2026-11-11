// browser-guard: code that starts a browser is refused. The contract, then the refusals of the old root files.
import { join } from 'node:path';
import { write } from '../../fixtures/installs.mts';
import { assert, test } from '../../kit-cli.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';
import { routeProject, unrefused } from '../routes.mts';

holdsTheContract({
  hook: 'browser-guard.mjs',
  dir: () => fixture('audio-core+gpu-painter'),
  same: (project) => ({ payload: write(join(project, 'tools/shot.mjs'), "import puppeteer from 'puppeteer';\nconst b = await puppeteer.launch();\n"), status: 2 }),
});

const LAUNCH = `const b = await puppeteer.${'launch'}();`;

test('browser-guard refuses code that starts a browser by every route', () => {
  assert.deepEqual(unrefused(routeProject(), 'browser-guard.mjs', 'tools/shot.mjs', '// shot\nPLACEHOLDER\n', LAUNCH), []);
});
