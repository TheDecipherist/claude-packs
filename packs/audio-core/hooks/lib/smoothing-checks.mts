import { blankCode, lineAt } from './cpp-scan.mts';
import { matchesAny } from './glob.mts';
import { conceptGlobs, foldersOfKind } from './layout.mts';
import type { FileWrite, Layout } from './types.d.mts';

// KWB-126: every continuous control runs through the project's one smoothing module, so a search for its namespace shows
// what is smoothed and what is not. This judges the code outside that module for smoothing written by hand, or a gain
// stepped once per block. Off until `.claude/layout.json` has `guards.smoothing`.
//   { "module": "src/dsp/smooth/**", "namespace": "smooth", "scope": ["src/audio/**", "src/dsp/**"] }

/** Where the smoothing module is, what its namespace is called, and which files are judged. */
export interface SmoothingConfig { module: string[]; namespace: string; scope: string[] }

/** One hand-written smoothing found: its line, what it is, and its text. */
export interface SmoothingHit { line: number; why: string; text: string }

export const MARKER = /\/\/\s*smooth-ok:\s*\S/; // a marker carries its reason: a bare `// smooth-ok:` does not pass

const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : typeof v === 'string' ? [v] : []);

// Smoothing is never optional (the user, 2026-11-10: "smoothing should be completely automatic and never opt in. there is no
// reason to not do smoothing"). Without `guards.smoothing` the module is any folder named smooth, plus a project's copy trees
// (another project's code, whose glides are its own), and the scope is the project's audio code. guards.smoothing can only
// name the module and the scope more exactly; it cannot switch the check off.
const DEFAULT_MODULE = ['**/smooth/**'];
const DEFAULT_SCOPE = ['src/audio/**', 'src/dsp/**', 'src/engines/**', 'src/app/**'];
const AUDIO_CONCEPTS = ['audio', 'dsp'];

export function smoothingConfig(layout: Layout): SmoothingConfig {
  const declared = layout.guards?.['smoothing'];
  const g: Record<string, unknown> = declared && typeof declared === 'object' ? declared as Record<string, unknown> : {};
  const concepts = AUDIO_CONCEPTS.flatMap((c) => conceptGlobs(layout, c) ?? []);
  const module = [...new Set([...list(g['module']), ...DEFAULT_MODULE, ...foldersOfKind(layout, 'copy').map((p) => `${p}/**`)])];
  const named = list(g['scope']);
  const scope = named.length ? named : concepts.length ? [...new Set(concepts)] : DEFAULT_SCOPE;
  const namespace = g['namespace'];
  return { module, namespace: typeof namespace === 'string' && namespace ? namespace : 'smooth', scope };
}

// A file is judged when it is in scope and is not the module itself.
export const judged = (rel: string, cfg: SmoothingConfig): boolean => matchesAny(rel, cfg.scope) && !matchesAny(rel, cfg.module);

const IDENT = String.raw`[\w.\->\[\]]+`;
const DIFF = String.raw`\(\s*[^()]*-\s*[^()]*\)`;

