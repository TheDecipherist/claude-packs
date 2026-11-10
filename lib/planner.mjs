// The planner-skills generator (0.10.0, STEP 3 item 5; KWB-35): one project-layout skill body per configuration, made
// from that configuration's layout template, its packs and its preamble, for a planner that briefs work before any project
// of that kind exists (or without reading one). `claude-packs planner-skills` prints them; `--out <dir>` writes
// <dir>/<configuration>/project-layout/SKILL.md. Since 1.6.0 it also bundles the claude.ai skills (`--zip <dir>`).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { availableConfigs, itemsOf, planOf, readConfig } from './configs.mjs';
import { filesUnder } from './selftest-cache.mjs';
import { zipOf } from './zip.mjs';

export function plannerSkill(name) {
  const c = readConfig(name);
  const folders = c.layout?.folders ?? {};
  const where = (k) => (folders[k.in] ? `${folders[k.in].path}/` : k.in);
  const items = itemsOf(planOf(c, [...c.packs.always, ...c.packs.default]));
  return [
    '---',
    'name: project-layout',
    `description: Use when planning, briefing or placing work in a ${name} project: where a new file, folder or kind of thing goes, and which laws hold there.`,
    '---',
    `# Project layout: ${name}`,
    '',
    c.description,
    '',
    '## Folders',
    '',
    ...Object.values(folders).map((f) => `- \`${f.path}/\`: ${f.purpose}`),
    '',
    ...(Object.keys(c.layout?.kinds ?? {}).length ? ['## What goes where', '', ...Object.values(c.layout.kinds).map((k) => `- ${k.what} → \`${where(k)}\``), ''] : []),
    '## What it installs',
    '',
    `- packs: ${c.packs.always.join(', ')}${c.packs.choose.length ? `; to choose: ${c.packs.choose.join(', ')}` : ''}`,
    `- hooks: ${items.hooks.join(', ')}`,
    `- skills: ${items.skills.join(', ') || 'none'}`,
    `- rules: ${items.rules.length} (\`npx --no-install @thedecipherist/claude-packs configs\` lists the configurations)`,
    '',
    '## House rules',
    '',
    '<constraints>',
    'Always do:',
    '- Put every kind of thing in its one place (the folders above); a new folder goes into `.claude/layout.json` first.',
    ...c.preamble.always.map((l) => `- ${l}`),
    '',
    'Never do:',
    ...c.preamble.never.map((l) => `- ${l}`),
    '</constraints>',
    '',
  ].join('\n');
}

// The skills claude.ai needs to plan a build (planner W6), bundled as they are from where they live: the planner's own, and the pack
// skills it calls. Nothing is copied into planner/ or into a pack; a law changed in its pack is the planner's at the next bundle.
const KIT = fileURLToPath(new URL('..', import.meta.url));
const TEMPLATES = { from: 'prompts/workorder/templates', to: 'templates' };
export const CLAUDE_AI_SKILLS = {
  'workorder-writer': { dir: 'planner/workorder-writer', also: TEMPLATES },
  'start-a-build': { dir: 'planner/start-a-build' },
  'ui-mockup': { dir: 'planner/ui-mockup' },
  'design-a-preset': { dir: 'packs/sound-design/skills/design-a-preset' },
  'synth-cost': { dir: 'packs/audio-core/skills/synth-cost' },
};

// The files under a kit folder, each as its path inside that folder and its text.
const textsUnder = (dir) => filesUnder(join(KIT, dir)).map((abs) => [relative(join(KIT, dir), abs), readFileSync(abs, 'utf8')]);

// One skill's folder as claude.ai takes it: { "<skill>/SKILL.md": text, "<skill>/<reference>": text, ... }. The work order templates
// ride with workorder-writer, their fill-ins left for the interview.
export function claudeAiSkillFiles(name) {
  const { dir, also } = CLAUDE_AI_SKILLS[name];
  const files = Object.fromEntries(textsUnder(dir).map(([f, text]) => [`${name}/${f}`, text]));
  for (const [f, text] of also ? textsUnder(also.from) : []) files[`${name}/${also.to}/${f}`] = text.replaceAll('{{name}}', '<name>').replaceAll('{{date}}', '<date>');
  return files;
}

// `planner-skills --zip <dir>`: one zip per skill, <dir>/<skill>.zip, each its SKILL.md and its references, nothing else.
export function writeClaudeAiZips(out, names = Object.keys(CLAUDE_AI_SKILLS), log = console.log) {
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
const STOP = new Set(('a an and are as asked asks at be by can do does for from get go has have how i if in into is it its me my of on '
  + 'one or should so someone that the their them this to use wants want what when whether which who will with would you your '
  + 'about also any each got like new now our out up way').split(' '));
const MIN_SHARED = 2;
const FOLD = { built: 'build' };
const folded = (w) => FOLD[w] ?? (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);
export const contentWords = (text) => new Set((text.toLowerCase().match(/[a-z0-9]+/g) ?? []).map(folded).filter((w) => !STOP.has(w)));
export const sharedWords = (sentence, description) => [...contentWords(sentence)].filter((w) => contentWords(description).has(w));
export function skillFor(sentence, descriptions) {
  const scored = Object.entries(descriptions).map(([name, d]) => [name, sharedWords(sentence, d).length]).sort((a, b) => b[1] - a[1]);
  const [[top, best], [, next = 0] = []] = scored;
  return best >= MIN_SHARED && best > next ? top : null;
}

const descriptionOf = (text) => text.match(/^description:\s*(.+)$/m)?.[1] ?? '';
export const claudeAiDescriptions = () => Object.fromEntries(Object.keys(CLAUDE_AI_SKILLS).map((n) => [n, descriptionOf(claudeAiSkillFiles(n)[`${n}/SKILL.md`])]));

export function plannerSkills(out = null, log = console.log, { zip = null } = {}) {
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
