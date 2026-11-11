// 0.16.0: `scan` reports on a project before anything is installed. Its first promise is that it touches nothing: a real project, with
// real secrets, is the input.
import { CLI, assert, cli, execFileSync, existsSync, fresh, git as gitIn, join, mkdirSync, readFileSync, readdirSync, statSync, test, writeFileSync } from './kit-cli.mts';
import { createHash } from 'node:crypto';

const TOKEN = `ghp_${'a1B2'.repeat(10)}`;
const put = (dir, rel, text) => { mkdirSync(join(dir, rel, '..'), { recursive: true }); writeFileSync(join(dir, rel), text); };

function project(git = true) {
  const dir = fresh('scan-');
  put(dir, 'package.json', JSON.stringify({ name: 'x', dependencies: { fastify: '5.0.0', mongodb: '6.0.0' } }));
  put(dir, '.env', `TOKEN=${TOKEN}\n`);
  put(dir, '.gitignore', '.env\n');
  put(dir, 'src/server.ts', `const app = Fastify();\ntry { await save(x); } catch {}\nconst u = 1;\nconst t = '${TOKEN}';\n`);
  put(dir, 'src/db/reads.ts', 'export const all = async (q) => {\n  return collection.find(q).toArray();\n};\n');
  put(dir, 'Dockerfile', 'FROM node:latest\nCMD node dist/index.js\n');
  if (git) {
    const g = (...a) => gitIn(dir, ...a);
    g('init', '-q'); g('add', '.gitignore', 'package.json', 'src', 'Dockerfile'); g('commit', '-qm', 'x');
  }
  return dir;
}

function fingerprint(dir) {
  const h = createHash('sha256');
  const walk = (d) => { for (const e of readdirSync(d).sort()) { const p = join(d, e); h.update(p); if (statSync(p).isDirectory()) walk(p); else h.update(readFileSync(p)); } };
  walk(dir);
  return h.digest('hex');
}

const scanned = (dir, ...args) => {
  const r = cli(dir, 'scan', ...args);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const file = r.stdout.match(/Report: (\S+)/)[1];
  return { out: r.stdout, file, copy: r.stdout.match(/Copy: +(\S+)/)[1], text: readFileSync(file, 'utf8') };
};

test('the scan changes nothing in the project, its .git included, with or without git', () => {
  for (const git of [true, false]) {
    const dir = project(git);
    const before = fingerprint(dir);
    scanned(dir);
    assert.equal(fingerprint(dir), before, git ? 'a git project' : 'a plain folder');
    assert.ok(!existsSync(join(dir, '.claude')));
  }
});

test('a secret file is never copied, and no secret value reaches the report', () => {
  const { copy, text } = scanned(project());
  assert.ok(!existsSync(join(copy, '.env')));
  assert.ok(!text.includes(TOKEN));
  assert.ok(!readFileSync(join(copy, 'claude-packs-scan.json'), 'utf8').includes(TOKEN));
  assert.match(text, /src\/server\.ts:4: a GitHub token/);
  assert.match(text, /1 possible secret\(s\)/);
  const dir = project();
  put(dir, 'src/mask.test.ts', `const t = '${TOKEN}';\n`);
  assert.match(scanned(dir).text, /In test files and content folders \(1\):\n- src\/mask\.test\.ts:1/);
});

test('the report recommends with evidence, leaves out what is not there, and lists every check hit by file and line', () => {
  const { text } = scanned(project());
  assert.match(text, /Configuration `node`/);
  assert.match(text, /`mongo`: dependency: mongodb/);
  assert.match(text, /`docker`: file: Dockerfile/);
  assert.match(text, /Left out, nothing found for them:.*tui/);
  assert.match(text, /\*\*no-find-reads\*\* \(mongo\): 1\./);
  assert.match(text, /src\/db\/reads\.ts:2:/);
  assert.match(text, /\*\*no-latest-base\*\* \(docker\)/);
  assert.match(text, /A hit is a candidate/);
  assert.match(text, /scan --prompt/);
});

test('--out writes the report there; --prompt prints the review brief', () => {
  const dir = project();
  const out = join(fresh('scan-out-'), 'report.md');
  assert.equal(scanned(dir, '--out', out).file, out);
  const brief = execFileSync('node', [CLI, 'scan', '--prompt'], { encoding: 'utf8' });
  assert.match(brief, /read in the code/);
  assert.match(brief, /Connect to a production database/);
});

test('a project with no JS scans too: C++ only, plain HTML only', () => {
  const dir = fresh('scan-cpp-');
  put(dir, 'src/PluginProcessor.cpp', 'void a() {}\n');
  assert.match(scanned(dir).text, /Configuration `synth-creator`/);
  const html = fresh('scan-html-');
  put(html, 'index.html', '<h1>Hi</h1>\n');
  assert.match(scanned(html).text, /Configuration `base`/);
});
