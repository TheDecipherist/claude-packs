// claude-packs scan (0.16.0: a project owner runs it before choosing to install anything). A real install's review found bugs that
// "could have been super bad on production", so the scan is that review, on a copy:
//   1. the project's files are copied to a temp folder (what git tracks or would track; never .env, keys, node_modules or build output),
//      so the project itself, its .git included, is never written to;
//   2. the recommended packs are installed into the copy (lib/scan-detect.mjs says which, with the evidence);
//   3. every check runs over every file, and the secret patterns, the line limit and coverage with them;
//   4. the report and every hit go beside the copy. A hit is a candidate, not a bug: a real install's run had 189 real of 302 counted.
// The bugs that hurt most are the ones no check sees, so the report ends with the review step: `scan --prompt` (prompts/scan-review.md).
import { execFileSync } from 'node:child_process';
import { copyFileSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readLayout } from '../packs/base/hooks/lib/layout.mjs';
import { isSecretFile } from '../packs/base/hooks/secrets-guard.mjs';
import { sourceFilesOf } from './configs.mjs';
import { SOURCE, coverage } from './coverage.mjs';
import { onceOnlyDoctor } from './once-only-report.mjs';
import { PACKS_DIR, availablePacks } from './packs.mjs';
import { nearCopies, remadeNames, repeatLine, repeatedShapes } from './repeats.mjs';
import { rememberScan } from './fix-plan.mjs';
import { recommend } from './scan-detect.mjs';
import { sync } from './sync.mjs';

const SKIP = /(^|\/)(\.git|node_modules|dist|build|out|coverage|\.next|\.claude|_deps|JUCE|cmake-build[^/]*)(\/|$)/;
const MAX_BYTES = 1_000_000;
const SHOWN = 5;
const KINDS = [
  ['security', /\b(?:secrets?|tokens?|xss|injection|credentials?|passwords?|csrf|redirects?|sanitize\w*|escape[sd]?|untrusted|helmet|cookies?)\b/i],
  ['failures and lost data', /\b(?:swallow\w*|lost|silently|crash\w*|shutdown|unhandled\w*|delete\w*|drops?|transaction\w*|floating|never stops?)\b/i],
  ['quality', /./],
];

function walk(root, dir = root) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const abs = join(dir, e.name);
    if (SKIP.test(relative(root, abs))) return [];
    return e.isDirectory() ? walk(root, abs) : [relative(root, abs).replace(/\\/g, '/')];
  });
}

export function filesOf(dir) {
  try {
    return execFileSync('git', ['-C', dir, 'ls-files', '-co', '--exclude-standard', '-z'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 }).split('\0').filter(Boolean);
  } catch {
    return walk(dir);
  }
}

const copyable = (dir, rel) => {
  if (SKIP.test(rel) || isSecretFile(rel)) return false;
  try { const s = lstatSync(join(dir, rel)); return s.isFile() && s.size <= MAX_BYTES; } catch { return false; }
};

function snapshot(dir, files) {
  const copy = mkdtempSync(join(tmpdir(), 'claude-packs-scan-'));
  for (const rel of files) {
    mkdirSync(dirname(join(copy, rel)), { recursive: true });
    copyFileSync(join(dir, rel), join(copy, rel));
  }
  return copy;
}

// A line as it may be shown: long tokens masked, so a report can be passed around.
const shown = (text) => text.replace(/[A-Za-z0-9_+/=-]{24,}/g, '[masked]').slice(0, 110);
const packOf = (file) => availablePacks().find((p) => { try { return lstatSync(join(PACKS_DIR, p, 'checks', file)).isFile(); } catch { return false; } }) ?? '?';

