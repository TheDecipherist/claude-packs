// What counts as litter in git: the size limit and the root screenshot. repo-litter judges a `git add` with these, and
// `claude-packs scan` (lib/repo-weight.mjs) counts the same things in a project that is already carrying them.
//   BIG_MB: the default size limit of a file, in MB      isRootImage(rel, allow) -> a working screenshot in the repo root
import { matchesAny } from './glob.mjs';
/** The default limit of one file, in MB (layout.json guards.repoLitter.maxFileMb replaces it). */
export const BIG_MB = 10;
const KEPT_IMAGE = /^(favicon|apple-touch-icon|logo|icon|og-image|social|android-chrome|mstile|safari-pinned)/i;
/** True for an image or a video loose in the repo root that is no favicon or logo and no file the project allows. */
export const isRootImage = (rel, allow) => /^[^/]+\.(png|jpe?g|gif|webp|bmp|mov|mp4)$/i.test(rel) && !KEPT_IMAGE.test(rel) && !matchesAny(rel, allow);
