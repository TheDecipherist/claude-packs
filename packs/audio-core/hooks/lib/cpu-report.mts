// What cpu-gate reads of a CPU report and of the layout, with no git and no file: the hook asks git, this judges (KWB-264).
import type { Layout } from './types.d.mts';

/** The house budget: the worst block within half its deadline (cpu-worst-case-per-block). */
export const BUDGET = 0.5;
const AUDIO_FOLDERS: readonly string[] = ['audio', 'engines', 'dsp'];

/** The project's CPU gate, its defaults settled. */
export interface CpuGate { code: readonly string[]; report: string; budget: number }
export interface Report { code?: unknown; verdict?: unknown; worst?: unknown; threads?: unknown }

const pct = (share: number): string => `${Math.round(share * 100)} %`;

/** The gate a layout asks for: its own `cpu` settings, else the audio folders it has. */
export function gateOf(layout: Layout): CpuGate {
  const own = (layout['cpu'] ?? {}) as Partial<CpuGate>;
  const folders = AUDIO_FOLDERS.map((name) => layout.folders?.[name]?.path).filter((p): p is string => !!p).map((p) => `${p.replace(/\/+$/, '')}/**`);
  return { code: own.code ?? folders, report: own.report ?? 'build/evidence/cpu.json', budget: typeof own.budget === 'number' ? own.budget : BUDGET };
}


/** Why the report on `ref` does not let its audio code land, or null. */
export function faultOf(report: Report | null, gate: CpuGate, key: string): string | null {
  if (report === null || typeof report !== 'object') return `${gate.report} is not JSON`;
  if (report.code !== key) return `${gate.report} measured code ${String(report.code).slice(0, 8)}, but the audio code on the branch is ${key.slice(0, 8)}: measure again`;
  const worst = report.worst;
  if (typeof worst !== 'number' || !Number.isFinite(worst)) return `${gate.report} has no "worst" (the worst block's share of its deadline)`;
  const threads = typeof report.threads === 'number' ? report.threads : 1;
  if (worst > gate.budget && threads <= 1) {
    return `the worst block takes ${pct(worst)} of its deadline on one core, over the ${pct(gate.budget)} budget: one core cannot hold this machine. ` +
      'Spread the voices over cores (the voices-spread-over-cores rule, the spread-voices-over-cores skill), or cut the cost, and measure again';
  }
  if (worst > gate.budget) return `the worst block takes ${pct(worst)} of its deadline with ${threads} threads, over the ${pct(gate.budget)} budget: cut the cost and measure again`;
  if (report.verdict !== 'pass') return `${gate.report} says "${String(report.verdict)}"`;
  return null;
}
