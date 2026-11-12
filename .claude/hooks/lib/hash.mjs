// The one short hash (typescript order W2.5; the base-hooks survey counted nine `createHash('sha1')...slice(0, n)` copies: a
// cache file's name, a refusal's id, a shape's id). A name or an id, never a security check: sha1 is kept so every id the kit
// has already written (refusal ids in logs, index files in the temp folder) stays the same.
// `sha256` is the other one: the digest of whole text or file bytes (a key naming a file in a shared folder, a file's hash in the
// lock), and `tmpKeyed` the temp-folder path a project's path or url is turned into (W10 review, finding 6).
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
/** The first `length` hex digits of the text's sha1 (the whole 40 when no length is given). */
export function shortHash(text, length = 40) {
    return createHash('sha1').update(text).digest('hex').slice(0, length);
}
/** The first `length` hex digits of the sha256 of text or bytes (the whole 64 when no length is given). */
export function sha256(data, length = 64) {
    return createHash('sha256').update(data).digest('hex').slice(0, length);
}
/** A path in the temp folder named by a key: `<prefix><12 hex digits of the key's sha256><suffix>`, the same key always the same path. */
export function tmpKeyed(prefix, key, suffix = '') {
    return join(tmpdir(), `${prefix}${sha256(key, 12)}${suffix}`);
}
