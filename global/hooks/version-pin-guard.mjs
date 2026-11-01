#!/usr/bin/env node
// version-pin-guard: refuses a new or changed version pin unless docs/versions.md has a row
// for that dependency checked within MAX_AGE days. Pairs with the latest-versions skill.
// PreToolUse on Write|Edit|MultiEdit|Bash. Exit 2 blocks; stderr goes back to Claude.
// `node version-pin-guard.mjs --selftest` proves every extractor and the age check.
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';

const MAX_AGE = Number(process.env.VERSION_GUARD_DAYS ?? 14);
const DAY = 86_400_000;

// ---------- extractors: text -> Map(name -> version) ----------
function fromPackageJson(text) {
  const out = new Map();
  let json;
  try { json = JSON.parse(text); } catch { return out; }
  for (const key of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const [n, v] of Object.entries(json[key] ?? {})) out.set(n, String(v));
  }
  if (json.packageManager) out.set(json.packageManager.split('@')[0], json.packageManager);
  return out;
}

function fromCmake(text) {
  const out = new Map();
  for (const m of text.matchAll(/FetchContent_Declare\s*\(\s*([\w.-]+)([^)]*)\)/gi)) {
    const v = m[2].match(/\b(?:GIT_TAG|URL)\s+("?)([^\s")]+)\1/i);
    if (v) out.set(m[1], v[2]);
  }
  for (const m of text.matchAll(/CPMAddPackage\s*\(\s*"(?:gh:)?([\w./-]+)@([\w.+-]+)"/gi)) out.set(m[1].split('/').pop(), m[2]);
  for (const m of text.matchAll(/ExternalProject_Add\s*\(\s*([\w.-]+)[^)]*?\bGIT_TAG\s+([^\s)]+)/gi)) out.set(m[1], m[2]);
  return out;
}