// One row per shape of hand-written smoothing: a line pattern and what it is.
const SHAPES: readonly { re: RegExp; why: string }[] = [
  { re: /\b(?:Linear|Multiplicative)?SmoothedValue\b|\bLinearSmoothedValue\b/g, why: 'a hand-made `SmoothedValue`' },
  { re: new RegExp(String.raw`[-+]=\s*${IDENT}\s*\*\s*${DIFF}|[-+]=\s*${DIFF}\s*\*\s*${IDENT}`, 'g'), why: 'a one-pole slew written out (`x += k * (target - x)`)' },
  { re: new RegExp(String.raw`(${IDENT})\s*=\s*\1\s*[-+]\s*${IDENT}\s*\*\s*${DIFF}`, 'g'), why: 'a one-pole slew written out (`x = x + k * (target - x)`)' },
  { re: new RegExp(String.raw`(${IDENT})\s*=\s*${IDENT}\s*\+\s*${DIFF}\s*\*\s*${IDENT}`, 'g'), why: 'a one-pole slew written out (`x = t + (x - t) * k`)' },
  { re: /\bexp\s*\(\s*-[^;\n]*\b(?:get)?(?:sampleRate|sample_rate|rate|fs|sr)\b/gi, why: 'a slew coefficient built from `exp (-... / (seconds * rate))`' },
  { re: /\.\s*applyGainRamp\s*\(/g, why: '`applyGainRamp` outside the smoothing module' },
  // 1.7.2: a switch that changes what is heard, done in one sample, clicks: BANDWARP's BYPASS was one
  { re: /\bif\s*\(\s*!?\s*[\w.\->:]*[Bb]ypass(?:ed)?\w*\s*(?:\(\s*\))?\s*\)/g, why: 'a bypass switched in one sample (a click): crossfade wet and dry through the smoothing module' },
];

const LITERAL = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?[fFdD]?$/;
const POINTERISH = /Pointer|\.data\s*\(|\[|&/;

interface GainCall { re: RegExp; name: string; gain: (args: readonly string[]) => string | null | undefined }

// A gain applied to a whole block as one scalar. `gain(args)` is the argument that is the gain, or null when the call has none.
const GAIN_CALLS: readonly GainCall[] = [
  { re: /\.\s*applyGain\s*\(/g, name: 'applyGain', gain: (a) => a[a.length - 1] },
  { re: /\.\s*multiplyBy\s*\(/g, name: 'multiplyBy', gain: (a) => a[a.length - 1] },
  { re: /\b(?:add|copy)From\s*\(/g, name: 'addFrom/copyFrom', gain: (a) => (a.length === 5 || a.length === 7 ? a[a.length - 1] : null) },
  { re: /\bFloatVectorOperations\s*::\s*multiply\s*\(/g, name: 'FloatVectorOperations::multiply', gain: (a) => (a.length === 4 ? a[2] : a.length === 3 && !POINTERISH.test(a[1] ?? '') ? a[1] : null) },
  { re: /\bFloatVectorOperations\s*::\s*(?:copyWithMultiply|addWithMultiply)\s*\(/g, name: 'FloatVectorOperations::copy/addWithMultiply', gain: (a) => (a.length === 4 ? a[2] : null) },
];

// The top-level arguments of the call whose "(" is at open, or null when it never closes.
function argsAt(code: string, open: number): string[] | null {
  const args: string[] = [];
  let depth = 0;
  let from = open + 1;
  for (let i = open; i < code.length; i += 1) {
    const c = code[i];
    if (c === '(' || c === '[' || c === '{') depth += 1;
    else if (c === ')' || c === ']' || c === '}') {
      depth -= 1;
      if (depth === 0) {
        const last = code.slice(from, i).trim();
        if (last || args.length) args.push(last);
        return args;
      }
    } else if (c === ',' && depth === 1) {
      args.push(code.slice(from, i).trim());
      from = i + 1;
    }
  }
  return null;
}

interface RawHit { index: number; why: string }

function gainSteps(code: string): RawHit[] {
  const found: RawHit[] = [];
  for (const { re, name, gain } of GAIN_CALLS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(code)) !== null) {
      const args = argsAt(code, m.index + m[0].length - 1);
      const g = args && gain(args);
      if (g && !LITERAL.test(g)) found.push({ index: m.index, why: `\`${name}\` applies one gain to the whole block, so every change steps at the block boundary` });
    }
  }
  return found;
}

// Every smoothing outside the module in one file's source: [{ line, why, text }], marked lines left out.
export function findHandSmoothing(src: string): SmoothingHit[] {
  const code = blankCode(src);
  const lines = src.split('\n');
  const hits: RawHit[] = [...gainSteps(code)];
  for (const { re, why } of SHAPES) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(code)) !== null) hits.push({ index: m.index, why });
  }
  const found: SmoothingHit[] = [];
  for (const { index, why } of hits) {
    const line = lineAt(src, index);
    const text = (lines[line - 1] ?? '').trim();
    if (!MARKER.test(text)) found.push({ line, why, text });
  }
  return found.sort((a, b) => a.line - b.line);
}

export const smoothingKey = (v: SmoothingHit): string => `${v.why}|${v.text}`;

// The message for a write that adds some, or null.
export function judgeSmoothing(w: FileWrite, rel: string, cfg: SmoothingConfig): string | null {
  if (!/\.(cpp|cc|cxx|h|hh|hpp|mm)$/.test(w.path) || w.after === null || !judged(rel, cfg)) return null;
  const was = new Set(findHandSmoothing(w.before ?? '').map(smoothingKey));
  const added = findHandSmoothing(w.after).filter((v) => !was.has(smoothingKey(v)));
  if (added.length === 0) return null;
  const lines = added.slice(0, 12).map((v) => `  line ${v.line}: ${v.why}\n      ${v.text}`);
  const more = added.length > 12 ? `\n  ...and ${added.length - 12} more` : '';
  return (
    `BLOCKED by realtime-guard: this edit smooths or steps a control outside the project's smoothing module in ${rel}\n${lines.join('\n')}${more}\n\n` +
    `Fix: every continuous control runs through the one smoothing module (${cfg.module.join(', ')}, namespace \`${cfg.namespace}::\`), so a search for \`${cfg.namespace}::\` shows what is smoothed and what is not. ` +
    'Make the control a smoother from that module, set its target once per block and read it per sample; add the shape there if it lacks one.\n' +
    'A line that is not parameter smoothing (a compressor\'s ballistics, a one-pole audio filter, a detector) ends with `// smooth-ok: <reason>`; the reason is required.\n' +
    'See .claude/rules/smooth-continuous-parameters.md.\n'
  );
}
