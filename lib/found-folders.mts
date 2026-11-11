// What a first install learns from the project: the folders its source already lives in. A layout written from a template alone leaves them out, and then
// folder-law refuses a new file in the project's own folder (KWB-83). Only the top level: `lib/`, never `lib/net/`.
import { SOURCE } from '../packs/base/hooks/lib/dup.mts';
import { isContent } from '../packs/base/hooks/lib/content.mts';
import type { Configuration, Layout, Logger } from '../packs/base/hooks/lib/types.d.mts';
import { filesOf } from './project-files.mts';

// Not the project's own source: hidden folders, what is built or fetched, what is another project's, and folders the layout already has by name.
const NOT_THE_PROJECTS = /^(?:\..*|node_modules|vendor|third_party|thirdparty|external|extern|deps|target|build|out|dist|coverage|JUCE|cmake-build.*|docs|tools)$/;

/** The top-level folders the project's source files are in, sorted, without the ones that are not its own or are `known`. */
export function foundFolders(projectDir: string, sourceFiles: string | undefined, known: readonly string[] = []): string[] {
  const source = sourceFiles ? new RegExp(sourceFiles, 'i') : SOURCE;
  const folders = filesOf(projectDir).filter((f) => f.includes('/') && source.test(f) && !isContent(f)).map((f) => f.split('/')[0] ?? f);
  return [...new Set(folders)].filter((f) => !NOT_THE_PROJECTS.test(f) && !known.includes(f)).sort();
}

/** A seed layout with those folders in it. A complete layout has been fitted by hand, and stays as it is. */
export function withFoundFolders(projectDir: string, seed: Partial<Layout> | null, config: Configuration, log: Logger): Partial<Layout> | null {
  if (seed?.complete) return seed;
  const known = Object.values({ ...config.layout?.folders, ...seed?.folders }).map((f) => f.path.split('/')[0] ?? f.path);
  const found = foundFolders(projectDir, config.sourceFiles, known);
  if (!found.length) return seed;
  log(`  layout: your source is in ${found.map((f) => `${f}/`).join(', ')}, so the layout has ${found.length > 1 ? 'them' : 'it'}`);
  const folders = Object.fromEntries(found.map((f) => [f, { path: f, purpose: 'source, found at install' }]));
  return { ...seed, folders: { ...folders, ...seed?.folders } };
}
