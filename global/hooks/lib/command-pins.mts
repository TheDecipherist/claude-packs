// The pins an install command adds, and the folder it runs in: `npm install x@1`, `pip install y==2`, `cargo add z`, `go get w`.
import { resolve } from 'node:path';
import type { Pin } from './manifest-pins.mts';

// A shell redirection is never a package: `2>&1`, `&>log`, `>/dev/null`, `> out.txt`, `< in`, and a
// trailing `&` (0.5.x read `2>&1` as a package named "2" at version "&1" and refused the command).
const REDIRECT = /(?:^|\s)(?:\d*|&)(?:>>?|<)(?:&\d+|&-|\s*[^\s&|;<>]+)?|\s&(?=\s|$)/g;

// A heredoc's body is text, never a command (KWB-3: a script fed to python3 <<'EOF' that held the words
// "npm install x" in a comment was read as forty installs).
const HEREDOC = /<<-?\s*(['"]?)([A-Za-z_][\w-]*)\1[^\n]*\n[\s\S]*?\n\s*\2\s*(?=\n|$)/g;
const PREFIX = /^(sudo|env|command|time|nohup|npx|[A-Za-z_]\w*=\S*)$/;
const SEGMENTS = /&&|\|\||;|\||\n/;

/** A path that starts at a shell variable or at home (`$T/x.tgz`, `${DIR}/y.tgz`, `~/z.tgz`) is a file, never a package (KWB-171). */
const isShellPath = (word: string): boolean => /^(?:\$|~)/.test(word) && word.includes('/');

/** Package names added by an install command (the install is the command itself, never a word an echo prints). */
export function pinsFromCommand(cmd: string): Pin[] {
  const found: Pin[] = [];
  for (const seg of cmd.replace(HEREDOC, ' ').split(SEGMENTS)) {
    const words = seg.replace(REDIRECT, ' ').trim().split(/\s+/);
    let lead = 0;
    while (lead < words.length && PREFIX.test(words[lead] ?? '')) lead += 1;
    const w0 = words[lead] ?? '';
    const w1 = words[lead + 1] ?? '';
    const installs = (/^(npm|pnpm|yarn|bun)$/.test(w0) && /^(i|install|add)$/.test(w1)) || (/^(pip|pip3|uv|poetry)$/.test(w0) && /^(install|add)$/.test(w1)) || (w0 === 'cargo' && w1 === 'add') || (w0 === 'go' && w1 === 'get');
    if (!installs) continue;
    for (const w of words.slice(lead + 2)) {
      if (w.startsWith('-') || w === 'pip' || w.startsWith('.') || w.startsWith('/') || isShellPath(w)) continue;
      const m = w.match(/^(@?[^@=<>~\s]+)(?:[@=<>~]=?(.+))?$/);
      if (m?.[1] && !/^(-r|requirements)/.test(m[1])) found.push({ name: m[1], version: m[2] ?? '(unpinned)' });
    }
  }
  return found;
}

/** The folder an install in `cmd` runs in: a `cd <dir>` before it moves it (KWB-3: `cd <scratch repo> && npm install x`
 *  was judged by the session folder's docs/versions.md, so a pin in a repo that had its row was refused). `home` is where
 *  `~` and `$HOME` lead, as the caller read it. */
export function installDir(cmd: string, cwd: string, home: string | undefined): string {
  let here = cwd;
  for (const seg of cmd.replace(HEREDOC, ' ').split(SEGMENTS)) {
    const m = seg.trim().match(/^(?:cd|pushd)\s+(['"]?)([^'"\s]+)\1$/);
    if (m?.[2]) { here = resolve(here, m[2].replace(/^(~|\$HOME|\$\{HOME\})(?=\/|$)/, home ?? '~')); continue; }
    if (pinsFromCommand(seg).length) return here;
  }
  return here;
}
