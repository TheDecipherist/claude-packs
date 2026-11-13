// The toolchain each processor needs, found before the run (the user, 2026-11-13: "the kit needs to check at the start whats
// missing to perform a proper RE ... ironclad"). A planted home stands in for the machine: a disassembler collection with an H8 and
// a DSP56k tool, one project's 6809 oracle, a third-party DSP56300 emulator under ~/firmware/src, an H8 objdump, and no Ghidra.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { familiesOf, familyOf, scanTools, toolchainRefusals, toolchainTable } from '../../lib/toolchain.mts';

const put = (f: string, t: string): void => { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, t); };
function plantedHome(): string {
  const home = mkdtempSync(join(tmpdir(), 'toolchain-home-'));
  put(join(home, 'projects/disassemblers/README.md'), '| CPU | Tool | Written for |\n|---|---|---|\n| Hitachi H8/300H | `h8300h/h8_recursive_disasm.py` | TC Electronic Reverb 4000 |\n');
  put(join(home, 'projects/disassemblers/dsp56k/README.md'), '# DSP56000 / DSP56300 — Motorola\'s 24-bit DSP\n');
  put(join(home, 'projects/matrix12/tests/oracle/Cpu6809.cpp'), '// the 6809\n');
  put(join(home, 'firmware/src/dsp56300/README.md'), '# Motorola DSP 56300 family emulator\n');
  put(join(home, 'firmware/src/dsp56300/LICENSE.md'), 'GNU GENERAL PUBLIC LICENSE\n Version 3, 29 June 2007\n');
  put(join(home, 'firmware/h8tools/bin/h8300-elf-objdump'), '');
  return home;
}
const scan = (home: string) => scanTools({ home, path: '', env: { REFERENCE_LIBRARY: join(home, 'none') } });

test('processors are known by their part numbers and family names', () => {
  assert.equal(familyOf('H8/3003'), 'h8300h');
  assert.equal(familyOf('DSP56362'), 'dsp56300');
  assert.equal(familyOf('MC68B09'), 'm6809');
  assert.deepEqual(familiesOf('DSP56000 / DSP56300').sort(), ['dsp56000', 'dsp56300']);
});

test('the scan finds our tools first, then the installed ones, with their licences', () => {
  const tools = scan(plantedHome());
  const of = (fam: string, kind: string) => tools.filter((t) => t.family === fam && t.kind === kind);
  assert.equal(of('h8300h', 'disassembler').length, 2, 'ours from the README, and the objdump');
  assert.equal(of('h8300h', 'disassembler')[0]?.origin, 'ours');
  assert.equal(of('dsp56300', 'disassembler')[0]?.origin, 'ours', 'a collection folder whose README names both DSP families');
  assert.equal(of('dsp56300', 'emulator')[0]?.licence, 'GPL-3.0');
  assert.equal(of('m6809', 'emulator')[0]?.origin, 'ours', "a project's tests/oracle interpreter");
  assert.equal(of('h8300h', 'emulator').length, 0);
});

test('the table says missing where nothing was found', () => {
  const table = toolchainTable(['H8/300H', 'DSP56300'], scan(plantedHome()));
  const h8 = table.split('\n').find((l) => l.startsWith('| H8/300H')) ?? '';
  assert.match(h8, /h8_recursive_disasm\.py/);
  assert.equal(h8.split('|')[3]?.trim(), 'missing', 'no H8 emulator anywhere');
});

test('the pre-flight refuses an unsettled processor and passes a settled one', () => {
  assert.deepEqual(toolchainRefusals([], null, 'x'), [], 'an order that names no processor is not checked');
  assert.match(toolchainRefusals(['H8/300H'], null, 'sn2')[0] ?? '', /no docs\/workorders\/sn2\/toolchain\.md/);
  const table = toolchainTable(['H8/300H', 'DSP56300'], scan(plantedHome()));
  const refusals = toolchainRefusals(['H8/300H', 'DSP56300'], table, 'sn2');
  assert.equal(refusals.length, 1);
  assert.match(refusals[0] ?? '', /H8\/300H's emulator is "missing"/);
  const settled = table.replace(/(\| H8\/300H \|[^|]*\|) missing \|/, '$1 build our own (the user, yes, 2026-11-13) |');
  assert.deepEqual(toolchainRefusals(['H8/300H', 'DSP56300'], settled, 'sn2'), []);
  const online = table.replace(/(\| H8\/300H \|[^|]*\|) missing \|/, '$1 third-party, GPL-2.0: https://github.com/example/h8emu |');
  assert.deepEqual(toolchainRefusals(['H8/300H', 'DSP56300'], online, 'sn2'), [], 'an emulator found online, with its address');
  assert.equal(toolchainRefusals(['H8/300H'], table.replace(/\| H8\/300H \|.*\n/, ''), 'sn2').length, 1, 'a processor with no row');
});
