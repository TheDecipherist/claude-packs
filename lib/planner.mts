// The planner-skills generator (0.10.0, STEP 3 item 5; KWB-35): one project-layout skill body per configuration, made
// from that configuration's layout template, its packs and its preamble, for a planner that briefs work before any project
// of that kind exists (or without reading one). `claude-packs planner-skills` prints them; `--out <dir>` writes
// <dir>/<configuration>/project-layout/SKILL.md. Since 1.6.0 it also bundles the claude.ai skills (`--zip <dir>`).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readText } from '../packs/base/hooks/lib/files.mts';
import type { Configuration, LayoutKind, Logger } from '../packs/base/hooks/lib/types.d.mts';
import { availableConfigs, itemsOf, planOf, readConfig } from './configs.mts';
import { kitCommandAnywhere } from './kit-command.mts';
import { filesUnder } from './selftest-cache.mts';
import { zipOf } from './zip.mts';

/** A configuration's house rules: types.d.mts says a list, the config.json files hold { always, never }. */
interface Preamble { always: readonly string[]; never: readonly string[] }

const lines = (value: unknown): string[] => (Array.isArray(value) ? value.filter((l): l is string => typeof l === 'string') : []);
function preambleOf(config: Configuration): Preamble {
  const own: unknown = config.preamble;
  const read = (key: string): string[] => (typeof own === 'object' && own !== null && !Array.isArray(own) ? lines(Object.entries(own).find(([k]) => k === key)?.[1]) : []);
  return { always: read('always'), never: read('never') };
}

/** The project-layout skill body of one configuration. */
export function plannerSkill(name: string): string {
  const c = readConfig(name);
  const folders = c.layout?.folders ?? {};
  const kinds: LayoutKind[] = Object.values(c.layout?.kinds ?? {});
  const where = (k: LayoutKind): string => {
    const folder = k.in === undefined ? undefined : folders[k.in];
    return folder ? `${folder.path}/` : k.in ?? '';
  };
  const items = itemsOf(planOf(c, [...c.packs.always, ...c.packs.default]));
  const preamble = preambleOf(c);
  return [
    '---',
    'name: project-layout',
    `description: Use when planning, briefing or placing work in a ${name} project: where a new file, folder or kind of thing goes, and which laws hold there.`,
    '---',
    `# Project layout: ${name}`,
    '',
    c.description ?? '',
    '',
    '## Folders',
    '',
    ...Object.values(folders).map((f) => `- \`${f.path}/\`: ${f.purpose}`),
    '',
    ...(kinds.length ? ['## What goes where', '', ...kinds.map((k) => `- ${k.what} → \`${where(k)}\``), ''] : []),
    '## What it installs',
    '',
    `- packs: ${c.packs.always.join(', ')}${c.packs.choose.length ? `; to choose: ${c.packs.choose.join(', ')}` : ''}`,
    `- hooks: ${items.hooks.join(', ')}`,
    `- skills: ${items.skills.join(', ') || 'none'}`,
    `- rules: ${items.rules.length} (\`${kitCommandAnywhere()} configs\` lists the configurations)`,
    '',
    '## House rules',
    '',
    '<constraints>',
    'Always do:',
    '- Put every kind of thing in its one place (the folders above); a new folder goes into `.claude/layout.json` first.',
    ...preamble.always.map((l) => `- ${l}`),
    '',
    'Never do:',
    ...preamble.never.map((l) => `- ${l}`),
    '</constraints>',
    '',
  ].join('\n');
}

// The skills claude.ai needs to plan a build (planner W6), bundled as they are from where they live: the planner's own, and the pack
// skills it calls. Nothing is copied into planner/ or into a pack; a law changed in its pack is the planner's at the next bundle.
const KIT = fileURLToPath(new URL('..', import.meta.url));

/** One claude.ai skill: where its folder lives in the kit, and a folder of extra files that rides with it. */
interface ClaudeAiSkill { dir: string; also?: { from: string; to: string } }

const TEMPLATES = { from: 'prompts/workorder/templates', to: 'templates' };
export const CLAUDE_AI_SKILLS: Readonly<Record<string, ClaudeAiSkill>> = {
  'workorder-writer': { dir: 'planner/workorder-writer', also: TEMPLATES },
  'start-a-build': { dir: 'planner/start-a-build' },
  'ui-mockup': { dir: 'planner/ui-mockup' },
  'design-a-preset': { dir: 'packs/sound-design/skills/design-a-preset' },
  'synth-cost': { dir: 'packs/audio-core/skills/synth-cost' },
};

// The files under a kit folder, each as its path inside that folder and its text.
const textsUnder = (dir: string): [string, string][] => filesUnder(join(KIT, dir)).map((abs): [string, string] => [relative(join(KIT, dir), abs), readText(abs) ?? '']);

