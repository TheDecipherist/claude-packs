// git-parts: a shell command's git and gh calls, each with the folder it runs in (a `cd` before it, or `git -C`), for git-guard:
// its laws judge each part where it runs, and a push is marked seen in the repo it ran in (KWB-233: a push from another repo,
// `cd ~/projects/claude-packs && git push <token URL>`, was marked in the project's repo, and git-guard then counted the pushed
// commit unpushed). Quoted text and heredoc bodies are never parts.
import { homedir } from 'node:os';
import { normalize, resolve } from 'node:path';
import { blankQuotes, dropHeredocs } from './shell-lex.mts';

/** One git or gh call: its words, its wrappers and assignments left off, and the folder it runs in. */
export interface GitPart { here: string; w: string[] }

const expand = (p: string): string => p.replace(/^\$HOME(?=\/|$)/, '~').replace(/^~(?=\/|$)/, homedir());

/** A program word's last path part: `/usr/bin/git` is `git`. */
export const baseName = (word: string | undefined): string => (word ?? '').split('/').pop() ?? '';

const WRAPPERS = ['env', 'command', 'time', 'nohup', 'exec'];

/** Every git and gh call of a command, in order, each with the folder its `cd`s and `git -C` put it in. */
export function gitParts(cmd: string, cwd: string): GitPart[] {
  const body = blankQuotes(dropHeredocs(cmd));
  const parts: GitPart[] = [];
  let here = cwd;
  for (const part of body.split(/&&|\|\||;|\||\n|\(|\)|\x60|\$\(/)) {
    let w = part.trim().split(/\s+/).filter(Boolean);
    if (w.length >= 2 && w[0] === 'cd' && w[1] !== "''") {
      here = normalize(resolve(here, expand(w[1] ?? '')));
      continue;
    }
    if (w.length >= 3 && baseName(w[0]) === 'git' && w[1] === '-C' && w[2] !== "''") here = normalize(resolve(here, expand(w[2] ?? '')));
    while (w.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0] ?? '') || WRAPPERS.includes(w[0] ?? ''))) w = w.slice(1);
    if (!w.length || !['git', 'gh'].includes(baseName(w[0]))) continue;
    parts.push({ here, w });
  }
  return parts;
}

/** The folders a command's pushes run in, each once. */
export function pushDirs(cmd: string, cwd: string): string[] {
  const dirs = gitParts(cmd, cwd).filter(({ w }) => baseName(w[0]) === 'git' && w.includes('push')).map(({ here }) => here);
  return [...new Set(dirs)];
}
