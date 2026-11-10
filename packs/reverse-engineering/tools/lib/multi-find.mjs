// multi-find: every place each of many needles sits in one buffer, found in one pass over it (KWB-120). Searching once per
// needle costs needles x bytes: thousands of names, or thousands of pointer values, over a megabyte image took hours.
// Each needle is filed under its first two bytes in a 65,536-entry table; a needle of four bytes or more is also filed under
// its first four, so a common pair of letters costs one lookup, not a list. Each position of the buffer is looked at once, and
// a needle is compared whole only where its start matches. A one-byte needle is searched the plain way.
//   findAll(buffer, needles, cap) -> one array of offsets per needle, in order, each at most `cap` long

const word = (b, at) => (b[at] | (b[at + 1] << 8) | (b[at + 2] << 16) | (b[at + 3] << 24)) >>> 0;

export function findAll(buffer, needles, cap) {
  const out = needles.map(() => []);
  const byWord = new Map();
  const byPair = new Map(); // two- and three-byte needles, under their first two bytes
  const firstTwo = new Uint8Array(65536);
  needles.forEach((needle, i) => {
    if (needle.length < 2) {
      for (let at = buffer.indexOf(needle); at !== -1 && out[i].length < cap; at = buffer.indexOf(needle, at + 1)) out[i].push(at);
      return;
    }
    const pair = needle[0] | (needle[1] << 8);
    firstTwo[pair] = 1;
    const [table, key] = needle.length >= 4 ? [byWord, word(needle, 0)] : [byPair, pair];
    if (!table.has(key)) table.set(key, []);
    table.get(key).push(i);
  });
  const take = (list, at, from) => {
    for (const i of list) {
      const needle = needles[i];
      if (out[i].length < cap && at + needle.length <= buffer.length && buffer.compare(needle, from, needle.length, at + from, at + needle.length) === 0) out[i].push(at);
    }
  };
  for (let at = 0, end = buffer.length - 1; at < end; at += 1) {
    const pair = buffer[at] | (buffer[at + 1] << 8);
    if (!firstTwo[pair]) continue;
    const short = byPair.get(pair);
    if (short) take(short, at, 2);
    if (byWord.size && at + 4 <= buffer.length) {
      const list = byWord.get(word(buffer, at));
      if (list) take(list, at, 4);
    }
  }
  return out;
}
