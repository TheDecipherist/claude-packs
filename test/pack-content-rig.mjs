// The conformance gate's checks (typescript order W7 (a), survey pack-content.md section 5): one function reads the content files of
// every pack in a folder (rules, checks, skills, pack.json) and says which check each one fails. test/pack-content.test.mts holds the
// hard set, the files changed on the branch and the ratchet; the scaffold test reads a new pack with the same function.
import { existsSync, readdirSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { isDir, readText, walk } from '../packs/base/hooks/lib/files.mjs';
import { parseJson, readJson } from '../packs/base/hooks/lib/json.mjs';
import { missingKeys, manifestProblems } from '../lib/pack-manifest.mjs';
/** The checks no file may fail, new or old: the rest is a ratchet on old files and a law for new or changed ones. */
export const HARD = new Set(['R2', 'R3', 'R4', 'C1', 'C4', 'S1', 'S2', 'S5', 'P1', 'P2', 'P5', 'P6']);
/** The fields a lesson check may have (CLAUDE.md "Authoring pack content", plus the four it never named). */
export const CHECK_FIELDS = new Set(['id', 'why', 'rule', 'globs', 'concepts', 'exclude', 'pattern', 'code', 'strings', 'language', 'mode', 'needs', 'whenDep', 'kind', 'bad', 'good', 'notInTests', 'newFilesOnly', 'replaces', 'flags', 'prose', 'examples']);
const PROJECT_NAMES = /\b(?:Stellix|Solera|MegaSynth|MPX)\b/;
const SECOND_PERSON = /\byou (?:can|should|must)\b|\bWe must\b/i;
const HEDGES = /\b(?:Maybe|Consider|perhaps|probably)\b/;
const DASHES = /[–—]/;
/** The style faults of a text: another project's name, advice in the second person, a hedge, a dash. A pack may name its own project. */
export function styleFaults(text, pack) {
    const own = pack === 'stellix';
    return [
        ...(!own && PROJECT_NAMES.test(text) ? ['names a project'] : []),
        ...(SECOND_PERSON.test(text) ? ['speaks to "you"'] : []),
        ...(HEDGES.test(text) ? ['hedges'] : []),
        ...(DASHES.test(text) ? ['has a dash'] : []),
    ];
}
const FRONT = /^---\n([\s\S]*?)\n---\n/;
const frontOf = (text) => {
    const m = FRONT.exec(text);
    return m ? { front: m[1] ?? '', body: text.slice(m[0].length) } : { front: '', body: text };
};
/** Heading lines of a Markdown body, leaving out fenced code. */
const headings = (body, depth) => {
    let fenced = false;
    const out = [];
    for (const line of body.split('\n')) {
        if (/^\s*(?:```|~~~)/.test(line))
            fenced = !fenced;
        else if (!fenced && line.startsWith(`${'#'.repeat(depth)} `))
            out.push(line.slice(depth + 1).trim());
    }
    return out;
};
const sectionOf = (body, name) => {
    const at = body.search(new RegExp(`^## (?:${name.source})\\s*$`, 'm'));
    if (at < 0)
        return '';
    const rest = body.slice(at).split('\n').slice(1).join('\n');
    return rest.split(/^## /m)[0] ?? '';
};
const listing = (dir, ext) => (isDir(dir) ? readdirSync(dir).filter((f) => ext.test(f)).sort() : []);
/** The check ids that point at each rule file of a pack (by the rule's file name). */
function checksByRule(packDir) {
    const by = new Map();
    for (const f of listing(join(packDir, 'checks'), /\.json$/)) {
        const c = readJson(join(packDir, 'checks', f));
        if (typeof c?.rule === 'string' && c.rule !== '')
            by.set(basename(c.rule), [...(by.get(basename(c.rule)) ?? []), c.id ?? f]);
    }
    return by;
}
function ruleChecks({ packsDir, known, add }, pack, file, text, pointed) {
    const rel = relative(packsDir, file);
    const { front, body } = frontOf(text);
    const hook = /^# hook:\s*(\S+)\s*$/m.exec(front)?.[1];
    const concepts = /^# concepts:\s*(.+)$/m.exec(front)?.[1]?.split(',').map((c) => c.trim()).filter(Boolean) ?? [];
    if (!((concepts.length > 0 && /^paths:/m.test(front)) || hook !== undefined))
        add('R1', rel, 'frontmatter is not `# concepts:` with `paths:`, or `# hook:`');
    const h1 = headings(body, 1);
    if (h1.length !== 1 || (h1[0] ?? '').length > 110)
        add('R2', rel, `needs one title of at most 110 characters (has ${h1.length})`);
    const open = body.split('<constraints>').length - 1;
    const close = body.split('</constraints>').length - 1;
    if (open !== 1 || close !== 1)
        add('R3', rel, `needs one <constraints> block, opened and closed (${open} open, ${close} close)`);
    const block = body.slice(body.indexOf('<constraints>') + 1, close ? body.indexOf('</constraints>') : undefined);
    if (!/^Always do/m.test(block) || !/^Never do/m.test(block))
        add('R4', rel, 'the block needs an "Always do" and a "Never do" heading');
    if (headings(body, 2).some((h) => /^(?:The law|Exceptions|Enforced)$/.test(h)))
        add('R5', rel, 'has an old-form heading (The law, Exceptions, Enforced)');
    const section = sectionOf(body, /Checks?/);
    const unnamed = pointed.filter((id) => !section.includes(`\`${id}\``));
    if (unnamed.length)
        add('R6', rel, `its \`## Check\` does not name ${unnamed.join(', ')}`);
    const style = styleFaults(text, pack);
    if (style.length)
        add('R7', rel, style.join(', '));
    for (const c of concepts)
        if (!known.has(c))
            add('P5', rel, `concept "${c}" is defined by no pack.json or configuration`);
    // base is always installed, so a hook it holds is there for every pack's rule (skill-first serves two packs' skills)
    const stem = hook?.replace(/\.m?js$|\.mts$/, '');
    if (stem !== undefined && ![pack, 'base'].some((p) => existsSync(join(packsDir, p, 'hooks', `${stem}.mts`))))
        add('P6', rel, `its hook ${hook ?? ''} is in neither the ${pack} pack nor base`);
}
function checkChecks({ packsDir, add }, pack, file, ids) {
    const rel = relative(packsDir, file);
    const raw = readText(file) ?? '';
    const c = parseJson(raw);
    if (c === null) {
        add('C4', rel, 'is not JSON');
        return;
    }
    const str = (key) => (typeof c[key] === 'string' ? c[key] : '');
    const rule = str('rule');
    const ownRule = rule !== '' && ['rules'].some((d) => existsSync(join(packsDir, pack, d, basename(rule))) || existsSync(join(packsDir, 'base', d, basename(rule))));
    if (!ownRule)
        add('C1', rel, rule === '' ? 'has no `rule`' : `its rule ${rule} is in neither this pack nor base`);
    if (!Array.isArray(c.exclude))
        add('C2', rel, 'has no `exclude`');
    const where = (key) => Array.isArray(c[key]) && c[key].length > 0;
    if (!where('concepts') && !where('globs'))
        add('C3', rel, 'names no `concepts` or `globs`');
    const name = basename(file, '.json');
    const twin = ids.get(str('id'));
    if (str('id') !== name || (twin !== undefined && twin !== rel) || str('bad') === '' || str('good') === '')
        add('C4', rel, 'needs its id equal to the file name (once in the kit), and `bad` and `good`');
    ids.set(str('id'), rel);
    if (str('good').length < 25)
        add('C5', rel, '`good` is a stub (under 25 characters)');
    if (!['code', 'strings', 'language'].some((key) => key in c))
        add('C6', rel, 'states none of `code`, `strings`, `language`');
    if (styleFaults(str('why'), pack).length)
        add('C7', rel, `\`why\` ${styleFaults(str('why'), pack).join(', ')}`);
    const unknown = Object.keys(c).filter((key) => !CHECK_FIELDS.has(key));
    if (unknown.length)
        add('C8', rel, `unknown fields: ${unknown.join(', ')}`);
}
function skillChecks({ packsDir, add }, pack, file, names) {
    const rel = relative(packsDir, file);
    const text = readText(file) ?? '';
    const { front, body } = frontOf(text);
    const fields = Object.fromEntries(front.split('\n').flatMap((l) => { const m = /^([\w-]+):\s*(.*)$/.exec(l); return m ? [[m[1] ?? '', m[2] ?? '']] : []; }));
    const folder = basename(join(file, '..'));
    const description = fields.description ?? '';
    if (!description.startsWith('Use when'))
        add('S1', rel, 'its description does not start "Use when"');
    const other = names.get(fields.name ?? '');
    if (fields.name !== folder || Object.keys(fields).join() !== 'name,description' || (other !== undefined && other !== rel))
        add('S2', rel, 'needs `name` equal to its folder (and to no other skill\'s), and only `name` and `description`');
    names.set(fields.name ?? '', rel);
    if (!/<constraints>[\s\S]*^Always do[\s\S]*^Never do[\s\S]*<\/constraints>/m.test(body))
        add('S3', rel, 'needs <constraints> with "Always do" and "Never do"');
    if (!/^# .*\(one job: .+\)\s*$/m.test(body))
        add('S4', rel, 'its title does not end "(one job: ...)"');
    if (text.length > 8000)
        add('S5', rel, `is ${text.length} characters (limit 8,000)`);
    const unnamed = walk(join(file, '..')).map((f) => relative(join(file, '..'), f)).filter((f) => f !== 'SKILL.md' && !text.includes(basename(f)) && !text.includes(f.split('/')[0] ?? ''));
    if (unnamed.length)
        add('S6', rel, `does not name ${unnamed.join(', ')}`);
    if (styleFaults(text, pack).length)
        add('S7', rel, styleFaults(text, pack).join(', '));
    if (description.length > 200)
        add('S8', rel, `its description is ${description.length} characters (limit 200)`);
}
function packChecks({ packsDir, add }, pack) {
    const rel = join(pack, 'pack.json');
    const manifest = readJson(join(packsDir, rel));
    if (manifest === null) {
        add('P1', rel, 'is not JSON');
        return;
    }
    const problems = manifestProblems(manifest, pack);
    if (problems.length)
        add('P1', rel, problems.join('; '));
    const keywords = Array.isArray(manifest.keywords) ? manifest.keywords : [];
    const directory = manifest.repository !== undefined && 'directory' in manifest.repository ? manifest.repository.directory : undefined;
    if (keywords.length === 0 || directory !== `packs/${pack}` || manifest.engines === undefined)
        add('P2', rel, 'needs keywords, repository.directory `packs/<name>` and engines');
    const keys = missingKeys(manifest);
    if (isDir(join(packsDir, pack, 'skills')) && !('skillsIn' in manifest))
        add('P3', rel, 'has skills but no `skillsIn`');
    const rest = keys.filter((k) => k !== 'skillsIn');
    if (rest.length)
        add('P4', rel, `lacks ${rest.join(', ')}`);
}
/** The concepts a kit defines: its packs' `concepts` and its configurations' layouts'. */
export function conceptsOf(packsDir, configs = []) {
    const names = new Set(configs.flatMap((c) => Object.keys(c.layout?.concepts ?? {})));
    for (const p of listing(packsDir, /^[a-z]/))
        for (const k of Object.keys(readJson(join(packsDir, p, 'pack.json'))?.concepts ?? {}))
            names.add(k);
    return names;
}
/** Every finding in every pack of a folder (`packs/` of the kit, or of a new pack's repository). */
export function conformance(packsDir, known) {
    const out = [];
    const ctx = { packsDir, known, add: (id, file, note) => { out.push({ id, file, note }); } };
    const ids = new Map();
    const names = new Map();
    for (const pack of listing(packsDir, /^[a-z][\w-]*$/).filter((p) => existsSync(join(packsDir, p, 'pack.json')))) {
        const dir = join(packsDir, pack);
        packChecks(ctx, pack);
        const pointed = checksByRule(dir);
        for (const f of listing(join(dir, 'rules'), /\.md$/))
            ruleChecks(ctx, pack, join(dir, 'rules', f), readText(join(dir, 'rules', f)) ?? '', pointed.get(f) ?? []);
        for (const f of listing(join(dir, 'checks'), /\.json$/))
            checkChecks(ctx, pack, join(dir, 'checks', f), ids);
        for (const d of listing(join(dir, 'skills'), /./))
            if (existsSync(join(dir, 'skills', d, 'SKILL.md')))
                skillChecks(ctx, pack, join(dir, 'skills', d, 'SKILL.md'), names);
    }
    return out;
}
/** How many files fail each check, for the ratchet: `{ R1: 86, ... }` in the survey's order. */
export function countsOf(findings) {
    const files = new Map();
    for (const f of findings)
        files.set(f.id, (files.get(f.id) ?? new Set()).add(f.file));
    return Object.fromEntries([...files].sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true })).map(([id, set]) => [id, set.size]));
}
