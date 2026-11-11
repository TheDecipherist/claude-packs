// identifier-runs: an identifier's parts, and each run of two or three consecutive parts joined (KWB-93).
// A concept's word of two parts (patternSlot, kept lowercased whole as "patternslot") is one run of PatternSlot's parts
// ("pattern", "slot"), so a camelCase concept matches its own type, its arrays and its selectors.
//   withRuns(['pattern', 'slot', 'card']) -> ['pattern', 'slot', 'card', 'patternslot', 'patternslotcard', 'slotcard']
const RUN_LENGTHS: readonly number[] = [2, 3];

export function withRuns(parts: readonly string[]): string[] {
  const runs: string[] = [];
  for (let i = 0; i < parts.length; i += 1) {
    for (const n of RUN_LENGTHS) if (i + n <= parts.length) runs.push(parts.slice(i, i + n).join(''));
  }
  return [...parts, ...runs];
}
