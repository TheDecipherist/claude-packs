// Every plugin has a settings layer with the standard settings, and its standalone shows no JUCE Options button
// (audio-core's `settings-layer-owns-the-devices`; the user, 2026-11-10: "any plugin should always have a way to access a settings
// area with all the standard settings").
//   (PreToolUse)  refuses a write to a file of the settings layer (layout.json "settingsLayer": { "files": [...] }) that leaves out
//                 a standard setting the layer had, or a new layer that lacks one; and a CMake write that adds a JUCE Standalone
//                 without JUCE_USE_CUSTOM_PLUGIN_STANDALONE_APP (JUCE's own window, with its Options button). Only what a write adds
//                 is refused, so an old project's other edits pass; doctor names what it still lacks.
//   --status      exit 1, saying why, for a JUCE plugin with no settings layer declared, one missing a standard setting, or a
//                 standalone in JUCE's own window (doctor runs it)
//   --selftest    proves it
// The standard settings are lib/settings-standard.mjs; the layer names each by its id as a string literal. A file is judged in
// its own checkout, by that checkout's layout.json.
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readText, walk } from './lib/files.mts';
import { contextOf, isMain, runAsHook, writeVerdict } from './lib/hook-log.mts';
import { readLayout } from './lib/layout.mts';
import { checkoutRoot, claudeRoot } from './lib/project.mts';
import { runHook, scratchProject, snapshot, verdicts, writeOf, writtenSince } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import { missingIn, requiredSettings } from './lib/settings-standard.mts';
import type { SettingRow } from './lib/settings-standard.mts';
import type { FileWrite, Hook, Verdict } from './lib/types.d.mts';
import { pass } from './lib/verdict.mts';
import { judgeVerdict } from './lib/writes.mts';

const CMAKE = /(^|\/)CMakeLists\.txt$|\.cmake$/;
const SKIP_DIRS = /^(out|build|Builds|_deps|JuceLibraryCode|JUCE|node_modules|\.git|\.claude|cmake-build.*)$/;
const PLUGIN = /\bjuce_add_plugin\s*\(/;
const STANDALONE = /\bjuce_add_plugin\s*\([^)]*\bFORMATS\b[^)]*\bStandalone\b/;
const CUSTOM_APP = /\bJUCE_USE_CUSTOM_PLUGIN_STANDALONE_APP\s*=\s*1\b/;
const RULE = 'See .claude/rules/settings-layer-owns-the-devices.md.';

/** layout.json "settingsLayer": the files that hold the layer, and the groups it leaves out with their reasons. */
interface SettingsLayer { files: string[]; without?: Record<string, unknown> }

const inJuceWindow = (cmake: string): boolean => STANDALONE.test(cmake) && !CUSTOM_APP.test(cmake);
const named = (rows: readonly SettingRow[]): string => rows.map(([id, label]) => `"${id}" (${label})`).join(', ');

// The CMake files of a checkout, by their path from its root (build folders and the like left out).
const cmakeFiles = (root: string): string[] => walk(root, (name) => SKIP_DIRS.test(name)).map((f) => relative(root, f)).filter((rel) => CMAKE.test(rel));

/** The text of a checkout's files, the one being written (`rel`) read as `text`. */
const together = (root: string, files: readonly string[], rel: string | null, text: string): string =>
  files.map((f) => (f === rel ? text : readText(join(root, f)) ?? '')).join('\n');

function layerOf(claude: string): SettingsLayer | null {
  const layer = readLayout(claude)['settingsLayer'];
  if (layer === null || typeof layer !== 'object') return null;
  const { files, without } = layer as Record<string, unknown>;
  if (!Array.isArray(files)) return null;
  const found: SettingsLayer = { files: files.map(String) };
  if (without && typeof without === 'object') found.without = without as Record<string, unknown>;
  return found;
}

// A write to the settings layer: the standard settings it names may not shrink, and a new layer names them all.
function judgeLayer(w: FileWrite, rel: string, root: string, claude: string): string | null {
  const layer = layerOf(claude);
  if (!layer?.files.includes(rel) || w.after === null) return null;
  const required = requiredSettings(layer.without);
  const before = missingIn(together(root, layer.files, rel, w.before ?? ''), required).map(([id]) => id);
  const after = missingIn(together(root, layer.files, rel, w.after), required);
  const lost = (w.before ?? '').trim() ? after.filter(([id]) => !before.includes(id)) : after;
  if (!lost.length) return null;
  return `the settings layer (${rel}) leaves out ${named(lost)}. Every plugin's settings layer carries the standard settings, ` +
    `each row named by its id from one table (.claude/hooks/lib/settings-standard.mjs). A group the plugin truly has no use for ` +
    `is left out in layout.json "settingsLayer": { "without": { "<group>": "<why>" } }. ${RULE}\n`;
}

