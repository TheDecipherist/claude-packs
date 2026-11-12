// git-config: a repo's remotes and branch upstreams read from the config files, with no git process (commit-cost: a commit asked git
// for `config branch.X.remote`, `config branch.X.merge`, `remote get-url` twice and `rev-parse --git-common-dir`, five processes at
// 30 to 80 ms each on a loaded machine). The files read are the repo's own config, the user's ~/.gitconfig and the XDG one, later
// over earlier, as git reads them. A config git would read differently is not read at all and the caller asks git: any `include`
// or `includeIf`, any `insteadOf` or `pushInsteadOf` (a URL git rewrites), a worktree config file, a header or a value in a form
// this does not parse (a quote, a backslash, a comment mark in a value), and a GIT_DIR or GIT_CONFIG* in the environment. The
// system config (/etc/gitconfig) is not read: it holds a distribution's defaults, never a project's remotes.
//   gitConfigRead(dir, env) -> { get(section, subsection, key) } | null     null: ask git
import { join } from 'node:path';
import { readText } from './files.mjs';
import { findGitDirs } from './git-files.mjs';
const HEADER = /^\[([A-Za-z0-9.-]+)(?:\s+"([^"\\]*)")?\]\s*$/;
const ENTRY = /^([A-Za-z][A-Za-z0-9-]*)\s*=\s*(.*?)\s*$/;
const REWRITES = /insteadof|^\s*\[\s*include/im;
/** One config file's entries into `into`, keyed `section.sub.key` (section and key lower case); false when git might read it differently. */
function parse(text, into) {
    if (REWRITES.test(text))
        return false;
    let prefix = '';
    for (const raw of text.split('\n')) {
        const line = raw.trim();
        if (!line || line.startsWith('#') || line.startsWith(';'))
            continue;
        if (line.startsWith('[')) {
            const m = HEADER.exec(line);
            if (!m)
                return false;
            prefix = `${(m[1] ?? '').toLowerCase()}\0${m[2] ?? ''}\0`;
            continue;
        }
        const e = ENTRY.exec(line);
        if (!e) {
            if (/^[A-Za-z][A-Za-z0-9-]*$/.test(line))
                continue;
            return false;
        } // a bare key is a true boolean: nothing here reads one
        const value = e[2] ?? '';
        if (/["\\#;]/.test(value) || !prefix)
            return false;
        into.set(`${prefix}${(e[1] ?? '').toLowerCase()}`, value);
    }
    return true;
}
export function gitConfigRead(dir, env) {
    const dirs = findGitDirs(dir, env);
    if (!dirs || Object.keys(env).some((k) => k.startsWith('GIT_CONFIG')))
        return null;
    if (readText(join(dirs.gitDir, 'config.worktree')) !== null)
        return null;
    const home = env['HOME'];
    const xdg = env['XDG_CONFIG_HOME'];
    const files = [home && join(home, '.config', 'git', 'config'), xdg && join(xdg, 'git', 'config'), home && join(home, '.gitconfig'), join(dirs.common, 'config')];
    const entries = new Map();
    for (const file of files) {
        const text = file ? readText(file) : null;
        if (text !== null && !parse(text, entries))
            return null;
    }
    return { get: (section, subsection, key) => entries.get(`${section.toLowerCase()}\0${subsection ?? ''}\0${key.toLowerCase()}`) ?? null };
}
