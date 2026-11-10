// What a repo carries that is not source: its tracked size, files too big for git, and working screenshots in its root. For `scan`; the `repo-litter`
// hook stops new ones at `git add`.
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { BIG_MB, isRootImage } from '../packs/base/hooks/repo-litter.mjs';

const MB = 1024 * 1024;

// A build folder is known by what the build leaves in it, whatever it was called: `build-reso/` held 43% of one repo's tracked files.
const BUILD_MARK = /^(.*?\/)?(?:CMakeFiles\/|CMakeCache\.txt$)/;
export function buildFolders(files) {
  const folders = new Set(files.map((f) => f.match(BUILD_MARK)).filter((m) => m?.[1]).map((m) => m[1]));
  return [...folders].filter((d) => ![...folders].some((o) => o !== d && d.startsWith(o)));
}

export function repoWeight(dir, files) {
  const sized = files.flatMap((file) => { try { return [{ file, bytes: statSync(join(dir, file)).size }]; } catch { return []; } });
  const total = sized.reduce((n, f) => n + f.bytes, 0);
  const big = sized.filter((f) => f.bytes > BIG_MB * MB).sort((a, b) => b.bytes - a.bytes).map((f) => ({ file: f.file, mb: Math.round(f.bytes / MB) }));
  const built = buildFolders(files).map((folder) => ({ folder, files: files.filter((f) => f.startsWith(folder)).length }));
  return { mb: Math.round(total / MB), big, rootImages: files.filter((f) => isRootImage(f, [])), built, files: files.length };
}

export const weightLines = (w) => [
  `- ${w.mb} MB tracked; ${w.big.length} file(s) over ${BIG_MB} MB${w.big.length ? `: ${w.big.slice(0, 5).map((b) => `${b.file} (${b.mb} MB)`).join(', ')}` : ''}`,
  ...w.built.map((b) => `- build output held in git: ${b.folder} (${b.files} of ${w.files} files), left out of this scan`),
  ...(w.rootImages.length ? [`- ${w.rootImages.length} image(s) in the repo root, which look like working screenshots: ${w.rootImages.slice(0, 5).join(', ')}`] : []),
];
