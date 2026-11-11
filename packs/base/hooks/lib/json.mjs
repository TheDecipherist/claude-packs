// The one place the kit turns values into JSON and back (KWB-146; the user: "if we enforce DRY why hasnt one function been
// made to safely do a JSON.stringify?", "and it should be safe with a proper try/catch handler as well"). Nothing here
// throws: JSON.stringify throws on a circular reference, a BigInt and a toJSON that throws, and writes an Error as {};
// JSON.parse throws on any bad text. Each case is handled once, here, and every other file calls these.
import { renameSync, writeFileSync } from 'node:fs';
import { readText } from './shell-writes.mjs';

/** A replacer that never throws: a circular reference becomes "[Circular]", a BigInt its digits, an Error its fields. */
function safeReplacer() {
  const seen = new WeakSet();
  return function replace(_key, value) {
    if (typeof value === 'bigint') return value.toString();
    if (value instanceof Error) return { name: value.name, message: value.message, ...(value.code ? { code: value.code } : {}) };
    if (value && typeof value === 'object') {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
    }
    return value;
  };
}

/** A value as JSON text, `pretty` indented by two; never throws. What cannot be written at all gives `fallback` ('null'). */
export function toJson(value, { pretty = false, fallback = 'null' } = {}) {
  const indent = pretty ? 2 : undefined;
  try {
    return JSON.stringify(value, safeReplacer(), indent) ?? fallback;   // undefined, a function or a symbol has no JSON
  } catch {
    // a toJSON that throws: the value's own data, without its methods
    try { return JSON.stringify(plainCopy(value, new WeakSet()), safeReplacer(), indent) ?? fallback; } catch { return fallback; }
  }
}

/** The value's own data, every method (a toJSON among them) left out, a circle cut: what a throwing toJSON hid. */
function plainCopy(value, seen) {
  if (!value || typeof value !== 'object' || value instanceof Error) return value;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (Array.isArray(value)) return value.map((v) => plainCopy(v, seen));
  return Object.fromEntries(Object.entries(value).filter(([, v]) => typeof v !== 'function').map(([k, v]) => [k, plainCopy(v, seen)]));
}

/** JSON text as a value, or `fallback` (null) when it is empty or not JSON; never throws. */
export function parseJson(text, fallback = null) {
  if (typeof text !== 'string' || text.trim() === '') return fallback;
  try { return JSON.parse(text); } catch { return fallback; }
}

/** A JSON file as a value, or `fallback` (null) when it is missing, unreadable or not JSON; never throws. */
export const readJson = (file, fallback = null) => parseJson(readText(file), fallback);

/** A value written to a JSON file whole (through a part file and a rename, so a reader never sees half of it), with a
 *  newline at the end. True when written; false when the folder or the disk refused it, never a throw. */
export function writeJson(file, value, { pretty = false } = {}) {
  const part = `${file}.${process.pid}.part`;
  try {
    writeFileSync(part, `${toJson(value, { pretty })}\n`);
    renameSync(part, file);
    return true;
  } catch { return false; }
}
