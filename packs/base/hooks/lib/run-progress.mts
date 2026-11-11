// What a work order's progress is made of (split from run-status, 1.7.3): its steps and their items from workorder.md, the
// items seen in progress lines, and the percent and bar a step or an order is drawn with. The unit is the item: a step's
// numbered items plus one for its Done when.

export const ID = String.raw`[A-Z]+\d+[a-z]?`;   // W3, W3b, L5: any order's step ids
const STEP = new RegExp(String.raw`^## (${ID})\. (.+?)\s*$`, 'gm');

/** One step of an order. */
export interface OrderStep { id: string; title: string; items: number }
/** A step with its count so far and the agent that owns it. */
export interface Step extends OrderStep { done: number; agent: string | null }

/** The order's steps from workorder.md: [{ id, title, items }], items its numbered lines plus its Done when. */
export function stepsOf(workorderText: string): OrderStep[] {
  const heads = [...workorderText.matchAll(STEP)];
  return heads.map((m, i) => {
    const body = workorderText.slice(m.index + m[0].length, heads[i + 1]?.index ?? workorderText.length);
    return { id: m[1] ?? '', title: (m[2] ?? '').replace(/\*\*\[.*?\]\*\*/g, '').trim(), items: (body.match(/^\d+\. /gm) ?? []).length + 1 };
  });
}

/** From progress lines: the item numbers seen per step, and the steps a line calls done. */
export function progressOf(lines: readonly string[]): { seen: Record<string, Set<number>>; done: Set<string> } {
  const seen: Record<string, Set<number>> = {};
  const done = new Set<string>();
  for (const line of lines) {
    for (const [, id, item] of line.matchAll(new RegExp(String.raw`\b(${ID})\.(\d+)\b`, 'g'))) if (id) (seen[id] ??= new Set()).add(Number(item));
    for (const [, id] of line.matchAll(new RegExp(String.raw`\b(${ID})(?: measured,)? done\b`, 'g'))) if (id) done.add(id);
  }
  return { seen, done };
}

export const percent = (done: number, items: number): number => (items ? Math.round((1000 * done) / items) / 10 : 0);

/** A bar's cells for a percent, [filled, empty]: `status` and the status line draw the same rounding. */
export function barCells(p: number, width: number): [number, number] {
  const full = Math.round((Math.max(0, Math.min(100, p || 0)) / 100) * width);
  return [full, width - full];
}

/** A percent as the bar's label, `  7%`, ` 47%`, `100%`. */
export const percentLabel = (p: number): string => `${String(Math.round(p || 0)).padStart(3)}%`;
