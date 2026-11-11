// `claude-packs new <name>`: a new project on the house structure, so the rules fire from the first file (it was the
// global new-project skill; it is a kit command now, and the global part stays at three pieces).
//   - the folder, the house files (CLAUDE.md, build.md, bugs.md, workflow-bugs.md, docs/versions.md, .gitignore),
//   - a git repo: the scaffold is the first commit on main, and work goes on from a `work/` branch (the house branch flow),
//   - the kit installed into it (`init` with the packs named, or a profile), then doctor.
// A synth or effects unit is made by synthkit's new_synth.py first; `init` (or `new` on an empty folder) follows on it.
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gitRun } from '../packs/base/hooks/lib/git-run.mjs';
import { readJson } from '../packs/base/hooks/lib/json.mjs';
import { doctor } from './doctor.mjs';
import { applyOwned } from './install-block.mjs';
import { ensureShape } from './shape-cli.mjs';
import { sync } from './sync.mjs';
import { isPlainName } from './workorder.mjs';
const today = () => new Date().toISOString().slice(0, 10);
const CLAUDE_MD = [
    'Read `build.md` at the start of every session; nothing is worked on unless it is IN PROGRESS there.',
    'Every bug is logged in `bugs.md` (and every workflow fault in `workflow-bugs.md`) before it is fixed.',
    'One branch per step (the `build-step` skill), never a commit on main.',
].join(' ');
const BUILD_RULES = [
    '- A step is ticked only when its "done when" was measured or seen in the opened app.',
    '- Every step is built on its own branch and merged when done; its start and finish are in the log.',
].join('\n');
function files(name) {
    return {
        'CLAUDE.md': `# ${name}\n\n${CLAUDE_MD}\n`,
        'build.md': `# ${name}: the build\n\n## Rules for this file\n\n${BUILD_RULES}\n\n## Where we are\n\nStarted ${today()}.\n\n## In progress\n\n## Steps\n\n## Log\n`,
        'bugs.md': `# ${name}: bugs\n\nLogged first, fixed second. A fixed bug moves to Fixed with its cause, the fix, the date and the gate that catches it.\n\n## Open\n\n## Fixed\n`,
        'workflow-bugs.md': `# ${name}: workflow bugs\n\nA fault in the workflow (a hook, a tool, a test run) is logged here before it is fixed.\n\n## Open\n\n## Fixed\n`,
        'docs/versions.md': '| name | latest stable | checked | source | used | decision |\n|---|---|---|---|---|---|\n',
        '.gitignore': 'build/\nout/\n.DS_Store\n',
    };
}
/** git in the new project; a failure throws its first line, so the scaffold's commit is all or nothing. */
const gitIn = (dir, env) => (...args) => {
    const r = gitRun(args, { cwd: dir, env });
    if (!r.ok)
        throw new Error(r.stderr.trim().split('\n')[0] || `git ${args[0] ?? ''} failed`);
};
export async function newProject(parent, name, options = {}) {
    const { packs = ['audio-core'], seedLayout = null, config = null, block = null, log = console.log, env = process.env } = options;
    if (!isPlainName(name))
        throw new Error('name the project: `npx --no-install @thedecipherist/claude-packs new <name>` (letters, digits, . _ -)');
    const dir = join(parent, name);
    if (existsSync(dir) && readdirSync(dir).length)
        throw new Error(`${dir} already exists and is not empty; use \`npx --no-install @thedecipherist/claude-packs init\` there`);
    mkdirSync(join(dir, 'docs'), { recursive: true });
    for (const [rel, text] of Object.entries(files(name)))
        writeFileSync(join(dir, rel), text);
    const git = gitIn(dir, env);
    git('init', '-q', '-b', 'main');
    await sync(dir, packs, { mkdirs: true, seedLayout, config, log });
    if (block)
        await applyOwned(dir, block.owned, { log }); // `new --from <order>`: the install block's own layout keys
    ensureShape(dir); // the shape law: every concept is written down as ONE or MANY before it is built
    try {
        // by name: the house files, .claude/, and every file the kit installed elsewhere (nested skills, .clang-tidy)
        const installed = Object.keys(readJson(join(dir, '.claude', 'claude-packs.lock.json'))?.files ?? {});
        const clangTidy = existsSync(join(dir, '.clang-tidy')) ? ['.clang-tidy'] : [];
        git('add', '--', ...Object.keys(files(name)), 'design/shape.json', '.claude', ...installed, ...clangTidy);
        git('commit', '-q', '-m', `${name}: the house structure and claude-packs`);
        git('switch', '-q', '-c', 'work/start');
        log(`  git: the scaffold is the first commit on main; you are on work/start`);
    }
    catch (e) {
        log(`  git: the scaffold is not committed (${e instanceof Error ? e.message : String(e)}); commit it, then work on a work/ branch`);
    }
    log(`New project: ${dir}`);
    return { dir, code: await doctor(dir, log, { installing: true }) };
}
