// template-law: a copy of a template, a helper or an element the project already has is refused, naming what differs. The hook's
// contract, then its refusals.
import { join } from 'node:path';
import { put } from '../../../packs/base/hooks/lib/files.mts';
import { write } from '../../fixtures/installs.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

const EL = (t: string): string => `<div class="tile"><h3 class="name">${t}</h3><p>${t}</p></div>\n`;

holdsTheContract({
  hook: 'template-law.mjs',
  dir: () => fixture('base'),
  same: (project) => {
    put(join(project, 'src/app/one.html'), EL('One'));
    return { payload: write(join(project, 'src/app/two.html'), EL('Two')), status: 2 };
  },
});
