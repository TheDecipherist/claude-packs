// PreToolUse (Write|Edit|MultiEdit|NotebookEdit|Bash; every route, lib/writes.mts): every kind of thing goes in its one place, so the rules for
// it load. layout.kinds says what goes where; a kind may name file patterns ("**/*.wgsl") and a
// content pattern (processBlock, wgpu calls, paint(Graphics)). A file of that kind, or an edit that
// ADDS that content, outside the kind's concept folders is refused. Content is read in C, C++ and shader files, or in the
// kind's own "extensions" (a TypeScript kind: [".ts", ".tsx"]; KWB-36). `--selftest` proves it.
// A judge on the hook contract (typescript order W4): hook(event, ctx) returns its Verdict and writes nothing.
import { extname, join } from 'node:path';
import { matchesAny } from './lib/glob.mjs';
import { isMain, runAsHook } from './lib/hook-log.mjs';
import { toJson } from './lib/json.mjs';
import { conceptGlobs, readLayout } from './lib/layout.mjs';
import { claudeRoot, insideProject, relInCheckout } from './lib/project.mjs';
import { put, runHook, scratchProject, snapshot, verdicts, writeOf, writtenSince } from './lib/selftest.mjs';
import { pass, refuse } from './lib/verdict.mjs';
import { writesOf } from './lib/writes.mjs';
import { fileURLToPath } from 'node:url';
const CODE = new Set(['.c', '.cc', '.cpp', '.cxx', '.h', '.hh', '.hpp', '.mm', '.m', '.wgsl', '.metal', '.hlsl']);
/** The layout's kinds with `content` read as text, whatever types.d.mts says it is. */
function placementOf(layout) {
    const kinds = Object.entries(layout.kinds ?? {}).map(([name, kind]) => {
        const content = kind.content;
        return [name, { ...kind, content: typeof content === 'string' ? content : undefined }];
    });
    return { folders: layout.folders, concepts: layout.concepts, kinds: Object.fromEntries(kinds) };
}
const home = (layout, kind) => (kind.concepts ?? []).flatMap((c) => conceptGlobs({ folders: layout.folders ?? {}, concepts: layout.concepts ?? {} }, c) ?? []);
const where = (layout, kind) => (kind.in ? layout.folders?.[kind.in]?.path ?? kind.in : '');
export function misplaced(layout, rel, before, after) {
    for (const [name, kind] of Object.entries(layout.kinds ?? {})) {
        const globs = home(layout, kind);
        if (globs.length === 0 || matchesAny(rel, globs))
            continue;
        const byName = kind.files && matchesAny(rel, kind.files) && before === '';
        let byContent = false;
        if (kind.content && (kind.extensions ? kind.extensions.includes(extname(rel)) : CODE.has(extname(rel)))) {
            const re = new RegExp(kind.content);
            byContent = re.test(after) && !re.test(before);
        }
        if (byName || byContent)
            return { name, kind, where: where(layout, kind), globs };
    }
    return null;
}
function refusalOf(rel, hit) {
    return `BLOCKED by placement-law: ${rel} holds ${hit.kind.what} (kind "${hit.name}").\n` +
        `That goes in ${hit.where}/, where its rules load (${hit.globs.join(', ')}).\n` +
        'Put it there instead. If it truly belongs elsewhere, ask the user to change .claude/layout.json, then `npx --no-install @thedecipherist/claude-packs update`.\n';
}
export const hook = (event, ctx) => {
    for (const w of writesOf(event, ctx.cwd, ctx.env)) {
        if (w.op === 'delete' || !insideProject(ctx.projectDir, w.path, ctx.cwd))
            continue;
        const rel = relInCheckout(ctx.projectDir, w.path, ctx.cwd);
        // an unknown result (a program's output) is judged by name only
        const hit = misplaced(placementOf(readLayout(claudeRoot(ctx.projectDir, w.path, ctx.cwd))), rel, w.before ?? '', w.after ?? w.before ?? '');
        if (hit)
            return refuse(refusalOf(rel, hit));
    }
    return pass;
};
/** A shader belongs in the painter folder: judged from the worktree's checkout, a new .wgsl in painter passes and one in the core folder is refused. */
export const worktreeCase = {
    steps: [
        { label: 'a shader in the painter folder of the worktree', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/src/painter/shaders/glow.wgsl', content: '@fragment fn fs() {}' } }, want: 0 },
        { label: 'a shader in the core folder of the worktree', event: { tool_name: 'Write', tool_input: { file_path: '{wt}/src/core/glow.wgsl', content: '@fragment fn fs() {}' } }, want: 2 },
    ],
};
const SELFTEST_LAYOUT = {
    folders: { audio: { path: 'src/audio' }, painter: { path: 'src/painter' }, tests: { path: 'tests' }, adapters: { path: 'api/adapters' } },
    concepts: { audio: ['audio'], painter: ['painter'], tests: ['tests'], adapters: ['adapters'] },
    kinds: {
        'audio-entry': { what: 'processBlock', in: 'audio', concepts: ['audio', 'tests'], content: '\\bprocessBlock\\s*\\(' },
        shader: { what: 'WGSL', in: 'painter', concepts: ['painter'], files: ['**/*.wgsl'] },
        'db-gateway': { what: 'the database driver', in: 'adapters', concepts: ['adapters'], content: "from\\s+'mongodb'", extensions: ['.ts'] },
    },
};
export function selftest() {
    const layout = SELFTEST_LAYOUT;
    const cases = [
        ['processBlock added outside audio', misplaced(layout, 'src/app/Helper.cpp', '', 'void processBlock (A& b) {}') !== null],
        ['processBlock in audio is fine', misplaced(layout, 'src/audio/Engine.cpp', '', 'void processBlock (A& b) {}') === null],
        ['processBlock already there is not re-judged', misplaced(layout, 'src/app/Old.cpp', 'processBlock (x);', 'processBlock (x); y();') === null],
        ['a new shader outside painter', misplaced(layout, 'src/app/glow.wgsl', '', 'fn main() {}') !== null],
        ['a shader in painter is fine', misplaced(layout, 'src/painter/glow.wgsl', '', 'fn main() {}') === null],
        ['a comment in docs is not code', misplaced(layout, 'docs/notes.md', '', 'processBlock (x)') === null],
        ['a kind with its own extensions: the driver in a handler (KWB-36)', misplaced(layout, 'api/handlers/user.ts', '', "import { MongoClient } from 'mongodb';") !== null],
        ['the driver in the adapters is fine', misplaced(layout, 'api/adapters/db.ts', '', "import { MongoClient } from 'mongodb';") === null],
        ['a kind with extensions leaves other files alone', misplaced(layout, 'api/handlers/notes.md', '', "from 'mongodb'") === null],
    ];
    // the hook itself, through the runner, on a project with that layout: the law reads layout.json, and the judge writes nothing
    const dir = scratchProject({ 'src/audio/Engine.cpp': '// engine\n' });
    put(join(dir, '.claude/layout.json'), toJson(layout));
    const before = snapshot(dir);
    const hookFile = fileURLToPath(import.meta.url);
    const run = (file, content) => runHook(hookFile, dir, writeOf(join(dir, file), content)).status;
    return verdicts('placement-law', [
        ...cases.map(([label, ok]) => [label, ok, true]),
        ['the hook refuses processBlock outside audio', run('src/app/Helper.cpp', 'void processBlock (A& b) {}'), 2],
        ['the hook lets it into audio', run('src/audio/New.cpp', 'void processBlock (A& b) {}'), 0],
        ['a judge writes no file (the write trap)', writtenSince(dir, before).join(','), ''],
    ]);
}
if (isMain(import.meta.url))
    await runAsHook(import.meta.url, 'placement-law', hook, selftest);
