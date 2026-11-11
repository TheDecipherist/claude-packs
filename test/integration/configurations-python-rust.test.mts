// 0.10.0 (STEP 3 item 5): every configuration installs into a fresh repo and `doctor --strict` passes there: python and rust.
// (The others: configurations*.test.mts; split by configuration so no file sums over a minute.)
import { holdsInstalls } from './configurations-rig.mts';

holdsInstalls(['python', 'rust']);
