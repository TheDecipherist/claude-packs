// The react pack's checks (0.25.0), fired through the base lesson-checks hook.
import { holdsEachCaseIn, reviewPacksInstall } from '../lesson-cases.mts';

holdsEachCaseIn(reviewPacksInstall, [
  ['react', 'src/Row.tsx', 'export const A = () => <button><Icon /></button>;\n', 'export const A = () => <button aria-label="Close"><Icon /></button>;\n'],
]);