// A CMake write that puts the standalone in JUCE's own window, with its Options button, where it was not before.
function judgeCmake(w: FileWrite, rel: string, root: string): string | null {
  if (!CMAKE.test(rel) || w.after === null) return null;
  const files = [...new Set([...cmakeFiles(root), rel])];
  if (!inJuceWindow(together(root, files, rel, w.after)) || inJuceWindow(together(root, files, rel, w.before ?? ''))) return null;
  return `${rel} adds a JUCE Standalone without JUCE_USE_CUSTOM_PLUGIN_STANDALONE_APP=1, so the standalone opens in JUCE's own ` +
    `window, whose Options button sets the audio and MIDI devices beside the plugin's own settings layer. Build the standalone as ` +
    `the project's own app round StandalonePluginHolder, and set the devices in the settings layer. ${RULE}\n`;
}

export const hook: Hook = (event, ctx) => judgeVerdict(event, {
  name: 'settings-layer',
  write: (w, rel) => {
    const root = checkoutRoot(ctx.projectDir, w.path, ctx.cwd);
    return judgeLayer(w, rel, root, claudeRoot(ctx.projectDir, w.path, ctx.cwd)) ?? judgeCmake(w, rel, root);
  },
}, ctx);

// What a project still lacks, for doctor: one line each.
export function problems(root: string): string[] {
  const cmake = cmakeFiles(root);
  const all = together(root, cmake, null, '');
  if (!PLUGIN.test(all)) return [];
  const found: string[] = [];
  const layer = layerOf(root);
  if (!layer) found.push('a JUCE plugin with no settings layer: declare its files in layout.json "settingsLayer": { "files": [...] }, rows from one table keyed by the standard ids (.claude/hooks/lib/settings-standard.mjs)');
  else {
    const missing = missingIn(together(root, layer.files, null, ''), requiredSettings(layer.without));
    if (missing.length) found.push(`the settings layer leaves out ${named(missing)}`);
  }
  if (inJuceWindow(all)) found.push('the standalone opens in JUCE\'s own window, with its Options button: set JUCE_USE_CUSTOM_PLUGIN_STANDALONE_APP=1 and build its own app');
  return found.map((p) => `settings-layer: ${p}. ${RULE}`);
}

/** `--status`: one line for each problem, and exit 1 when there is one. */
export function status(root: string): Verdict {
  const found = problems(root);
  return found.length ? { code: 1, stdout: `${found.join('\n')}\n`, stderr: '' } : pass;
}

const ROWS = (ids: readonly string[]): string => `const SettingRow rows[] = { ${ids.map((id) => `{ "${id}" }`).join(', ')} };\n`;
const ALL_IDS: readonly string[] = requiredSettings().map(([id]) => id);
const LAYER_FILE = 'src/app/SettingsRows.cpp';

/** The settings layer a worktree's layout declares is the one its file is judged by, and main's layout declares none. The
 *  worktree's layout.json takes `settingsLayer: { files: ["src/app/SettingsRows.cpp"] }` first, which the test's own case writes,
 *  because it must merge into the layout that is there. */
export const worktreeCase: WorktreeCase = {
  steps: [
    { label: 'a layer in the worktree without Enable QWERTY', event: { tool_name: 'Write', tool_input: { file_path: `{wt}/${LAYER_FILE}`, content: ROWS(ALL_IDS.filter((id) => id !== 'midi.qwerty')) } }, want: 2 },
    { label: 'a layer in the worktree with every standard setting', event: { tool_name: 'Write', tool_input: { file_path: `{wt}/${LAYER_FILE}`, content: ROWS(ALL_IDS) } }, want: 0 },
    { label: 'main declares no settings layer', event: { tool_name: 'Write', tool_input: { file_path: `{here}/${LAYER_FILE}`, content: ROWS([]) } }, want: 0 },
  ],
};

