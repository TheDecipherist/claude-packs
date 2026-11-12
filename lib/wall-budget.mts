// The wall-time budgets of the two long commands (typescript order W8.4, d-9): `scan` 60 s and `doctor --fresh` 120 s, on the order's Mac.
// A command over its budget says so as a problem, so a slowing kit shows in the next run; a slower machine sets CLAUDE_PACKS_BUDGET_SCALE
// (a factor, 2 doubles every budget). The budget is a number in this table, never one the command reads from its own result.
export const WALL_BUDGET_S = { scan: 60, 'doctor --fresh': 120 } as const;
export type Budgeted = keyof typeof WALL_BUDGET_S;

/** The problem a command's wall time is, or null when it kept to its budget (`startMs` is when it began, `nowMs` when it ended). */
export function wallProblem(name: Budgeted, startMs: number, nowMs: number, env: Readonly<Record<string, string | undefined>> = process.env): string | null {
  const scale = Number(env.CLAUDE_PACKS_BUDGET_SCALE);
  const budget = WALL_BUDGET_S[name] * (Number.isFinite(scale) && scale > 0 ? scale : 1);
  const took = (nowMs - startMs) / 1000;
  return took > budget ? `${name} took ${took.toFixed(1)} s, over its budget of ${budget} s: find the step that grew (the selftests run at once, the scan's copy and install)` : null;
}