function fromRequirements(text) {
  const out = new Map();
  for (const line of text.split('\n')) {
    const m = line.replace(/#.*/, '').trim().match(/^([A-Za-z0-9_.\-\[\]]+)\s*(==|>=|~=|<=|>|<|===)\s*([^\s;,]+)/);
    if (m) out.set(m[1].replace(/\[.*\]/, ''), `${m[2]}${m[3]}`);
  }
  return out;
}

function fromPyproject(text) {
  const out = new Map();
  for (const m of text.matchAll(/["']([A-Za-z0-9_.-]+)(?:\[[^\]]*\])?\s*(==|>=|~=|<=|>|<)\s*([^"',;\s]+)/g)) out.set(m[1], `${m[2]}${m[3]}`);
  return out;
}

function fromCargo(text) {
  const out = new Map();
  let inDeps = false;
  for (const line of text.split('\n')) {
    const h = line.match(/^\s*\[([^\]]+)\]/);
    if (h) { inDeps = /dependencies/.test(h[1]); continue; }
    if (!inDeps) continue;
    const m = line.match(/^\s*([\w-]+)\s*=\s*(?:"([^"]+)"|\{[^}]*version\s*=\s*"([^"]+)")/);
    if (m) out.set(m[1], m[2] ?? m[3]);
  }
  return out;
}

function fromGoMod(text) {
  const out = new Map();
  for (const m of text.matchAll(/^\s*(?:require\s+)?([\w.\-/]+\.[\w.\-/]+)\s+(v[\w.+-]+)/gm)) out.set(m[1], m[2]);
  return out;
}

function fromDockerfile(text) {
  const out = new Map();
  for (const m of text.matchAll(/^\s*FROM\s+(?:--platform=\S+\s+)?([^\s:@]+)[:@](\S+)/gim)) out.set(m[1].split('/').pop(), m[2]);
  return out;
}

function fromWorkflow(text) {
  const out = new Map();
  for (const m of text.matchAll(/uses:\s*["']?([\w.-]+\/[\w.-]+)(?:\/[\w./-]+)?@([\w.-]+)/g)) out.set(m[1], m[2]);
  return out;
}

export function extractorFor(file) {
  const name = basename(file);
  if (name === 'package.json') return fromPackageJson;
  if (name === 'CMakeLists.txt' || name.endsWith('.cmake')) return fromCmake;
  if (/^requirements.*\.(txt|in)$/.test(name)) return fromRequirements;
  if (name === 'pyproject.toml') return fromPyproject;
  if (name === 'Cargo.toml') return fromCargo;
  if (name === 'go.mod') return fromGoMod;
  if (/^(Dockerfile|Containerfile)(\..+)?$|\.dockerfile$/i.test(name)) return fromDockerfile;
  if (/\.github[\\/]workflows[\\/].+\.ya?ml$/.test(file)) return fromWorkflow;
  return null;
}

// Pins in `after` that are new or different from `before`.
export function changedPins(extract, before, after) {
  const old = extract(before);
  return [...extract(after)].filter(([n, v]) => old.get(n) !== v).map(([n, v]) => ({ name: n, version: v }));
}

// Package names added by an install command.
export function pinsFromCommand(cmd) {
  const found = [];
  for (const seg of cmd.split(/&&|\|\||;|\|/)) {
    const words = seg.trim().split(/\s+/);
    const at = words.findIndex((w, i) => (/^(npm|pnpm|yarn|bun)$/.test(w) && /^(i|install|add)$/.test(words[i + 1] ?? '')) || (/^(pip|pip3|uv|poetry)$/.test(w) && /^(install|add)$/.test(words[i + 1] ?? '')) || (w === 'cargo' && words[i + 1] === 'add') || (w === 'go' && words[i + 1] === 'get'));
    if (at === -1) continue;
    for (const w of words.slice(at + 2)) {
      if (w.startsWith('-') || w === 'pip' || w.startsWith('.') || w.startsWith('/')) continue;
      const m = w.match(/^(@?[^@=<>~\s]+)(?:[@=<>~]=?(.+))?$/);
      if (m && !/^(-r|requirements)/.test(m[1])) found.push({ name: m[1], version: m[2] ?? '(unpinned)' });
    }
  }
  return found;
}

// ---------- docs/versions.md ----------
export function checkedDates(versionsText) {
  const dates = new Map();
  for (const line of versionsText.split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').map((c) => c.trim().replace(/`/g, '')).filter(Boolean);
    const date = line.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (!cells.length || !date) continue;
    const key = cells[0].toLowerCase();
    const t = Date.parse(date[1]);
    if (!dates.has(key) || dates.get(key) < t) dates.set(key, t);
  }
  return dates;
}

function lookup(dates, name) {
  const n = name.toLowerCase();
  for (const k of [n, n.split('/').pop(), n.replace(/^@[^/]+\//, '')]) if (dates.has(k)) return dates.get(k);
  return undefined;
}

export function verdict(pins, dates, now = Date.now()) {
  const problems = [];
  for (const p of pins) {
    const t = lookup(dates, p.name);
    if (t === undefined) problems.push(`${p.name} ${p.version}: no row in docs/versions.md`);
    else if (now - t > MAX_AGE * DAY) problems.push(`${p.name} ${p.version}: last checked ${new Date(t).toISOString().slice(0, 10)}, over ${MAX_AGE} days ago`);
  }
  return problems;
}

// The project the pin is written in: the nearest folder above it with docs/versions.md or .git
// (a file in a git worktree), so an agent worktree and a sibling project read their own table.
// CLAUDE_PROJECT_DIR is only the fallback, and for a worktree that carries no versions.md.
export function projectRoot(start, env = process.env.CLAUDE_PROJECT_DIR) {
  let d = resolve(start);
  let found = null;
  for (;;) {
    if (existsSync(join(d, '.git')) || existsSync(join(d, 'docs', 'versions.md'))) { found = d; break; }
    const up = dirname(d);
    if (up === d) break;
    d = up;
  }
  if (!found) return env ?? resolve(start);
  const has = (root) => existsSync(join(root, 'docs', 'versions.md'));
  if (!has(found) && env && has(env) && !relative(resolve(env), found).startsWith('..')) return env;
  return found;
}

// ---------- hook ----------
function newText(input, current) {
  if (typeof input.content === 'string') return input.content;
  const edits = input.edits ?? (input.old_string !== undefined ? [input] : []);
  let text = current;
  for (const e of edits) text = e.replace_all ? text.split(e.old_string).join(e.new_string) : text.replace(e.old_string, e.new_string);
  return text;
}

function main(payload) {
  const input = payload.tool_input ?? {};
  let pins = [];
  let where;
  if (payload.tool_name === 'Bash') {
    pins = pinsFromCommand(input.command ?? '');
    where = payload.cwd ?? process.cwd();
  } else {
    const file = input.file_path;
    const extract = file && extractorFor(file);
    if (!extract) return 0;
    const before = existsSync(file) ? readFileSync(file, 'utf8') : '';
    pins = changedPins(extract, before, newText(input, before));
    where = dirname(file);
  }
  if (pins.length === 0) return 0;
  const vfile = join(projectRoot(where), 'docs', 'versions.md');
  const dates = existsSync(vfile) ? checkedDates(readFileSync(vfile, 'utf8')) : new Map();
  const problems = verdict(pins, dates);
  if (problems.length === 0) return 0;
  process.stderr.write(`version-pin-guard: look up the newest release first (latest-versions skill).\n${problems.map((p) => `- ${p}`).join('\n')}\nAdd or refresh each row in ${vfile} (name | latest stable | YYYY-MM-DD | source URL | used | decision), then pin.\n`);
  return 2;
}

function selftest() {
  const eq = (a, b, what) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${what}: got ${JSON.stringify(a)}`); };
  const names = (pins) => pins.map((p) => p.name);
  eq(names(changedPins(fromPackageJson, '{"dependencies":{"a":"1"}}', '{"dependencies":{"a":"1","fastify":"^5.6.0"}}')), ['fastify'], 'package.json add');
  eq(names(changedPins(fromPackageJson, '{"dependencies":{"a":"1"}}', '{"dependencies":{"a":"1"},"x":2}')), [], 'package.json unchanged');
  eq([...fromCmake('FetchContent_Declare(JUCE\n  GIT_REPOSITORY https://github.com/juce-framework/JUCE\n  GIT_TAG 9.0.4)')], [['JUCE', '9.0.4']], 'cmake GIT_TAG');
  eq([...fromCmake('CPMAddPackage("gh:fmtlib/fmt@11.2.0")')], [['fmt', '11.2.0']], 'cmake CPM');
  eq([...fromRequirements('numpy==2.3.1  # x\n-r base.txt\n')], [['numpy', '==2.3.1']], 'requirements');
  eq([...fromPyproject('dependencies = ["httpx>=0.28", "rich"]')], [['httpx', '>=0.28']], 'pyproject');
  eq([...fromCargo('[package]\nversion = "0.1.0"\n[dependencies]\nserde = { version = "1.0.219", features = ["derive"] }\n')], [['serde', '1.0.219']], 'cargo');
  eq([...fromGoMod('module x\nrequire (\n  github.com/spf13/cobra v1.9.1\n)\n')], [['github.com/spf13/cobra', 'v1.9.1']], 'go.mod');
  eq([...fromDockerfile('FROM --platform=linux/amd64 node:24-slim AS build\n')], [['node', '24-slim']], 'dockerfile');
  eq([...fromWorkflow('- uses: actions/checkout@v5\n- uses: github/codeql-action/init@v3')], [['actions/checkout', 'v5'], ['github/codeql-action', 'v3']], 'workflow');
  eq(names(pinsFromCommand('cd x && npm install -D typescript@5.9.3 zod')), ['typescript', 'zod'], 'npm install');
  eq(names(pinsFromCommand('pip install --break-system-packages requests==2.32.5')), ['requests'], 'pip install');
  eq(pinsFromCommand('npm install'), [], 'bare npm install');
  const now = Date.parse('2026-10-26');
  const dates = checkedDates('| name | latest |\n|---|---|\n| fastify | 5.6.1 | 2026-10-20 | https://github.com/fastify/fastify/releases | 5.6.1 | use |\n| `JUCE` | 9.0.4 | 2026-09-01 | url | 8.0.4 | F4 |\n');
  eq(verdict([{ name: 'fastify', version: '5.6.1' }], dates, now), [], 'fresh row passes');
  eq(verdict([{ name: 'JUCE', version: '9.0.4' }], dates, now).length, 1, 'stale row blocks');
  eq(verdict([{ name: 'zod', version: '4' }], dates, now).length, 1, 'missing row blocks');
  eq(verdict([{ name: 'github.com/fastify', version: 'v1' }], dates, now), [], 'last path segment matches');
  console.log('version-pin-guard selftest: OK (17 cases)');
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  if (process.argv.includes('--selftest')) process.exit(selftest());
  let raw = '';
  process.stdin.on('data', (c) => { raw += c; });
  process.stdin.on('end', () => {
    let payload;
    try { payload = JSON.parse(raw || '{}'); } catch { process.exit(0); }
    process.exit(main(payload));
  });
}
