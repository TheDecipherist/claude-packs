// `claude-packs workorder <name>`: the three files a project needs to build on its own, from what two whole builds taught: the order, the prompt that runs
// it with nobody there, and the runner that starts session after session. The steps are the author's; the `write-a-workorder` skill says how to write them.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { kitCommand } from './kit-command.mjs';

const PROMPTS = fileURLToPath(new URL('../prompts/workorder/', import.meta.url));
export const TEMPLATES = join(PROMPTS, 'templates');
const FILES = ['workorder.md', 'PROMPT.md', 'run.sh'];
export const DEFAULT_TEMPLATE = 'generic';

// The steps a work order starts from, one file per kind of build in `templates/`, chosen with --template <kind> and never by the
// project's configuration (a rebuild and a new synth share synth-creator): `generic` (blank steps, the default), `plugin` (a new
// synth or effect, the house's decisions written in), `rebuild` (a hardware instrument rebuilt as a plugin, from four rebuilds).
export const workorderTemplates = () => readdirSync(TEMPLATES).map((f) => f.match(/^([\w-]+)\.md$/)?.[1]).filter(Boolean).sort();
export const templateText = (template) => readFileSync(join(TEMPLATES, `${template}.md`), 'utf8');

// Refuses a template the kit does not have, naming the ones it has, before anything is written.
export function assertTemplate(template) {
  if (!workorderTemplates().includes(template)) {
    throw new Error(`no work order template "${template}": the kit has ${workorderTemplates().join(', ')}. Nothing was written`);
  }
}

/** A name a command makes a folder of: letters, digits, . _ -, never starting with - (KWB-142: `workorder --help` made `--help/`). */
export const isPlainName = (name) => typeof name === 'string' && /^\w[\w.-]*$/.test(name);

export function newWorkorder(dir, name, { log = console.log, template = DEFAULT_TEMPLATE } = {}) {
  if (!isPlainName(name)) throw new Error(`name the work order: \`${kitCommand(dir)} workorder <name>\``);
  assertTemplate(template);
  const folder = join(dir, 'docs', 'workorders', name);
  if (existsSync(folder)) throw new Error(`docs/workorders/${name} already exists: nothing was written`);
  mkdirSync(folder, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  for (const file of FILES) {
    const source = file === 'workorder.md' ? join(TEMPLATES, `${template}.md`) : join(PROMPTS, file);
    const text = readFileSync(source, 'utf8').replaceAll('{{name}}', name).replaceAll('{{date}}', date).replaceAll('{{kit}}', kitCommand(dir));
    writeFileSync(join(folder, file), text, { mode: file.endsWith('.sh') ? 0o755 : 0o644 });
  }
  log(`Work order: docs/workorders/${name}/ (template ${template})`);
  log('  1. Write the steps in workorder.md, with Claude if you like: the write-a-workorder skill says how.');
  log(`  2. To watch it, type in Claude Code: Run docs/workorders/${name}/PROMPT.md`);
  log(`  3. To leave it running, read run.sh, then: bash docs/workorders/${name}/run.sh`);
  return 0;
}
