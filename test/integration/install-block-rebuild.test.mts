// planner W3: the rebuild template's own block installs with `init --from` (split from install-block.test.mts so no file sums over a minute).
import { holdsTemplates } from './install-block-rig.mts';

holdsTemplates(['rebuild']);
