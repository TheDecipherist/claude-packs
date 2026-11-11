// 0.10.0 (STEP 3 item 5): every configuration installs into a fresh repo and `doctor --strict` passes there: node and full-stack.
import { holdsInstalls } from './configurations-rig.mts';

holdsInstalls(['node', 'full-stack']);
