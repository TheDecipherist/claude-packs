// The status line's colours and width (1.8.0): true colour, 256 colours or none, from the terminal's own variables, and a
// cut to the terminal's width that keeps the colour codes.
import { barCells } from '../hooks/lib/run-status.mts';

const RESET = '\x1b[0m';
const ANSI = /\x1b\[[0-9;]*m/g;

export interface Rgb { r: number; g: number; b: number }
export type ColourName = 'white' | 'dim' | 'green' | 'amber' | 'blue' | 'teal' | 'lavender' | 'red' | 'orange' | 'empty';
export type Colours = Readonly<Record<ColourName, Rgb>>;
/** 'truecolor', '256' or 'none' (NO_COLOR set). */
export type PaintMode = 'truecolor' | '256' | 'none';
/** paint(text, colour): the text in that colour for the mode. */
export type Paint = (text: string, rgb: Rgb) => string;

export const COLOURS: Colours = {
  white: { r: 235, g: 235, b: 235 }, dim: { r: 128, g: 128, b: 140 }, green: { r: 80, g: 220, b: 120 }, amber: { r: 240, g: 180, b: 70 },
  blue: { r: 90, g: 160, b: 245 }, teal: { r: 70, g: 200, b: 200 }, lavender: { r: 180, g: 160, b: 245 }, red: { r: 235, g: 90, b: 90 },
  orange: { r: 245, g: 150, b: 70 }, empty: { r: 70, g: 70, b: 80 },
};

/** The mode the terminal's own variables ask for. */
export function paintMode(env: Readonly<Record<string, string | undefined>>): PaintMode {
  if (env.NO_COLOR) return 'none';
  const ct = env.COLORTERM || '';
  if (ct.includes('truecolor') || ct.includes('24bit')) return 'truecolor';
  return (env.TERM || '').includes('256') ? '256' : 'truecolor';
}

function to256({ r, g, b }: Rgb): number {
  if (r === g && g === b) return r < 8 ? 16 : r > 248 ? 231 : Math.round(((r - 8) / 247) * 24) + 232;
  return 16 + 36 * Math.round((r / 255) * 5) + 6 * Math.round((g / 255) * 5) + Math.round((b / 255) * 5);
}

/** A painter for one mode: paint(text, colour). */
export function painter(mode: PaintMode): Paint {
  return (text, rgb) => {
    if (mode === 'none' || !text) return text;
    if (mode === '256') return `\x1b[38;5;${to256(rgb)}m${text}${RESET}`;
    return `\x1b[38;2;${rgb.r};${rgb.g};${rgb.b}m${text}${RESET}`;
  };
}

export const bold = (text: string, mode: PaintMode): string => (mode === 'none' ? text : `\x1b[1m${text}${RESET}`);

/** A bar of `width` cells for a percent: filled green, the rest dim. */
export function meter(p: number, width: number, paint: Paint): string {
  const [full, empty] = barCells(p, width);
  return paint('█'.repeat(full), COLOURS.green) + paint('░'.repeat(empty), COLOURS.empty);
}

/** The line cut to `columns` visible characters, its colour codes kept, an ellipsis where it was cut. */
export function fitWidth(line: string, columns: number): string {
  if (!columns || [...line.replace(ANSI, '')].length <= columns) return line;
  const code = new RegExp(ANSI.source, 'y');
  let out = '';
  let seen = 0;
  for (let i = 0; i < line.length && seen < columns - 1;) {
    code.lastIndex = i;
    const m = code.exec(line);
    if (m) { out += m[0]; i += m[0].length; continue; }
    const ch = String.fromCodePoint(line.codePointAt(i) ?? 0);
    out += ch;
    i += ch.length;
    seen += 1;
  }
  return `${out}…${line.includes('\x1b[') ? RESET : ''}`;   // a plain line (NO_COLOR) stays plain
}
