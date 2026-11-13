// What an order asks of Ghidra is checked before its run starts: an installed Ghidra, a JDK it accepts, and a processor module for
// every name in the install block's `ghidra:` line. A planted Ghidra (its application.properties and two processor modules) and
// planted JDKs (release files) stand in for the machine's, so the result never depends on what this machine has installed.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { ghidraHome, ghidraRefusals } from '../../lib/ghidra-check.mts';
import { installBlockOf } from '../../lib/install-block.mts';

/** A home with ~/tools/ghidra_12.2_PUBLIC (Java 25 or newer) holding the 6809 and Z80 modules, and a JDK root with the given majors. */
function planted(jdks: number[]): { home: string; roots: string[] } {
  const home = mkdtempSync(join(tmpdir(), 'ghidra-home-'));
  const g = join(home, 'tools', 'ghidra_12.2_PUBLIC');
  mkdirSync(join(g, 'Ghidra'), { recursive: true });
  writeFileSync(join(g, 'Ghidra', 'application.properties'), 'application.name=Ghidra\napplication.java.min=25\n');
  for (const [module, processor] of [['MC6800', '6809'], ['Z80', 'Z80']] as const) {
    const langs = join(g, 'Ghidra', 'Processors', module, 'data', 'languages');
    mkdirSync(langs, { recursive: true });
    writeFileSync(join(langs, `${module}.ldefs`), `<language processor="${processor}" id="${processor}:BE:16:default"><description>${processor} microprocessor</description></language>`);
  }
  const root = join(home, 'jvm');
  for (const major of jdks) {
    mkdirSync(join(root, `jdk-${major}`), { recursive: true });
    writeFileSync(join(root, `jdk-${major}`, 'release'), `JAVA_VERSION="${major}.0.1"\n`);
  }
  return { home, roots: [root] };
}

test('an order that asks nothing of Ghidra is not checked', () => {
  assert.deepEqual(ghidraRefusals([], {}, '/nonexistent', []), []);
});

test('a processor Ghidra has, with a JDK it accepts, passes', () => {
  const { home, roots } = planted([26]);
  assert.deepEqual(ghidraRefusals(['6809', 'Z80'], {}, home, roots), []);
});

test('a processor Ghidra lacks is refused, naming what it has (the supernova2 case: H8/300H and DSP56300)', () => {
  const { home, roots } = planted([26]);
  const r = ghidraRefusals(['6809', 'H8/300H', 'DSP56300'], {}, home, roots);
  assert.equal(r.length, 2);
  assert.match(r[0] ?? '', /no processor module for H8\/300H in ghidra_12\.2_PUBLIC \(it has: MC6800, Z80\)/);
  assert.match(r[1] ?? '', /DSP56300/);
});

test('a JDK older than Ghidra needs is refused (Java 21 against Ghidra 12.2\'s 25)', () => {
  const { home, roots } = planted([21]);
  const r = ghidraRefusals(['6809'], {}, home, roots);
  assert.equal(r.length, 1);
  assert.match(r[0] ?? '', /needs Java 25 or newer, and this machine has Java 21/);
});

test('no Ghidra at all is refused, saying where one is looked for', () => {
  const r = ghidraRefusals(['6809'], {}, mkdtempSync(join(tmpdir(), 'no-ghidra-')), []);
  assert.equal(r.length, 1);
  assert.match(r[0] ?? '', /none is installed \(GHIDRA_INSTALL_DIR, or ~\/tools\/ghidra_VERSION_PUBLIC\)/);
});

test('GHIDRA_INSTALL_DIR wins over ~/tools', () => {
  const { home } = planted([26]);
  const elsewhere = join(home, 'tools', 'ghidra_12.2_PUBLIC');
  assert.equal(ghidraHome({ GHIDRA_INSTALL_DIR: elsewhere }, '/nonexistent'), elsewhere);
});

test('the install block takes a ghidra line, as a list or comma-separated, and keeps it out of the layout keys', () => {
  const block = (body: string): string => `# order\n\n\`\`\`claude-packs\nconfiguration: base\npacks: base\n${body}\n\`\`\`\n`;
  const a = installBlockOf(block('ghidra: H8/300H, DSP56300'));
  assert.deepEqual(a.ghidra, ['H8/300H', 'DSP56300']);
  assert.equal('ghidra' in a.owned, false, 'never written into the project layout');
  assert.deepEqual(installBlockOf(block('ghidra:\n  - 6809')).ghidra, ['6809']);
  assert.deepEqual(installBlockOf(block('')).ghidra, []);
});
