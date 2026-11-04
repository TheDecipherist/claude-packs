// Published text and what ships with it. A tutorial's compose file, a sample key or a date in an article is an example or a fact, never the project's own code,
// so code laws leave it alone and the writing laws still read it. `src/app/blog/page.tsx` is code: a folder under a code root is not content.
// layout.json "guards": { "content": ["<glob>"] } adds a project's own.
//   isContent(rel, layout) -> boolean
import { matchesAny } from './glob.mjs';

const CONTENT = /(^|\/)(articles|posts|_posts|blog|content|tutorials|examples|samples)\//;
const CODE_ROOT = /(^|\/)(src|app|pages|components|lib|server|routes|api|packages)(\/|$)/;

export function isContent(rel, layout = {}) {
  if (matchesAny(rel, layout.guards?.content ?? [])) return true;
  const m = rel.match(CONTENT);
  return Boolean(m) && !CODE_ROOT.test(rel.slice(0, m.index));
}
