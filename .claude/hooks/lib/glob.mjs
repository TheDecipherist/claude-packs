// Tiny glob matcher (no dependencies): supports **, *, ? and {a,b}. Paths use "/".
// The CLI imports this file from a project's installed hooks (InstalledGlobModule in types.d.mts): keep both exports.
const cache = new Map();
const ONE_CHAR = { '*': '[^/]*', '?': '[^/]' }; // a lone * stays inside one folder; ? is one character
function escape(s) {
    return s.replace(/[.+^$()|[\]\\]/g, '\\$&');
}
/** `s` as text a RegExp matches literally: the one owner of the escape (shape, git-guard and git-auth each had a copy). */
export function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
// KWB-198: a glob that names TypeScript (`*.ts`, or a brace with `ts` in it) names the module forms too, `.mts` and `.cts`: one rule, applied where a layout's
// concepts become globs (a rule's `paths:`) and where a check's globs and excludes are read, so no pack lists the two forms by hand.
// `.tsx` has no module form, and a glob that ends in anything else is left as it is.
const MODULE_FORMS = ['mts', 'cts'];
/** `glob` and its `.mts`/`.cts` twins, when it ends in `.ts` or in a brace that lists `ts`; else `glob` alone. */
export function withModuleForms(glob) {
    if (glob.endsWith('.ts'))
        return [glob, ...MODULE_FORMS.map((form) => `${glob.slice(0, -2)}${form}`)];
    const brace = /^(.*\.\{)([^}]*)\}$/.exec(glob);
    if (!brace)
        return [glob];
    const items = (brace[2] ?? '').split(',');
    if (!items.includes('ts'))
        return [glob];
    return [`${brace[1] ?? ''}${[...items, ...MODULE_FORMS.filter((form) => !items.includes(form))].join(',')}}`];
}
/** Every glob of the list with its module forms, once each, in order. */
export function allWithModuleForms(globs) {
    return [...new Set(globs.flatMap(withModuleForms))];
}
