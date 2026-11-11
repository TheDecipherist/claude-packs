// Tiny glob matcher (no dependencies): supports **, *, ? and {a,b}. Paths use "/".
// The CLI imports this file from a project's installed hooks (InstalledGlobModule in types.d.mts): keep both exports.
const cache = new Map();
const ONE_CHAR = { '*': '[^/]*', '?': '[^/]' }; // a lone * stays inside one folder; ? is one character
function escape(s) {
    return s.replace(/[.+^$()|[\]\\]/g, '\\$&');
}
export function globToRegExp(glob) {
    const known = cache.get(glob);
    if (known)
        return known;
    let re = '';
    for (let i = 0; i < glob.length; i += 1) {
        const c = glob.charAt(i);
        if (c === '*' && glob[i + 1] === '*') {
            const slash = glob[i + 2] === '/';
            re += slash ? '(?:.*/)?' : '.*';
            i += slash ? 2 : 1;
        }
        else if (c === '{') {
            const end = glob.indexOf('}', i);
            re += `(?:${glob.slice(i + 1, end).split(',').map(escape).join('|')})`;
            i = end;
        }
        else
            re += Object.hasOwn(ONE_CHAR, c) ? (ONE_CHAR[c] ?? escape(c)) : escape(c);
    }
    const compiled = new RegExp(`^${re}$`);
    cache.set(glob, compiled);
    return compiled;
}
// Match against a project-relative path; a leading "**/" also matches files at the root.
export function matchesAny(relPath, globs) {
    const p = relPath.replace(/\\/g, '/').replace(/^\.\//, '');
    return globs.some((g) => globToRegExp(g).test(p));
}
