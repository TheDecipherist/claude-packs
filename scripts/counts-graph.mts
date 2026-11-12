// The README's performance graph (typescript order W11 item 4): a light and a dark SVG and a plain table, all made from the numbers the
// order keeps in docs/workorders/typescript/numbers.json (a tracked copy of the evidence under build/, which git ignores). Nothing is drawn by
// hand: `counts --check` is red when the graph, the table or the picture element disagrees with the numbers.
// Colours are the dataviz reference palette's categorical slots 2 (orange, before) and 1 (blue, after), both modes checked by its validator.
import { join } from 'node:path';
import { readJson } from '../packs/base/hooks/lib/json.mts';

/** One measure a user feels: what it was on 1.9 and what it is on 2.0, with the evidence file each number came from. */
export interface Measure { id: string; label: string; unit: 'ms' | 's'; before: number; after: number; evidence: string; provisional?: boolean }
export const NUMBERS_FILE = 'docs/workorders/typescript/numbers.json';
export const GRAPH_FILES = { light: 'docs/perf-light.svg', dark: 'docs/perf-dark.svg' } as const;

/** The measures of a kit folder; empty where it holds none. */
export const measuresOf = (root: string): Measure[] => readJson<{ measures?: Measure[] }>(join(root, NUMBERS_FILE), {})?.measures ?? [];

/** How much faster: 20.4x, 4.2x, 1.5x; a whole number from ten up. */
export const factorOf = (m: Measure): string => {
  const f = m.before / m.after;
  return `${f >= 10 ? Math.round(f) : f.toFixed(1)}x`;
};
const shown = (value: number, unit: string): string => `${value >= 1000 && unit === 'ms' ? value.toLocaleString('en-US') : value} ${unit}`;

interface Look { surface: string; text: string; muted: string; before: string; after: string }
const LOOKS: Record<'light' | 'dark', Look> = {
  light: { surface: '#fcfcfb', text: '#0b0b0b', muted: '#52514e', before: '#eb6834', after: '#2a78d6' },
  dark: { surface: '#1a1a19', text: '#f0efec', muted: '#c3c2b7', before: '#d95926', after: '#3987e5' },
};
const W = 760, LEFT = 24, BAR = 380, ROW = 66, TOP = 52;

/** The graph for one theme: a bar pair per measure, each row on its own scale (the before bar is the whole bar), the factor at the end. */
export function svgOf(measures: readonly Measure[], mode: 'light' | 'dark'): string {
  const c = LOOKS[mode];
  const height = TOP + measures.length * ROW + 12;
  const rows = measures.map((m, i) => {
    const y = TOP + i * ROW;
    const after = Math.max(3, Math.round((m.after / m.before) * BAR));
    return [
      `<text x="${LEFT}" y="${y + 12}" font-size="14" fill="${c.text}">${m.label}</text>`,
      `<rect x="${LEFT}" y="${y + 20}" width="${BAR}" height="12" rx="4" fill="${c.before}"/>`,
      `<text x="${LEFT + BAR + 8}" y="${y + 31}" font-size="12" fill="${c.muted}">${shown(m.before, m.unit)}</text>`,
      `<rect x="${LEFT}" y="${y + 36}" width="${after}" height="12" rx="4" fill="${c.after}"/>`,
      `<text x="${LEFT + after + 8}" y="${y + 47}" font-size="12" fill="${c.muted}">${shown(m.after, m.unit)}</text>`,
      `<text x="${W - LEFT}" y="${y + 47}" font-size="18" font-weight="600" text-anchor="end" fill="${c.text}">${factorOf(m)}</text>`,
    ].join('\n  ');
  });
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${height}" width="${W}" height="${height}" role="img" aria-label="Before and after on one row for ${measures.length} measures, 1.9 against 2.0, with the factor at the end">`,
    `  <style>text{font-family:system-ui,-apple-system,"Segoe UI",sans-serif}</style>`,
    `  <rect width="${W}" height="${height}" fill="${c.surface}"/>`,
    `  <text x="${LEFT}" y="26" font-size="16" font-weight="600" fill="${c.text}">claude-packs 1.9 against 2.0, where it counts</text>`,
    `  <rect x="${LEFT}" y="36" width="10" height="10" rx="2" fill="${c.before}"/><text x="${LEFT + 16}" y="45" font-size="12" fill="${c.muted}">1.9</text>`,
    `  <rect x="${LEFT + 56}" y="36" width="10" height="10" rx="2" fill="${c.after}"/><text x="${LEFT + 72}" y="45" font-size="12" fill="${c.muted}">2.0 (each row on its own scale; shorter is faster)</text>`,
    `  ${rows.join('\n  ')}`,
    '</svg>',
    '',
  ].join('\n');
}

/** The same numbers as a plain table, for readers without images. */
export function measureTable(measures: readonly Measure[]): string {
  const head = ['| Measure | 1.9 | 2.0 | Faster by |', '|---|---|---|---|'];
  return [...head, ...measures.map((m) => `| ${m.label} | ${shown(m.before, m.unit)} | ${shown(m.after, m.unit)} | ${factorOf(m)} |`)].join('\n');
}

/** The README block: the picture element with both themes, and the table under it. */
export function graphBlock(measures: readonly Measure[]): string {
  return [
    '<picture>',
    `  <source media="(prefers-color-scheme: dark)" srcset="${GRAPH_FILES.dark}">`,
    `  <img src="${GRAPH_FILES.light}" alt="Bar pairs, 1.9 against 2.0, for the wait per turn, Stop at p95, a release, a one-hook gate, a Bash call's hooks, doctor and update" width="${W}">`,
    '</picture>',
    '',
    measureTable(measures),
  ].join('\n');
}
