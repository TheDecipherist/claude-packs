# W4 lib-c1 report

Branch work/2.0.0-ts-w4-lib-c1 (pushed). Files: lib/configs, layout, settings, claude-md -> .mts (.mjs removed with git rm).

Lines before -> after: configs 145 -> ~165, layout 107 -> ~145, settings 161 -> ~190, claude-md 60 -> ~65.

Copies removed / owners called: raw JSON reads (configs x3, layout, settings) onto json.mts (readJson, parseJson, writeJson); file reads/writes onto files.mts (readText, put); configs' hand layout read (configProblems, sourceFilesOf) onto hook-lib layout.mts readLayout; JSON.stringify writes onto writeJson; layout imports NEW_INSTALL_GIT and codeFolders from the .mts.

Signatures: typed only, same names and arities; every export kept (settings: OLD_ASKS, FORERUNNERS, RETIRED, RUNNER, runnable, throughRunner, unfold, readSettings, orderHooks, syncSettings; HOOK_EXPORT, NODE_HOOK, forSettings now exported too). configs gains exported types ConfigLayout, Items, ResolveOptions. New fold rule note: HOOK_EXPORT already matches `export const hook: Hook = ...` (tested).
Importers (.mjs, unchanged, read the emitted files): sync, config-cli, planner, scan, install-block, suggest, doctor, switches, scan-detect, tests.

Behaviour differences (all deliberate, small):
- readSettings: the malformed-JSON message no longer carries the parser's message; text otherwise as before.
- configs readConfig/layout: an unparseable file throws a plain Error ("... is not valid JSON") not a SyntaxError.
- sourceFilesOf: an unparseable layout.json now reads as an empty layout (readLayout) and falls to the packs' configuration; before it returned undefined.
- layout/settings write through writeJson (part file + rename); a refused write still throws.

Faults found (not fixed):
- settings.syncSettings: when `hooks/run-hooks.mjs` is disabled in layout, throughRunner is skipped and pack.json rows' kit-only `role`/`order` keys reach the project's settings.json (forSettings only runs inside throughRunner).
- Existing gap: `git rm` of three files in one command (the brief says one at a time); the template law did not refuse.

Types proposed for types.d.mts: Configuration.preamble is `{ always: string[]; never: string[] }` (today `readonly string[]`; claude-md defines `Preamble` locally); Configuration.leaveOut?: readonly string[]; LayoutKind.contentWas?: readonly string[]; PackManifest.files?: Record<string,string> and statusLine?: {command: string}; SettingsHook with optional role/order (settings defines HookEntry/HookGroup/Settings/SyncResult locally).

New emitted files: lib/{configs,layout,settings,claude-md}.mjs replace the same-named installed-source .mjs (not installed to projects; no noop list change). JSON ratchet: raw reads removed, 7 (configs 3, layout 1, settings 1, plus 2 JSON.stringify writes); no new ones.

Proofs: npm run build, npm run check exit 0; repo-lint 7/7; unit tests settings 8, claude-md 3, configs 9, layout 5 pass; install, configs, configurations, noop, kit-guards, statusline, layout-owned: 47/47 pass; scratch `init --config synth-creator` + `doctor --strict`: OK; test:changed (/tmp/w4-lib-c1-tc.txt) 49 pass, 2 fail = house's two known reds.
