// `claude-packs claude-ai-skill`: the work order walkthrough as a skill to upload to claude.ai, where the plan is written. It belongs to no
// pack and no project installs it: it is one zip holding one skill folder, `workorder-writer/`, with SKILL.md and the two templates it
// starts every order from. claude.ai takes a skill as a zip of its folder. The zip is written stored (no compression), which every
// unzip reads, so the kit needs no zip library.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEMPLATES = fileURLToPath(new URL('../prompts/workorder/', import.meta.url));
export const SKILL_NAME = 'workorder-writer';

// What a template's fill-ins become inside the skill: the walkthrough fills them with the person's answers.
const unfilled = (text) => text.replaceAll('{{name}}', '<name>').replaceAll('{{date}}', '<date>');

export const skillFiles = () => ({
  [`${SKILL_NAME}/SKILL.md`]: readFileSync(join(TEMPLATES, 'claude-ai-skill.md'), 'utf8'),
  [`${SKILL_NAME}/templates/workorder.md`]: unfilled(readFileSync(join(TEMPLATES, 'workorder.md'), 'utf8')),
  [`${SKILL_NAME}/templates/workorder-rebuild.md`]: unfilled(readFileSync(join(TEMPLATES, 'workorder-rebuild.md'), 'utf8')),
});

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

// One zip of stored entries: a local header and the data per file, then the central directory and its end record.
export function zipOf(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [path, text] of Object.entries(files)) {
    const name = Buffer.from(path, 'utf8');
    const data = Buffer.from(text, 'utf8');
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8);
    central.writeUInt32LE(crc, 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, name, data);
    centrals.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(centrals.length / 2, 8); end.writeUInt16LE(centrals.length / 2, 10);
  end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

export function writeClaudeAiSkill(dir, { log = console.log } = {}) {
  const out = join(dir, `${SKILL_NAME}.zip`);
  writeFileSync(out, zipOf(skillFiles()));
  log(`Wrote ${out}: the work order walkthrough, a skill for claude.ai.`);
  log('  Upload it in claude.ai: Settings, Capabilities, Skills, "Upload skill". Then say "I want to make a work order".');
  return 0;
}