export function selftest(): number {
  const hookFile = fileURLToPath(import.meta.url);
  const ALL = ALL_IDS;
  const rows = (ids: readonly string[]): string => `const SettingRow rows[] = {\n${ids.map((id) => `    { "${id}" },`).join('\n')}\n};\n`;
  const but = (...gone: string[]): string[] => ALL.filter((id) => !gone.includes(id));
  const NO_INPUT = requiredSettings({ input: 'a synth' }).map(([id]) => id);
  const LAYER = 'src/ui/SettingsRows.cpp';
  const layout = (layer: SettingsLayer | null): Record<string, unknown> => ({ folders: {}, concepts: {}, ...(layer ? { settingsLayer: layer } : {}) });
  const project = (files: Record<string, string>, layer: SettingsLayer | null = { files: [LAYER] }): string => scratchProject(files, layout(layer));
  const write = (dir: string, rel: string, text: string): number | null => runHook(hookFile, dir, writeOf(join(dir, rel), text)).status;
  const PLUGIN_CMAKE = 'juce_add_plugin(F FORMATS VST3 AU)\n';
  const STANDALONE_CMAKE = 'juce_add_plugin(F FORMATS VST3 Standalone)\n';
  const FLAG = 'target_compile_definitions(F PUBLIC JUCE_USE_CUSTOM_PLUGIN_STANDALONE_APP=1)\n';
  const fresh = project({ 'CMakeLists.txt': PLUGIN_CMAKE });
  const full = project({ 'CMakeLists.txt': PLUGIN_CMAKE, [LAYER]: rows(ALL) });
  const old = project({ 'CMakeLists.txt': STANDALONE_CMAKE, [LAYER]: rows(but('midi.qwerty')) });
  const split = project({ 'CMakeLists.txt': PLUGIN_CMAKE, 'cmake/app.cmake': FLAG, [LAYER]: rows(ALL) });
  const bare = project({ 'CMakeLists.txt': PLUGIN_CMAKE }, null);
  const synth = project({ 'CMakeLists.txt': PLUGIN_CMAKE }, { files: [LAYER], without: { input: 'a synth: nothing listens to an input' } });
  const blank = project({ 'CMakeLists.txt': PLUGIN_CMAKE }, { files: [LAYER], without: { input: '' } });
  const projects = [fresh, full, old, split, bare, synth, blank];
  const before = projects.map((d) => snapshot(d));   // each project as the judge finds it: the rows below must leave it as it is
  return verdicts('settings-layer', [
    ['a new layer without Enable QWERTY', write(fresh, LAYER, rows(but('midi.qwerty'))), 2],
    ['a new layer with every standard setting', write(fresh, LAYER, rows(ALL)), 0],
    ['an edit that drops mute-input', write(full, LAYER, rows(but('audio.muteInput'))), 2],
    ['an old layer, an edit that drops nothing more', write(old, LAYER, `${rows(but('midi.qwerty'))}// tidy\n`), 0],
    ['a group left out with its reason', write(synth, LAYER, rows(NO_INPUT)), 0],
    ['a group left out with no reason', write(blank, LAYER, rows(NO_INPUT)), 2],
    ['a Standalone added in JUCE\'s own window', write(full, 'CMakeLists.txt', STANDALONE_CMAKE), 2],
    ['a Standalone added as its own app', write(full, 'CMakeLists.txt', STANDALONE_CMAKE + FLAG), 0],
    ['the flag set in another CMake file', write(split, 'CMakeLists.txt', STANDALONE_CMAKE), 0],
    ['an old Standalone, another CMake edit', write(old, 'CMakeLists.txt', `${STANDALONE_CMAKE}# tidy\n`), 0],
    ['--status: a plugin with no settings layer', runHook(hookFile, bare, null, ['--status']).status, 1],
    ['--status: an old layer and JUCE\'s window', runHook(hookFile, old, null, ['--status']).status, 1],
    ['--status: a complete plugin', runHook(hookFile, full, null, ['--status']).status, 0],
    ['another project is not ours', write(full, `../elsewhere-${Date.now()}/src/ui/SettingsRows.cpp`, rows([])), 0],
    ['a judge writes no file (the write trap)', projects.flatMap((d, i) => writtenSince(d, before[i] ?? new Map())).join(','), ''],
  ]);
}

// `--status` is doctor's by-hand mode: its lines go to the process's stdout.
if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'settings-layer', hook, selftest, {
  flags: { '--status': () => { const v = status(contextOf().projectDir); writeVerdict(v); return v.code; } },
});
