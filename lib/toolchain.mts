// What a reverse engineering needs for each processor a firmware runs on, found before the run starts (the user, 2026-11-13: "the
// kit needs to check at the start whats missing to perform a proper RE"). For each processor: a disassembler, an emulator (ours,
// to be the oracle, or another to check ours against), a Ghidra module, and the maker's manuals. Looked for in this order: our own
// (the disassembler collection's README, every project's tests/oracle interpreter), then what is installed (~/firmware's sources
// and binutils, ~/tools, the PATH, Ghidra's modules), and the reference library's pages. What none of them has is searched for
// online and, where no emulator exists anywhere, put to the user (the re-toolchain skill); the pre-flight refuses a run whose
// toolchain.md leaves a processor's disassembler or emulator without a status.
//   claude-packs toolchain H8/300H DSP56300 [--out docs/workorders/NAME/toolchain.md]
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, join } from 'node:path';
import { parseJson } from '../packs/base/hooks/lib/json.mts';
import { ghidraHome, ghidraProcessors } from './ghidra-check.mts';

/** A processor family: its id and how its names are written (part numbers, family names). */
export const FAMILIES: readonly { id: string; name: string; re: RegExp }[] = [
  { id: 'h8300h', name: 'Hitachi H8/300H', re: /h8\s*\/?\s*300h|h8\s*\/?\s*30[0-9]{2}\b|hd64\d{2}30\d{2}|h8300h|h8300-elf/i },
  { id: 'h8500', name: 'Hitachi H8/500', re: /h8\s*\/?\s*5\d\d\b|h8500/i },
  { id: 'dsp56300', name: 'Motorola DSP56300', re: /dsp\s*563\d\d|\b563(0[0-9]|1[0-9]|6[0-9])\b|dsp56300|56300/i },
  { id: 'dsp56000', name: 'Motorola DSP56000/56002', re: /dsp\s*5600[0-2]|\b5600[0-2]\b|dsp56k|dis56k/i },
  { id: 'm6809', name: 'Motorola 6809', re: /68[ab]?09/i },
  { id: 'hd6303', name: 'Hitachi HD6301/6303, Motorola 6801/6803', re: /630[13]|680[13]\b|6801|6803/ },
  { id: 'm68000', name: 'Motorola 68000', re: /68000|\bm68k\b|m68k-elf|680[1-4]0\b|68ec0/i },
  { id: 'm68hc11', name: 'Motorola 68HC11', re: /68hc11|6811/i },
  { id: 'z80', name: 'Zilog Z80', re: /\bz80\b|z80/i },
  { id: 'i8051', name: 'Intel 8051', re: /80c?3[12]\b|80c?5[12]\b|8051/i },
  { id: 'mcs48', name: 'Intel MCS-48', re: /mcs-?48|804[89]\b/i },
  { id: 'upd7810', name: 'NEC uPD7810', re: /upd\s*781[01]|7810/i },
  { id: 'ucom4', name: 'NEC uCOM-4', re: /ucom-?4|upd\s*(546|552|553|650)/i },
  { id: 'tms32010', name: 'TI TMS32010', re: /tms\s*3201\d|32010/i },
  { id: 'm6502', name: 'MOS 6502', re: /\b6502\b|65c02/i },
  { id: 'superh', name: 'Hitachi SuperH', re: /superh|\bsh-?[1-4]a?\b|sh7\d{3}|sh-4a/i },
  { id: 'x86', name: 'x86 (16-bit)', re: /x86|8086|\bv30\b|nec v-series/i },
  { id: 'adsp21xx', name: 'Analog Devices ADSP-21xx', re: /adsp-?21\d\d/i },
];
export const familyOf = (name: string): string | null => FAMILIES.find((f) => f.re.test(name))?.id ?? null;
/** Every family a text names (a tool written for the DSP56000 and the DSP56300 serves both). */
export const familiesOf = (name: string): string[] => FAMILIES.filter((f) => f.re.test(name)).map((f) => f.id);

/** One tool found for a family. */
export interface Tool { family: string; kind: 'disassembler' | 'emulator' | 'ghidra' | 'manual'; where: string; origin: 'ours' | 'third-party'; licence?: string; note?: string }

const isDir = (p: string): boolean => { try { return statSync(p).isDirectory(); } catch { return false; } };
const ls = (d: string): string[] => (isDir(d) ? readdirSync(d) : []);
const text = (f: string): string => { try { return readFileSync(f, 'utf8'); } catch { return ''; } };
const licenceOf = (dir: string): string | undefined => {
  const l = text(join(dir, 'LICENSE.md')) || text(join(dir, 'LICENSE')) || text(join(dir, 'COPYING'));
  return /GNU GENERAL PUBLIC LICENSE[\s\S]{0,80}Version 3|GPLv3/i.test(l) ? 'GPL-3.0' : /GNU GENERAL PUBLIC LICENSE[\s\S]{0,80}Version 2/i.test(l) ? 'GPL-2.0' : /MIT License/i.test(l) ? 'MIT' : l ? 'see its licence' : undefined;
};