async function runChecks(copy, files) {
  const hook = (name) => import(pathToFileURL(join(copy, '.claude/hooks', name)).href);
  const { loadChecks, hitsOf } = await hook('lesson-checks.mjs');
  const { matchesAny } = await hook('lib/glob.mjs');
  const { SECRETS } = await hook('secrets-guard.mjs');
  const texts = files.map((rel) => [rel, readFileSync(join(copy, rel), 'utf8')]).filter(([, t]) => !t.includes('\0'));
  const results = [];
  for (const c of loadChecks(copy)) {
    const hits = texts.filter(([rel]) => matchesAny(rel, c.globs) && !matchesAny(rel, c.exclude ?? []))
      .flatMap(([rel, text]) => hitsOf(c, text).map((h) => ({ file: rel, line: h.line, text: shown(h.text) })));
    if (hits.length) results.push({ id: c.id, why: c.why, rule: c.rule, pack: packOf(c.file), kind: c.kind ?? KINDS.find(([, re]) => re.test(`${c.id} ${c.why}`))[0], hits });
  }
  const secrets = texts.flatMap(([rel, text]) => SECRETS.flatMap(([name, re]) => [...text.matchAll(re)].map((m) => ({ file: rel, line: text.slice(0, m.index).split('\n').length, name }))));
  return { results, secrets, texts };
}

function report({ dir, copy, pick, results, secrets, skipped, longFiles, cov, dups, handBuilt, near, remade, count }) {
  const total = results.reduce((n, r) => n + r.hits.length, 0);
  const packs = [...pick.always, ...pick.packs.map((p) => p.pack)];
  const out = ['# claude-packs scan', '', `${dir}: ${count} files read, on a copy. Nothing in the project was changed.`, ''];
  const inTests = (s) => /(^|\/)(tests?|__tests__|fixtures?)\/|\.(test|spec)\./.test(s.file);
  const live = secrets.filter((s) => !inTests(s));
  if (live.length) out.push(`**Look at this first: ${live.length} possible secret(s) in the code, listed below. Any that is real is leaked: rotate it.**`, '');
  out.push(`${total} check hits in ${new Set(results.flatMap((r) => r.hits.map((h) => h.file))).size} files. A hit is a candidate, not a confirmed bug: someone has to read it. The worst bugs are usually the ones no check can see, so the review step at the end matters more than this list.`, '');
  out.push('## What to install', '', `Configuration \`${pick.config}\` (${pick.why}), packs: ${packs.join(', ')}.`, '');
  for (const p of pick.packs) out.push(`- \`${p.pack}\`: ${p.why}`);
  if (pick.leftOut.length) out.push('', `Left out, nothing found for them: ${pick.leftOut.join(', ')}.`);
  if (pick.fullStack) out.push('', 'Next.js and Fastify are both here: the `full-stack` configuration may fit, but it fixes a folder layout and has fewer checks. Compare before choosing.');
  out.push('', '```', `npx --no-install @thedecipherist/claude-packs init ${pick.packs.map((p) => p.pack).join(' ')} --config ${pick.config}`, '```', '');
  if (secrets.length) {
    out.push('## Secrets', '', 'Values are never shown. Secret-shaped text in test files is usually a planted example, and is listed apart.', '');
    for (const s of live) out.push(`- ${s.file}:${s.line}: ${s.name}`);
    const planted = secrets.filter(inTests);
    if (planted.length) out.push('', `In test files (${planted.length}):`, ...planted.map((s) => `- ${s.file}:${s.line}: ${s.name}`));
    out.push('');
  }
  out.push('## Check hits', '', 'Grouped by a keyword match on what each check is for, so the groups are rough.', '');
  for (const [kind] of KINDS) {
    const rows = results.filter((r) => r.kind === kind).sort((a, b) => b.hits.length - a.hits.length);
    if (!rows.length) continue;
    out.push(`### ${kind}`, '');
    for (const r of rows) {
      out.push(`**${r.id}** (${r.pack}): ${r.hits.length}. ${r.why}`, '');
      for (const h of r.hits.slice(0, SHOWN)) out.push(`- ${h.file}:${h.line}: \`${h.text.replace(/`/g, "'")}\``);
      if (r.hits.length > SHOWN) out.push(`- and ${r.hits.length - SHOWN} more (all in claude-packs-scan.json)`);
      out.push('');
    }
  }
  out.push('## Structure', '', `- ${longFiles.length} source file(s) over 300 lines${longFiles.length ? `: ${longFiles.slice(0, 8).join(', ')}` : ''}`, `- ${dups}`, `- ${handBuilt.length} repeat(s) written by hand, each of which should be one template${handBuilt.length ? ':' : ''}`, ...handBuilt.slice(0, 12).map(repeatLine), `- ${near.length} near cop(ies), the same code with lines changed${near.length ? ':' : ''}`, ...near.slice(0, 8).map((n) => `  - ${n.file}:${n.line} ~ ${n.other}:${n.from}-${n.to} (${n.matched} of ${n.of} statements)`), `- ${remade.length} function(s) made again under the same name${remade.length ? ':' : ''}`, ...remade.slice(0, 8).map((m) => `  - ${m.name}: ${m.at.join(', ')}`));
  out.push(`- ${cov.uncovered.length} source file(s) no rule covers yet; the layout is fitted to the project at install`, '');
  if (skipped.length) out.push(`Not read: ${skipped.length} file(s), secret files, symlinks or over 1 MB. ${skipped.filter(isSecretFile).length} of them are secret files, left out on purpose.`, '');
  out.push('## Next step', '', 'The checks find patterns. For runaway loops, security holes between files and work that disappears silently, run the review on the copy:', '', '```', `cd ${copy}`, 'npx --no-install @thedecipherist/claude-packs scan --prompt   # give what it prints to Claude Code here', '```', '', `The copy holds your code: delete ${copy} when you are done.`, '');
  return out.join('\n');
}

