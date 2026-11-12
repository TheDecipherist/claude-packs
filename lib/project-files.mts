// The files a project has: what git tracks or would track, else a walk that leaves out what is built or fetched. `scan`,
// `suggest` and the first install's folder finder (found-folders) all read this, so none of them imports another's module.
import type { Env } from '../packs/base/hooks/lib/types.d.mts';
import { slash, walk } from '../packs/base/hooks/lib/files.mts';
import { gitRun } from '../packs/base/hooks/lib/git-run.mts';

/** A path with a folder of this name in it is never the project's own source: git's, fetched, built, the kit's, another project's. */
export const SKIP = /(^|\/)(\.git|node_modules|dist|build|out|coverage|\.next|\.claude|_deps|JUCE|cmake-build[^/]*)(\/|$)/;

/** Every file of the project, relative to `dir` with `/` separators: git's tracked and untracked-not-ignored files, or, when
 *  `dir` is not a git repo, a walk that skips `SKIP`. */
export function filesOf(dir: string, env: Env = process.env): string[] {
  const listed = gitRun(['ls-files', '-co', '--exclude-standard', '-z'], { cwd: dir, env });
  if (listed.ok) return listed.stdout.split('\0').filter(Boolean);
  return walk(dir, (name) => SKIP.test(name)).map((abs) => slash(abs.slice(dir.length + 1)));
}
