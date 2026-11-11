// The dynamic-data pack's checks (0.25.0), fired through the base lesson-checks hook.
import { holdsEachCaseIn, reviewPacksInstall } from '../lesson-cases.mts';

holdsEachCaseIn(reviewPacksInstall, [
  ['dynamic-data', 'src/save.ts', 'await col.updateOne({ _id: id }, { $set: req.body });\n', 'await write(entity, id, patch, { role, scope });\n'],
  ['dynamic-data', 'src/filter.ts', 'const f = new Function("return " + text)();\n', 'const f = FilterTree.parse(text);\n'],
]);
