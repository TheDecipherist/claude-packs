---
# concepts: js
paths:
  - "src/**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}"
  - "tests/**/*.{js,mjs,cjs,ts,tsx,mts,cts}"
  - "test/**/*.{js,mjs,cjs,ts,tsx,mts,cts}"
---

# JSON goes in and out through one helper; a logger never throws

`JSON.stringify` **throws** on a circular reference, a `BigInt` or a `toJSON()` that throws. It silently turns an `Error` into `{}` and drops `undefined`. `JSON.parse` throws on any bad input. Data typed `unknown` (log fields, request bodies, Mongo documents, API responses) can contain any of these. A raw call is a crash waiting for the one value that triggers it, and a logger that crashes takes the request down with it.

<constraints>
Always do:
- **Logs:** use the structured logger, never `console` plus `JSON.stringify`. In Fastify that is pino: `request.log` / `fastify.log`, `log.info({ fields }, 'message')`, with errors under the `err` key so pino records name, message and stack. Pino serializes safely and never throws on odd values.
- **Everything else:** one file per project, `lib/json.ts` (create it if the project has none), holds the only `JSON.parse` and `JSON.stringify` calls:
  - `toJson(value)` uses `safe-stable-stringify`: circular references become `"[Circular]"`, `BigInt` becomes a string, `Error` becomes `{ name, message, stack, cause }`. It returns a string and never throws.
  - `parseJson(text, schema)` wraps `JSON.parse` in `try` and validates with the Zod schema. It returns `{ ok: true, value } | { ok: false, error }` and never throws.
- Check the current version of `safe-stable-stringify` and `pino` with `latest-versions` before adding them.

Never do:
- Call `JSON.parse` or `JSON.stringify` anywhere but `lib/json.ts` (tests and config files excepted). The `json-only-through-helper` check refuses it.
- Write a logger, error handler or response path that can throw. If logging fails, the request must still finish.
</constraints>

```ts
// NO: throws on a BigInt, a circular object or a throwing toJSON; turns errors into {}
export function logLine(level: 'info' | 'warn' | 'error', fields: Record<string, unknown>): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, service: 'admiralmcp-api', ...fields }));
}

// YES, in a Fastify service: the framework's logger
const app = Fastify({ logger: { base: { service: 'admiralmcp-api' } } });
request.log.warn({ jobId, err }, 'job retry');

// YES, outside Fastify: lib/json.ts is the only file that touches JSON
import { configure } from 'safe-stable-stringify';
const stringify = configure({ bigint: true, circularValue: '[Circular]' });
const errorsAsObjects = (_k: string, v: unknown) =>
  v instanceof Error ? { name: v.name, message: v.message, stack: v.stack, cause: v.cause } : v;

export function toJson(value: unknown): string {
  try {
    return stringify(value, errorsAsObjects) ?? 'null';
  } catch (err) {
    return `{"unserializable":true,"reason":${JSON.stringify(String(err))}}`;
  }
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };
export function parseJson<T>(text: string, schema: z.ZodType<T>): Parsed<T> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    return { ok: false, error: `not JSON: ${err instanceof Error ? err.message : String(err)}` };
  }
  const r = schema.safeParse(raw);
  return r.success ? { ok: true, value: r.data } : { ok: false, error: r.error.message };
}
```

## Check
`.claude/checks/json-only-through-helper.json` refuses an edit that adds `JSON.parse(` or `JSON.stringify(` outside `**/lib/json.*`, tests and config files. If a raw call slips in by another route (`Response.json()` on unknown input, `structuredClone` of an unknown value, a `toJSON` that throws), add that shape to the check.
Lesson check for this rule: `json-only-through-helper`.
