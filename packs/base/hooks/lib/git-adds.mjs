// The `git add` calls in a shell command, with the folder each runs in and its arguments. secrets-guard and repo-litter both judge these.
//   gitAdds(command, cwd) -> [{ dir, args }]
import { resolve } from 'node:path';

export function gitAdds(command, cwd) {
  const body = command.replace(/<<-?\s*['"]?(\w+)['"]?[\s\S]*?\n\1\b/g, '');
  const out = [];
  for (const part of body.split(/&&|\|\||;|\|/)) {
    const w = part.trim().split(/\s+/);
    if (w[0] !== 'git') continue;
    let at = 1;
    let dir = cwd;
    while (at < w.length && w[at].startsWith('-')) {
      if (w[at] === '-C') dir = resolve(dir, w[at + 1] ?? '.');
      at += ['-C', '-c'].includes(w[at]) ? 2 : 1;
    }
    if (w[at] === 'add') out.push({ dir, args: w.slice(at + 1) });
  }
  return out;
}