export async function scan(projectDir, { out = null, log = console.log } = {}) {
  const listed = filesOf(projectDir);
  const files = listed.filter((rel) => copyable(projectDir, rel));
  const pick = recommend(projectDir, files);
  const copy = snapshot(projectDir, files);
  await sync(copy, pick.packs.map((p) => p.pack), { config: pick.config, mkdirs: true, log: () => {} });
  const { results, secrets, texts } = await runChecks(copy, files);
  const source = sourceFilesOf(copy, [...pick.always, ...pick.packs.map((p) => p.pack)]) ?? SOURCE; // base and synths name none
  const cov = await coverage(copy, source);
  const longFiles = texts.filter(([rel, t]) => source.test(rel) && t.split('\n').length - 1 > 300).map(([rel]) => rel);
  const said = [];
  onceOnlyDoctor(copy, (l) => said.push(l.trim()));
  const layout = readLayout(projectDir);
  const handBuilt = repeatedShapes(texts, layout);
  const near = nearCopies(texts, layout);
  const remade = remadeNames(texts, layout);
  const dups = said.find((l) => l.startsWith('duplicates')) ?? 'duplicates: not measured (jscpd not found)';
  const skipped = listed.filter((rel) => !files.includes(rel));
  const text = report({ dir: projectDir, copy, pick, results, secrets, skipped, longFiles, cov, dups, handBuilt, near, remade, count: files.length });
  const file = out ?? join(copy, 'claude-packs-scan.md');
  writeFileSync(file, text);
  const json = join(copy, 'claude-packs-scan.json');
  writeFileSync(json, `${JSON.stringify({ pick, results, secrets, repeats: handBuilt, near, remade, longFiles }, null, 2)}\n`);
  rememberScan(projectDir, json);
  log(`Scanned ${files.length} files on a copy; the project was not changed.`);
  log(`  ${pick.config}: ${[...pick.always, ...pick.packs.map((p) => p.pack)].join(', ')}`);
  log(`  ${results.reduce((n, r) => n + r.hits.length, 0)} check hits, ${secrets.length} possible secret(s)`);
  log(`Report: ${file}`);
  log(`Copy:   ${copy} (delete it when you are done; it holds your code)`);
  log('Next:   `fix` turns this into a work order for Claude; `init --auto` installs what it suggests.');
  return { file, copy, pick, results, secrets };
}
