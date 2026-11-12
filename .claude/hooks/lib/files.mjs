// The one owner of the file and folder helpers that hooks, tools and the CLI share (typescript order W2.5; the repeats and
// base-hooks surveys counted readText twice, isDir twice, eight temp-folder makers, four tree walkers, two junk filters and
// four ways of reading a failed child's error). Nothing here reads the process's env or folder: a caller passes its paths.
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
const MAX_TEXT = 8 * 1024 * 1024;
// Python's byte-code caches and the Finder's files are never a project's files (a selftest run inside the package makes them).
const JUNK = /^(?:__pycache__|\.DS_Store)$|\.pyc$/;
// What only the kit's build reads: a TypeScript source (a .d.mts among them), a source map, the build's own memory (d-2), and the
// proxy's binaries (hooks/bin/OS-ARCH/): a project gets the `sh` picker, the binary goes to the user's cache (d-13).
const BUILD_ONLY = /\.(?:mts|cts|map|tsbuildinfo)$|^(?:darwin|linux)-(?:arm64|amd64)$/;
/** A file's text, or null when it is missing, not a file or larger than 8 MB; never throws. */
export function readText(path) {
    try {
        const st = statSync(path);
        if (!st.isFile() || st.size > MAX_TEXT)
            return null;
        return readFileSync(path, 'utf8');
    }
    catch {
        return null;
    }
}
/** A file written whole, its folder made first. */
export function put(file, text) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text);
}
/** A folder made with its parents; the folder. */
export function ensureDir(dir) {
    mkdirSync(dir, { recursive: true });
    return dir;
}
/** True when the path is a folder; false when it is anything else or nothing. */
export function isDir(path) {
    try {
        return statSync(path).isDirectory();
    }
    catch {
        return false;
    }
}
/** A name no walk returns by default. */
export const isJunk = (name) => JUNK.test(name);
/** A name the installer never copies into a project: junk, or what only the kit's build reads (d-2). */
export const notInstalled = (name) => JUNK.test(name) || BUILD_ONLY.test(name);
/** Every file under a folder, as absolute paths in name order, each entry `skip` names left out (a folder's whole tree with
 *  it); none when the folder is missing. */
export function walk(dir, skip = isJunk) {
    if (!isDir(dir))
        return [];
    return readdirSync(dir).filter((entry) => !skip(entry)).sort().flatMap((entry) => {
        const abs = join(dir, entry);
        return isDir(abs) ? walk(abs, skip) : [abs];
    });
}
/** A new empty folder in the system's temp folder (which honours TMPDIR), by its real path (KWB-158: macOS's /var is a link). */
export function scratchDir(prefix) {
    return realpathSync(mkdtempSync(join(tmpdir(), prefix)));
}
/** What a failed child process said, in one line: its stderr's first line, else the error's message. */
export function childError(error) {
    if (error === null || typeof error !== 'object')
        return String(error);
    const said = 'stderr' in error && error.stderr ? String(error.stderr).trim() : '';
    const message = 'message' in error ? String(error.message) : String(error);
    return (said || message).split('\n')[0]?.trim() ?? '';
}
