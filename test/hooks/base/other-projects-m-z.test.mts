// The second half of the hooks, fired at files in another project (see other-projects.test.mts).
import { holdsOtherProjectsAlone } from './other-projects-rig.mts';

holdsOtherProjectsAlone('m', 'z');
