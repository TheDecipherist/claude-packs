// The one short hash (typescript order W2.5; the base-hooks survey counted nine `createHash('sha1')...slice(0, n)` copies: a
// cache file's name, a refusal's id, a shape's id). A name or an id, never a security check: sha1 is kept so every id the kit
// has already written (refusal ids in logs, index files in the temp folder) stays the same.
import { createHash } from 'node:crypto';

/** The first `length` hex digits of the text's sha1 (the whole 40 when no length is given). */
export function shortHash(text: string, length = 40): string {
  return createHash('sha1').update(text).digest('hex').slice(0, length);
}
