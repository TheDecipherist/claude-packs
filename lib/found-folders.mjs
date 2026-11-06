// What a first install learns from the project: the folders its source already lives in. A layout written from a template alone leaves them out, and then
// folder-law refuses a new file in the project's own folder (KWB-83). Only the top level: `lib/`, never `lib/net/`.
import { SOURCE } from '../packs/base/hooks/lib/dup.mjs';
import { isContent } from '../packs/base/hooks/lib/content.mjs';
import { filesOf } from './scan.mjs';

// Not the project's own source: hidden folders, what is built or fetched, what is another project's, and folders the layout already has by name.
const NOT_THE_PROJECTS = /^(?:\..*|node_modules|vendor|third_party|thirdparty|external|extern|deps|target|build|out|dist|coverage|JUCE|cmake-build.*|docs|tools)$/;

export function foundFolders(projectDir, sourceFiles, known = []) {
  const source = sourceFiles ? new RegExp(sourceFiles, 'i') : SOURCE;
  const folders = filesOf(projectDir).filter((f) => f.includes('/') && source.test(f) && !isContent(f)).map((f) => f.split('/')[0]);
  return [...new Set(folders)].filter((f) => !NOT_THE_PROJECTS.test(f) && !known.includes(f)).sort();
}

// A seed layout with those folders in it. A complete layout has been fitted by hand, and stays as it is.
export function withFoundFolders(projectDir, seed, config, log) {
  if (seed?.complete) return seed;
  const known = Object.values({ ...config.layout?.folders, ...seed?.folders }).map((f) => f.path.split('/')[0]);
  const found = foundFolders(projectDir, config.sourceFiles, known);
  if (!found.length) return seed;
  log(`  layout: your source is in ${found.map((f) => `${f}/`).join(', ')}, so the layout has ${found.length > 1 ? 'them' : 'it'}`);
  const folders = Object.fromEntries(found.map((f) => [f, { path: f, purpose: 'source, found at install' }]));
  return { ...seed, folders: { ...folders, ...seed?.folders } };
}
