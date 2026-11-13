// 1.3.0: a ledger of every source, ticked only when read. On the Matrix-12 the owner's manual lost every graph to a
// placeholder, and the service manual, which is scanned sheets, came out nearly empty, and nothing listed either as unread.
import { KIT, assert, fresh, join, mkdirSync, readFileSync, run, spawnSync, test, writeFileSync } from '../../kit-cli.mts';
import { fixture } from '../../fixtures/installs.mts';

// The command runs from an install, as a project runs it: it finds base's hook lib beside the tools (W4: isMain from hook-log).
const INSTALL = fixture('cpp');
run(INSTALL, 'add', 'reverse-engineering');
const TOOL = join(INSTALL, '.claude/tools/source-ledger.mjs');

function project(): string {
  const dir = fresh('ledger-');
  mkdirSync(join(dir, 'sources/sheets'), { recursive: true });
  mkdirSync(join(dir, 'docs/circuits'), { recursive: true });
  writeFileSync(join(dir, 'sources/sheets/sheet-01.png'), 'png');
  writeFileSync(join(dir, 'sources/sheets/sheet-02.png'), 'png');
  writeFileSync(join(dir, 'sources/manual.pdf'), 'pdf');
  writeFileSync(join(dir, 'sources/manual.md'), '# Manual\n\ntext\n');
  writeFileSync(join(dir, 'docs/circuits/01-cpu.md'), 'report');
  return dir;
}

const ledger = (dir: string, rows: readonly string[]): void =>
  writeFileSync(join(dir, 'docs/sources-checklist.md'), `| Done | File | What | Evidence |\n|---|---|---|---|\n${rows.join('\n')}\n`);
const check = (dir: string) => spawnSync('node', [TOOL, join(dir, 'docs/sources-checklist.md'), join(dir, 'sources')], { encoding: 'utf8' });

test('a file on hand that is not on the ledger is listed, and the check fails', () => {
  const dir = project();
  ledger(dir, ['| [x] | ../sources/sheets/sheet-01.png | Sheet 1 | circuits/01-cpu.md |', '| [x] | ../sources/manual.pdf | Manual | circuits/01-cpu.md |']);
  const done = check(dir);
  assert.equal(done.status, 1);
  assert.match(done.stdout, /not on the ledger: \.\.\/sources\/sheets\/sheet-02\.png/);
});

test('a row not done, or ticked with no evidence or with evidence that does not exist, is listed', () => {
  const dir = project();
  ledger(dir, ['| [ ] | ../sources/sheets/sheet-01.png | Sheet 1 | |', '| [x] | ../sources/sheets/sheet-02.png | Sheet 2 | |', '| [x] | ../sources/manual.pdf | Manual | circuits/99-none.md |']);
  const out = check(dir).stdout;
  assert.match(out, /not done: \.\.\/sources\/sheets\/sheet-01\.png/);
  assert.match(out, /ticked with no evidence: \.\.\/sources\/sheets\/sheet-02\.png/);
  assert.match(out, /evidence missing for \.\.\/sources\/manual\.pdf: circuits\/99-none\.md/);
});

test('a PDF whose Markdown still marks images by placeholder is not read, even ticked', () => {
  const dir = project();
  writeFileSync(join(dir, 'sources/manual.md'), '# Manual\n\n<!-- image -->\n\ntext\n\n<!-- image -->\n');
  ledger(dir, ['| [x] | ../sources/sheets/sheet-01.png | Sheet 1 | circuits/01-cpu.md |', '| [x] | ../sources/sheets/sheet-02.png | Sheet 2 | circuits/01-cpu.md |', '| [x] | ../sources/manual.pdf | Manual | circuits/01-cpu.md |']);
  assert.match(check(dir).stdout, /2 images only marked in manual\.md/);
});

test('everything listed and done with evidence: exit 0', () => {
  const dir = project();
  ledger(dir, ['| [x] | ../sources/sheets/sheet-01.png | Sheet 1 | circuits/01-cpu.md |', '| [x] | ../sources/sheets/sheet-02.png | Sheet 2 | circuits/01-cpu.md |', '| [x] | ../sources/manual.pdf | Manual | circuits/01-cpu.md |']);
  const done = check(dir);
  assert.equal(done.status, 0, done.stdout);
});

test('the skill names the tool and its laws', () => {
  const skill = readFileSync(join(KIT, 'packs/reverse-engineering/skills/source-checklist/SKILL.md'), 'utf8');
  assert.ok(skill.length < 8000);
  assert.match(skill, /^description: Use when/m);
  for (const law of [/node \.claude\/tools\/source-ledger\.mjs/, /A ticked row with no evidence is not done/, /Call the sound, a stage or a step finished while the tool exits 1/, /\| A schematic, a service sheet, a parts layout \| `read-a-circuit-diagram` \|/, /`chips\/<part>\.md`/, /`pdf-to-md`, figures exported/, /`bank-census`/, /`compare-to-the-machine`/]) assert.match(skill, law);
});

test('the hash pass lists files that are one image under two names, and passes when there are none', () => {
  const dir = project();
  const clean = spawnSync('node', [TOOL, '--hash', join(dir, 'sources/sheets')], { encoding: 'utf8' });
  assert.equal(clean.status, 1, 'sheet-01 and sheet-02 hold the same bytes');
  writeFileSync(join(dir, 'sources/sheets/sheet-02.png'), 'other');
  const done = spawnSync('node', [TOOL, '--hash', join(dir, 'sources/sheets')], { encoding: 'utf8' });
  assert.equal(done.status, 0, done.stdout);
  assert.match(clean.stdout, /sheet-01\.png = .*sheet-02\.png|sheet-02\.png = .*sheet-01\.png/);
});