/** Where to look; `home` and `path` are the machine's unless a test plants its own. */
export interface Places { home: string; path: string; env: NodeJS.ProcessEnv }

/** Every tool on this machine, our own first. */
export function scanTools({ home, path, env }: Places): Tool[] {
  const tools: Tool[] = [];
  const projects = join(home, 'projects');
  const library = env.REFERENCE_LIBRARY || join(projects, 'reference-library');
  // our disassemblers: the reference library's toolchain shelf (their home since 2026-11-13), else the old collection repo
  const collection = isDir(join(library, 'toolchain', 'disassemblers')) ? join(library, 'toolchain', 'disassemblers') : join(projects, 'disassemblers');
  const readme = text(join(collection, 'README.md'));
  for (const row of readme.split('\n').filter((l) => /^\|[^-|]/.test(l) && !/^\|\s*CPU\s*\|/i.test(l))) {
    const [cpu = '', tool = '', written = ''] = row.split('|').slice(1).map((c) => c.trim());
    const fam = familyOf(cpu); if (!fam) continue;
    tools.push({ family: fam, kind: 'disassembler', where: join(collection, tool.split(',')[0]?.replace(/`/g, '').trim() ?? ''), origin: 'ours', note: `written for ${written}` });
  }
  // our emulators on the library's shelf: each folder's README heading names its families
  for (const d of ls(join(library, 'toolchain', 'emulators'))) {
    const dir = join(library, 'toolchain', 'emulators', d);
    if (isDir(dir)) for (const fam of familiesOf(`${d} ${text(join(dir, 'README.md')).split('\n')[0] ?? ''}`)) tools.push({ family: fam, kind: 'emulator', where: dir, origin: 'ours', note: 'the reference library' });
  }
  // the collection's folders the README does not list (dsp56k): every family its own README's heading names
  for (const d of ls(collection)) {
    const dir = join(collection, d);
    if (!isDir(dir)) continue;
    for (const fam of familiesOf(`${d} ${text(join(dir, 'README.md')).split('\n')[0] ?? ''}`)) {
      if (!tools.some((t) => t.family === fam && t.kind === 'disassembler' && t.where.startsWith(`${dir}/`))) tools.push({ family: fam, kind: 'disassembler', where: dir, origin: 'ours' });
    }
  }
  // every project's interpreter of a CPU: tests/oracle, named by its files and its first lines
  for (const p of ls(projects)) {
    const oracle = join(projects, p, 'tests', 'oracle');
    if (!isDir(oracle)) continue;
    const files = ls(oracle);
    const head = files.filter((f) => /^cpu|^Cpu/.test(f)).map((f) => text(join(oracle, f)).split('\n').slice(0, 8).join(' ')).join(' ');
    const fam = familyOf(`${files.join(' ')} ${head}`);
    if (fam) tools.push({ family: fam, kind: 'emulator', where: oracle, origin: 'ours', note: `the ${p} rebuild's oracle` });
  }
  // what is installed: ~/firmware's sources (an emulator) and its binutils builds (an objdump per target)
  const firmware = join(home, 'firmware');
  for (const d of ls(join(firmware, 'src'))) {
    const dir = join(firmware, 'src', d);
    const fam = familyOf(`${d} ${text(join(dir, 'README.md')).split('\n').slice(0, 3).join(' ')}`);
    if (fam && !/binutils/.test(d)) tools.push({ family: fam, kind: /emu|emulator/i.test(`${d} ${ls(join(dir, 'source')).join(' ')} ${text(join(dir, 'README.md')).slice(0, 300)}`) ? 'emulator' : 'disassembler', where: dir, origin: 'third-party', licence: licenceOf(dir) });
  }
  for (const d of ls(firmware)) for (const b of ls(join(firmware, d, 'bin')).filter((f) => /objdump$/.test(f))) {
    const fam = familyOf(b); if (fam) tools.push({ family: fam, kind: 'disassembler', where: join(firmware, d, 'bin', b), origin: 'third-party', licence: 'GPL-3.0', note: 'GNU binutils' });
  }
  // MAME's unidasm on the PATH disassembles most CPUs
  for (const dir of path.split(delimiter).filter(Boolean)) if (existsSync(join(dir, 'unidasm'))) { for (const f of FAMILIES) tools.push({ family: f.id, kind: 'disassembler', where: join(dir, 'unidasm'), origin: 'third-party', licence: 'GPL-2.0+', note: 'MAME unidasm, if it has this CPU' }); break; }
  // Ghidra's processor modules
  const ghidra = ghidraHome(env, home);
  if (ghidra) for (const m of ghidraProcessors(ghidra)) for (const n of m.names) { const fam = familyOf(n); if (fam && !tools.some((t) => t.family === fam && t.kind === 'ghidra')) tools.push({ family: fam, kind: 'ghidra', where: `${ghidra} (${m.module})`, origin: 'third-party', licence: 'Apache-2.0' }); }
  // the reference library's pages for the family (a manual, a data sheet)
  const index = text(join(library, 'index.json'));
  const parts = parseJson<{ parts: { part: string; aliases: string[]; path: string }[] }>(index)?.parts ?? [];
  for (const part of parts) {
    const fam = familyOf([part.part, ...part.aliases].join(' ')); if (fam) tools.push({ family: fam, kind: 'manual', where: part.path, origin: 'ours', note: 'the reference library' });
  }
  return tools;
}

/** The toolchain table for the processors an order names: one row each, every kind with what was found or `missing`. */
export function toolchainTable(processors: readonly string[], tools: readonly Tool[]): string {
  const cell = (fam: string | null, kind: Tool['kind']): string => {
    const found = tools.filter((t) => t.family === fam && t.kind === kind);
    return found.length ? found.map((t) => `${t.origin === 'ours' ? 'ours' : `third-party${t.licence ? `, ${t.licence}` : ''}`}: \`${t.where}\`${t.note ? ` (${t.note})` : ''}`).join('; ') : 'missing';
  };
  const rows = processors.map((p) => { const fam = familyOf(p); return `| ${p} | ${cell(fam, 'disassembler')} | ${cell(fam, 'emulator')} | ${cell(fam, 'ghidra')} | ${cell(fam, 'manual')} |`; });
  return ['| Processor | Disassembler | Emulator | Ghidra module | Manuals in the library |', '|---|---|---|---|---|', ...rows].join('\n');
}

/** A status that lets a run start: found, found online (a URL), or "build our own" with the user's yes. */
const settled = (cell: string): boolean => !!cell && !/^\s*(missing|none|\?|-|tbd)\s*$/i.test(cell) && (!/missing/i.test(cell) || /build our own.*yes|yes.*build our own|https?:\/\//i.test(cell));

/** The pre-flight's refusals for the order's processors, from its toolchain.md. */
export function toolchainRefusals(processors: readonly string[], toolchainMd: string | null, orderName: string): string[] {
  if (!processors.length) return [];
  if (toolchainMd === null) return [`toolchain: the order names processors (${processors.join(', ')}) and has no docs/workorders/${orderName}/toolchain.md: run \`claude-packs toolchain ${processors.map((p) => `"${p}"`).join(' ')} --out docs/workorders/${orderName}/toolchain.md\`, then the re-toolchain skill for what it reports missing`];
  const rows = toolchainMd.split('\n').filter((l) => /^\|/.test(l) && !/^\|\s*(Processor|-)/i.test(l)).map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
  const out: string[] = [];
  for (const p of processors) {
    const fam = familyOf(p);
    const row = rows.find((r) => (fam ? familyOf(r[0] ?? '') === fam : (r[0] ?? '').toLowerCase() === p.toLowerCase()));
    if (!row) { out.push(`toolchain: ${p} has no row in toolchain.md`); continue; }
    for (const [i, kind] of [[1, 'disassembler'], [2, 'emulator']] as const) {
      if (!settled(row[i] ?? '')) out.push(`toolchain: ${p}'s ${kind} is "${row[i] || 'empty'}": find one (ours, installed, or online with its address), or record the user's yes to build our own ("build our own (the user, yes, DATE)")`);
    }
  }
  return out;
}

/** The command: print (or write with --out) the toolchain table for the processors named. */
export function toolchainCommand(processors: readonly string[], out: string | null, places: Places = { home: homedir(), path: process.env.PATH ?? '', env: process.env }): number {
  if (!processors.length) { console.error('usage: claude-packs toolchain PROCESSOR... [--out FILE]'); return 2; }
  const table = toolchainTable(processors, scanTools(places));
  const page = `# Toolchain\n\nWritten by \`claude-packs toolchain\`; the \`re-toolchain\` skill settles every \`missing\` (online, or the user's yes to build our own) before the run.\n\n${table}\n`;
  if (out) { writeFileSync(out, page); console.log(`toolchain: ${out}`); } else console.log(page);
  return toolchainRefusals(processors, page, '').filter((r) => !/no row/.test(r)).length ? 1 : 0;
}
