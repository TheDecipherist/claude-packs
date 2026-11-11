// One table of source extensions per language (typescript order W2.5): every reader that judges code builds its set from these
// rows, so a language's new extension (TypeScript's .mts and .cts, W1.6) is one edit, and no reader is left blind to it. And
// which file a build emitted: a .mjs beside its .mts is the build's output, never the repo's own second copy (KWB-170).
import { existsSync } from 'node:fs';
export const EXTS_OF = {
    c: ['.c', '.h'],
    cpp: ['.cc', '.cpp', '.cxx', '.hh', '.hpp', '.hxx', '.inc', '.inl', '.ipp', '.tpp'],
    objc: ['.m', '.mm'],
    js: ['.js', '.mjs', '.cjs', '.jsx'],
    ts: ['.ts', '.mts', '.cts', '.tsx'],
    python: ['.py'],
    rust: ['.rs'],
    go: ['.go'],
    swift: ['.swift'],
    java: ['.java'],
    kotlin: ['.kt'],
    csharp: ['.cs'],
    shader: ['.wgsl', '.metal', '.hlsl', '.glsl', '.vert', '.frag'],
    shell: ['.sh', '.bash'],
    cmake: ['.cmake'],
    markup: ['.html', '.htm', '.vue', '.svelte'],
};
/** Every extension of the named languages, as one set. */
export function extsOf(...languages) {
    return new Set(languages.flatMap((language) => EXTS_OF[language]));
}
/** A regex that matches a path ending in any extension of the named languages, any case. */
export function extPattern(...languages) {
    const alternatives = [...extsOf(...languages)].map((ext) => ext.slice(1)).join('|');
    return new RegExp(`\\.(?:${alternatives})$`, 'i');
}
// What tsc emits from each TypeScript source extension (d-2: beside it, the same name).
const EMITTED_FROM = { '.mjs': ['.mts'], '.cjs': ['.cts'], '.js': ['.ts', '.tsx'] };
/** The TypeScript source a .mjs, .cjs or .js was emitted from, when one stands beside it; null for a hand-written file. */
export function emittedFrom(path, exists = existsSync) {
    const ext = Object.keys(EMITTED_FROM).find((e) => path.endsWith(e));
    if (ext === undefined)
        return null;
    const stem = path.slice(0, -ext.length);
    for (const source of EMITTED_FROM[ext] ?? [])
        if (exists(stem + source))
            return stem + source;
    return null;
}