/** One skill's folder as claude.ai takes it: { "<skill>/SKILL.md": text, "<skill>/<reference>": text, ... }. The work order templates
 *  ride with workorder-writer, their fill-ins left for the interview. */
export function claudeAiSkillFiles(name: string): Record<string, string> {
  const skill = CLAUDE_AI_SKILLS[name];
  if (!skill) throw new Error(`unknown claude.ai skill "${name}" (available: ${Object.keys(CLAUDE_AI_SKILLS).join(', ')})`);
  const { dir, also } = skill;
  const kit = (text: string): string => text.replaceAll('{{kit}}', kitCommandAnywhere());
  const files = Object.fromEntries(textsUnder(dir).map(([f, text]) => [`${name}/${f}`, kit(text)]));
  for (const [f, text] of also ? textsUnder(also.from) : []) files[`${name}/${also?.to}/${f}`] = kit(text).replaceAll('{{name}}', '<name>').replaceAll('{{date}}', '<date>');
  return files;
}

/** `planner-skills --zip <dir>`: one zip per skill, <dir>/<skill>.zip, each its SKILL.md and its references, nothing else. */
export function writeClaudeAiZips(out: string, names: readonly string[] = Object.keys(CLAUDE_AI_SKILLS), log: Logger = console.log): number {
  mkdirSync(out, { recursive: true });
  for (const name of names) {
    writeFileSync(join(out, `${name}.zip`), zipOf(claudeAiSkillFiles(name)));
    log(`  wrote ${join(out, `${name}.zip`)}`);
  }
  log('Upload each zip in claude.ai as a skill (Settings, then the skills section), then say "I want to build a synth".');
  return 0;
}

// The kit's trigger-word match: the content words a sentence shares with each skill's description (its "Use when" list), plurals
// folded and the words any sentence has left out. The sentence goes to the one description that shares the most, and at least
// MIN_SHARED; a tie at the top, or no description that close, is a misfire (null).
const STOP: ReadonlySet<string> = new Set(('a an and are as asked asks at be by can do does for from get go has have how i if in into is it its me my of on '
  + 'one or should so someone that the their them this to use wants want what when whether which who will with would you your '
  + 'about also any each got like new now our out up way').split(' '));
const MIN_SHARED = 2;
const FOLD: Readonly<Record<string, string>> = { built: 'build' };
const folded = (w: string): string => FOLD[w] ?? (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);
export const contentWords = (text: string): Set<string> => new Set((text.toLowerCase().match(/[a-z0-9]+/g) ?? []).map(folded).filter((w) => !STOP.has(w)));
export const sharedWords = (sentence: string, description: string): string[] => [...contentWords(sentence)].filter((w) => contentWords(description).has(w));

/** The skill whose description shares the most content words with the sentence, or null for a tie, or fewer than two shared. */
export function skillFor(sentence: string, descriptions: Readonly<Record<string, string>>): string | null {
  const scored = Object.entries(descriptions).map(([name, d]): [string, number] => [name, sharedWords(sentence, d).length]).sort((a, b) => b[1] - a[1]);
  const [top, runnerUp] = scored;
  if (!top) return null;
  const best = top[1];
  const next = runnerUp?.[1] ?? 0;
  return best >= MIN_SHARED && best > next ? top[0] : null;
}

const descriptionOf = (text: string): string => text.match(/^description:\s*(.+)$/m)?.[1] ?? '';
export const claudeAiDescriptions = (): Record<string, string> => Object.fromEntries(Object.keys(CLAUDE_AI_SKILLS).map((n) => [n, descriptionOf(claudeAiSkillFiles(n)[`${n}/SKILL.md`] ?? '')]));

export interface PlannerOptions { zip?: string | null }

/** `planner-skills`: print each configuration's skill body, write them under `out`, or with `zip` bundle the claude.ai skills. */
export function plannerSkills(out: string | null = null, log: Logger = console.log, { zip = null }: PlannerOptions = {}): number {
  if (zip) return writeClaudeAiZips(zip, undefined, log);
  for (const name of availableConfigs()) {
    const body = plannerSkill(name);
    if (!out) { log(`==> ${name}/project-layout/SKILL.md\n${body}`); continue; }
    const dir = join(out, name, 'project-layout');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'SKILL.md'), body);
    log(`  wrote ${join(dir, 'SKILL.md')}`);
  }
  if (!out) for (const name of Object.keys(CLAUDE_AI_SKILLS)) log(`==> ${name}/SKILL.md\n${claudeAiSkillFiles(name)[`${name}/SKILL.md`]}`);
  return 0;
}
