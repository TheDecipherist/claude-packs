// A work order's install block (planner W3): one fenced block with the info string `claude-packs`, written by the planner in Stage 5,
// that says how the kit is set up for the order. Its keys are the kit's own: `configuration` and `packs` as `init` takes them, and the
// layout keys a project owns (`OWNED`: enable, looks, guards, commands, ...). `init --from` and `new --from` install from it, so the
// order is the one source of the set-up and nothing is copied from it by hand.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { readConfig } from './configs.mjs';
import { OWNED } from './layout.mjs';
import { sync } from './sync.mjs';

export const BLOCK_KEYS = ['configuration', 'packs', ...OWNED];
const BLOCK = /^```claude-packs[ \t]*\n([\s\S]*?)^```[ \t]*$/gm;

const listOf = (packs) => (typeof packs === 'string' ? packs.split(',').map((p) => p.trim()).filter(Boolean) : packs ?? []);

// The block in an order's text: exactly one, YAML, with only keys the kit reads. `where` names the order in a refusal.
export function installBlockOf(text, where = 'the order') {
  const blocks = [...text.matchAll(BLOCK)].map((m) => m[1]);
  if (blocks.length !== 1) throw new Error(`${where} has ${blocks.length || 'no'} install block${blocks.length > 1 ? 's' : ''} (a \`\`\`claude-packs fence); it carries exactly one`);
  let data;
  try {
    data = parse(blocks[0]);
  } catch (e) {
    throw new Error(`${where}: the install block is not YAML: ${e.message.split('\n')[0]}`);
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(`${where}: the install block holds no keys`);
  const unknown = Object.keys(data).filter((k) => !BLOCK_KEYS.includes(k));
  if (unknown.length) throw new Error(`${where}: the install block has ${unknown.map((k) => `"${k}"`).join(', ')}, a key the kit does not read. It takes: ${BLOCK_KEYS.join(', ')}. Nothing was installed`);
  const { configuration = null, packs, ...owned } = data;
  if (!Array.isArray(listOf(packs))) throw new Error(`${where}: the install block's packs is a list or a comma-separated line`);
  return { configuration, packs: listOf(packs), owned };
}

export const readInstallBlock = (path) => installBlockOf(readFileSync(path, 'utf8'), path);

// The packs to install: the block's, or with none named its configuration's defaults, as `init --config` takes them.
export const blockPacks = (block) => (block.packs.length || !block.configuration ? block.packs : readConfig(block.configuration).packs.default);

// The block's own layout keys written into layout.json, then an update, so what they switch on comes on.
export async function applyOwned(dir, owned, { force = false, log = console.log } = {}) {
  if (Object.keys(owned).length === 0) return;
  const file = join(dir, '.claude', 'layout.json');
  writeFileSync(file, `${JSON.stringify({ ...JSON.parse(readFileSync(file, 'utf8')), ...owned }, null, 2)}\n`);
  log(`  install block: ${Object.keys(owned).join(', ')} written into .claude/layout.json; updating`);
  await sync(dir, null, { force, mkdirs: true, log });
}

// `init --from <order>`: the configuration and packs as `init` installs them, then the owned keys, then an update.
export async function installFrom(dir, path, { force = false, log = console.log } = {}) {
  const block = readInstallBlock(path);
  await sync(dir, blockPacks(block), { force, mkdirs: true, config: block.configuration, log });
  await applyOwned(dir, block.owned, { force, log });
  return block;
}
