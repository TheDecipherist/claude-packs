// The one place the kit turns values into JSON and back (KWB-146; the user: "if we enforce DRY why hasnt one function been
// made to safely do a JSON.stringify?", "and it should be safe with a proper try/catch handler as well"). Nothing here
// throws: JSON.stringify throws on a circular reference, a BigInt and a toJSON that throws, and writes an Error as {};
// JSON.parse throws on any bad text. Each case is handled once, here, and every other file calls these. A leaf but for the
// file reader (typescript order W2.10: readText moved out of shell-writes into files.mts).
import { renameSync, writeFileSync } from 'node:fs';
import { readText } from './files.mjs';
/** An Error as the fields JSON can hold: its name, its message and its code when it has one. */
function errorFields(error) {
    const code = 'code' in error ? error.code : undefined;
    return { name: error.name, message: error.message, ...(code ? { code } : {}) };
}
/** A replacer that never throws: a circular reference becomes "[Circular]", a BigInt its digits, an Error its fields. A
 *  circle is an object inside itself, on its own path from the top; one object written twice side by side (three runs that
 *  share one steps list) is no circle, and is written in full each time. `this` is the object that holds `key`, so the path
 *  is cut back to it before each value. */
function safeReplacer() {
    const path = [];
    return function replace(_key, value) {
        if (typeof value === 'bigint')
            return value.toString();
        if (value instanceof Error)
            return errorFields(value);
        if (!value || typeof value !== 'object')
            return value;
        while (path.length > 0 && path.at(-1) !== this)
            path.pop();
        if (path.includes(value))
            return '[Circular]';
        path.push(value);
        return value;
    };
}
/** A value as JSON text, `pretty` indented by two; never throws. What cannot be written at all gives `fallback` ('null'). */
export function toJson(value, { pretty = false, fallback = 'null' } = {}) {
    const indent = pretty ? 2 : undefined;
    try {
        return JSON.stringify(value, safeReplacer(), indent) ?? fallback; // undefined, a function or a symbol has no JSON
    }
    catch {
        // a toJSON that throws: the value's own data, without its methods
        try {
            return JSON.stringify(plainCopy(value, new Set()), safeReplacer(), indent) ?? fallback;
        }
        catch {
            return fallback;
        }
    }
}
/** The value's own data, every method (a toJSON among them) left out, a circle cut: what a throwing toJSON hid. `path`
 *  holds the objects above this one, so only an object inside itself is a circle, as in safeReplacer. */
function plainCopy(value, path) {
    if (!value || typeof value !== 'object' || value instanceof Error)
        return value;
    if (path.has(value))
        return '[Circular]';
    path.add(value);
    const copy = Array.isArray(value) ? value.map((v) => plainCopy(v, path))
        : Object.fromEntries(Object.entries(value).filter(([, v]) => typeof v !== 'function').map(([k, v]) => [k, plainCopy(v, path)]));
    path.delete(value);
    return copy;
}
/** Whether a value is a plain object: not an array, not null, not a scalar. The one guard; every reader of untrusted JSON calls it. */
export const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
/** A value as an object, or null when it is an array, a scalar or nothing. */
export const asRecord = (value) => (isRecord(value) ? value : null);
/** JSON text as a value, or `fallback` (null) when it is empty or not JSON; never throws. The caller names the shape it
 *  reads and narrows what it uses of it: the text is outside data, and this is the one place it becomes a shape. */
export function parseJson(text, fallback = null) {
    if (typeof text !== 'string' || text.trim() === '')
        return fallback;
    try {
        return JSON.parse(text);
    }
    catch {
        return fallback;
    }
}
/** A JSON file as a value, or `fallback` (null) when it is missing, unreadable or not JSON; never throws. */
export function readJson(file, fallback = null) {
    return parseJson(readText(file), fallback);
}
/** A value written to a JSON file whole (through a part file and a rename, so a reader never sees half of it), with a
 *  newline at the end. True when written; false when the folder or the disk refused it, never a throw. */
export function writeJson(file, value, { pretty = false } = {}) {
    const part = `${file}.${process.pid}.part`;
    try {
        writeFileSync(part, `${toJson(value, { pretty })}\n`);
        renameSync(part, file);
        return true;
    }
    catch {
        return false;
    }
}
