// A work order's install block (planner W3): one fenced block with the info string `claude-packs`, written by the planner in Stage 5,
// that says how the kit is set up for the order. Its keys are the kit's own: `configuration` and `packs` as `init` takes them, and the
// layout keys a project owns (`OWNED`: enable, looks, guards, commands, ...). `init --from` and `new --from` install from it, so the
// order is the one source of the set-up and nothing is copied from it by hand.
import { join } from 'node:path';
import { parse } from 'yaml';
import { readText } from '../packs/base/hooks/lib/files.mts';
import { readJson, writeJson } from '../packs/base/hooks/lib/json.mts';
import type { Logger } from '../packs/base/hooks/lib/types.d.mts';
import { readConfig } from './configs.mts';
import { OWNED } from './layout.mts';
import { sync } from './sync.mts';

export const BLOCK_KEYS: readonly string[] = ['configuration', 'packs', ...OWNED];
const BLOCK = /^```claude-packs[ \t]*\n([\s\S]*?)^```[ \t]*$/gm;

/** What an install block says: the configuration and packs `init` takes, and the layout keys the project owns. */
export interface InstallBlock { configuration: string | null; packs: string[]; owned: Record<string, unknown> }

const listOf = (packs: unknown): unknown => (typeof packs === 'string' ? packs.split(',').map((p) => p.trim()).filter(Boolean) : packs ?? []);

/** The block in an order's text: exactly one, YAML, with only keys the kit reads. `where` names the order in a refusal. */
export function installBlockOf(text: string, where = 'the order'): InstallBlock {
  const blocks = [...text.matchAll(BLOCK)].map((m) => m[1] ?? '');
  if (blocks.length !== 1) throw new Error(`${where} has ${blocks.length || 'no'} install block${blocks.length > 1 ? 's' : ''} (a \`\`\`claude-packs fence); it carries exactly one`);
  let data: unknown;
  try {
    data = parse(blocks[0] ?? '');
  } catch (e) {
    throw new Error(`${where}: the install block is not YAML: ${(e instanceof Error ? e.message : String(e)).split('\n')[0]}`);
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(`${where}: the install block holds no keys`);
  const keys = data as Record<string, unknown>;
  const unknown = Object.keys(keys).filter((k) => !BLOCK_KEYS.includes(k));
  if (unknown.length) throw new Error(`${where}: the install block has ${unknown.map((k) => `"${k}"`).join(', ')}, a key the kit does not read. It takes: ${BLOCK_KEYS.join(', ')}. Nothing was installed`);
  const { configuration = null, packs, ...owned } = keys;
  const list = listOf(packs);
  if (!Array.isArray(list)) throw new Error(`${where}: the install block's packs is a list or a comma-separated line`);
  return { configuration: typeof configuration === 'string' ? configuration : null, packs: list.map(String), owned };
}

/** The install block of the order at `path`. */
export function readInstallBlock(path: string): InstallBlock {
  const text = readText(path);
  if (text === null) throw new Error(`${path}: cannot read the order`);
  return installBlockOf(text, path);
}

/** The packs to install: the block's, or with none named its configuration's defaults, as `init --config` takes them. */
export const blockPacks = (block: InstallBlock): string[] => (block.packs.length || !block.configuration ? block.packs : [...readConfig(block.configuration).packs.default]);

export interface InstallOptions { force?: boolean; log?: Logger }

/** The block's own layout keys written into layout.json, then an update, so what they switch on comes on. */
export async function applyOwned(dir: string, owned: Record<string, unknown>, { force = false, log = console.log }: InstallOptions = {}): Promise<void> {
  if (Object.keys(owned).length === 0) return;
  const file = join(dir, '.claude', 'layout.json');
  const layout = readJson<Record<string, unknown>>(file);
  if (layout === null) throw new Error(`${file} is not valid JSON; fix it first, nothing was changed`);
  if (!writeJson(file, { ...layout, ...owned }, { pretty: true })) throw new Error(`could not write ${file}`);
  log(`  install block: ${Object.keys(owned).join(', ')} written into .claude/layout.json; updating`);
  await sync(dir, null, { force, mkdirs: true, log });
}

/** `init --from <order>`: the configuration and packs as `init` installs them, then the owned keys, then an update. */
export async function installFrom(dir: string, path: string, { force = false, log = console.log }: InstallOptions = {}): Promise<InstallBlock> {
  const block = readInstallBlock(path);
  await sync(dir, blockPacks(block), { force, mkdirs: true, config: block.configuration, log });
  await applyOwned(dir, block.owned, { force, log });
  return block;
}
