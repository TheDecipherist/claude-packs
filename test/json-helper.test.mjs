// KWB-146: the one JSON helper (packs/base/hooks/lib/json.mjs) never throws, and handles once each case a raw call gets wrong.
import { assert, existsSync, fresh, join, test, writeFileSync } from './kit-cli.mjs';
import { parseJson, readJson, toJson, writeJson } from '../packs/base/hooks/lib/json.mjs';

test('toJson writes what JSON.stringify throws on or loses: a circle, a BigInt, an Error, a toJSON that throws', () => {
  const circle = { name: 'a' };
  circle.self = circle;
  assert.equal(toJson(circle), '{"name":"a","self":"[Circular]"}');
  assert.equal(toJson({ n: 12345678901234567890n }), '{"n":"12345678901234567890"}');
  assert.equal(toJson({ err: Object.assign(new Error('disk full'), { code: 'ENOSPC' }) }), '{"err":{"name":"Error","message":"disk full","code":"ENOSPC"}}');
  assert.equal(toJson({ a: 1, toJSON() { throw new Error('no'); } }), '{"a":1}');
});

test('toJson gives its fallback for a value with no JSON, and indents when asked', () => {
  assert.equal(toJson(undefined), 'null');
  assert.equal(toJson(() => 1, { fallback: '' }), '');
  assert.equal(toJson({ a: [1] }, { pretty: true }), '{\n  "a": [\n    1\n  ]\n}');
});

test('parseJson and readJson give the fallback for empty, broken or missing input, never a throw', () => {
  assert.deepEqual(parseJson('{"a":1}'), { a: 1 });
  assert.equal(parseJson('{ not json'), null);
  assert.equal(parseJson('', 'none'), 'none');
  assert.equal(parseJson(undefined, 0), 0);
  const dir = fresh('json-');
  writeFileSync(join(dir, 'broken.json'), '{"a":');
  assert.equal(readJson(join(dir, 'broken.json'), 'x'), 'x');
  assert.equal(readJson(join(dir, 'missing.json')), null);
});

test('writeJson writes the file whole, leaves no part file, and says false where it cannot write', () => {
  const dir = fresh('json-');
  const file = join(dir, 'out.json');
  assert.equal(writeJson(file, { a: 1 }, { pretty: true }), true);
  assert.deepEqual(readJson(file), { a: 1 });
  assert.equal(existsSync(`${file}.${process.pid}.part`), false);
  assert.equal(writeJson(join(dir, 'no', 'such', 'folder.json'), { a: 1 }), false);
});
