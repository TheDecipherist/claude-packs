// edit-window: the part of a prose text an edit changed, with a little context, so a hook that judges what an edit adds reads that
// window and not the whole document twice (KWB-next: shape-law 52 ms warm per edit on a 51 KB bug log, 315 ms on one append to a log).
// Prose only: in code an alias set far above a line changes what the line means.

const APPEND_CONTEXT = 40;
/** At most this many characters of context on each side of an edit, and never fewer than CONTEXT_MIN lines (editWindow). */
const CONTEXT_CHARS = 4000;
const CONTEXT_MIN = 3;

/** What an edit to prose adds, judged on a window: the lines it changed, with APPEND_CONTEXT lines of context on each side, before and
 *  after. An append to a log cost three hooks its whole length twice (315 ms on one `cat >>`), and an edit in place mid-document cost
 *  shape-law 52 ms warm on a 51 KB bug log (supernova2_monitor, KWB-next): the lines both texts share at the start and the end are
 *  left out. Prose only (`window`): in code an alias set far above a line changes what the line means. */
export function editWindow(before: string, after: string): { before: string; after: string; offset: number } | null {
  if (before === after) return null;
  const was = before.split('\n');
  const now = after.split('\n');
  let head = 0;
  while (head < was.length && head < now.length && was[head] === now[head]) head += 1;
  let tail = 0;
  while (tail < was.length - head && tail < now.length - head && was[was.length - 1 - tail] === now[now.length - 1 - tail]) tail += 1;
  // the context: APPEND_CONTEXT lines, fewer where the lines are long (a bug log's rows run to a few thousand characters each), never under
  // CONTEXT_MIN; the finder's only state across prose lines is a hand-written list, a few lines long
  const reach = (from: number, step: number, limit: number): number => {
    let n = 0;
    let chars = 0;
    while (n < limit && n < APPEND_CONTEXT && (n < CONTEXT_MIN || chars < CONTEXT_CHARS)) { chars += (now[from + step * n] ?? '').length + 1; n += 1; }
    return n;
  };
  const offset = head - reach(head - 1, -1, head);
  const keep = tail - reach(now.length - tail, 1, tail);
  const kept = { before: was.slice(offset, was.length - keep).join('\n'), after: now.slice(offset, now.length - keep).join('\n') };
  return kept.after.length * 2 < after.length ? { ...kept, offset } : null;
}

