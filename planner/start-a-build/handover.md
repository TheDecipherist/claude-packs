# From the finished order to the first build session (for `start-a-build`)

The hand-over prints this in full, filled in from the order: the project's name in place of `NAME`, the order's template in place of `TEMPLATE` (`plugin`, `rebuild` or `generic`), the full path the person saved the order to in place of `ORDER` (`~/Downloads/workorder.md`). Nothing is "see the README". The stage list the interview shows is `workorder-writer`'s `stages.md`.

## 1. The order carries its own install block

Everything the kit needs to set a project up is decided by the end of Stage 5: the configuration, the packs, the opt-in hooks and checks, the looks, the guards, the commands. The order carries it as one fenced block, written by the interview and never by hand:

````markdown
```claude-packs
configuration: synth-creator
packs: cpp, audio-core, instrument-shell, midi, sound-design
looks:
  - name: panel
    reference: design/reference/panel.png
    code: ["src/ui/**"]
commands:
  build: node .claude/tools/buildq.mjs cmake --build build --preset dev
  test: node .claude/tools/buildq.mjs ctest --preset dev
```
````

Its keys are the kit's own (`layout.json`'s `configuration`, `enable`, `looks`, `guards`, `commands`, and `init`'s packs), so there is nothing to translate. `new --from` and `init --from` install from it: the configuration and packs, then those keys written into `.claude/layout.json`, then an update. A key the kit does not read is refused by name, and nothing is installed. The run's W0 installs from the same block and proves it with `doctor --strict`; a skill the order names that the block does not bring is a gap, logged, never worked around.

## 2. The machine (once per computer)

- **Windows: build in WSL.** Claude Code, the kit's hooks (node and bash) and the builds run far faster under WSL than on native Windows, and the kit's shell laws assume a Unix shell. Install WSL with Ubuntu, keep the project inside the WSL filesystem (under `~/projects`, not under `/mnt/c`: the Windows side of the filesystem is slow from WSL), and open VS Code with the WSL extension. The Windows-native build of the plugin is a separate step at the end of the order; the rest of the work never needs it.
- **macOS:** Xcode command-line tools (`xcode-select --install`), Homebrew, `brew install cmake node llvm` (llvm gives clangd).
- **Linux or WSL:** `sudo apt install build-essential cmake ninja-build clangd`, plus the JUCE Linux dependencies listed in JUCE's own `docs/Linux Dependencies.md` at the version the order pins (looked up, never remembered), Node 22 or later, git.
- **VS Code** with the Claude Code extension (and the WSL extension on Windows), or Claude Code in the terminal.
- **LSP on.** Claude Code has native language-server support: switch it on with `ENABLE_LSP_TOOL=1` in the shell profile, add the LSP plugin marketplace and install the C++ server plugin with clangd on the PATH. Check the exact steps against Claude Code's plugins reference at set-up time, since they have changed between versions. For clangd to see the project, the build writes `compile_commands.json` (`CMAKE_EXPORT_COMPILE_COMMANDS=ON` in the preset); W0 does that.

## 3. The project (once)

```bash
mkdir -p ~/projects && cd ~/projects
{{kit}} new NAME --from ORDER
cd NAME
{{kit}} workorder NAME --template TEMPLATE
cp ORDER docs/workorders/NAME/workorder.md
```

`new --from` makes the folder, the house files and a git repo on a work branch, and installs the kit from the order's install block. `workorder` writes `docs/workorders/NAME/` with `PROMPT.md` and `run.sh` (and the template's steps, which the saved order replaces).

Then the design: put the approved pictures in `design/reference/`, one per screen, named as the order names them (`panel.png`, `display.png`), each with the prompt that made it beside it (`panel.prompt.txt`).

Then the pre-flight and the first commit:

```bash
{{kit}} workorder check NAME
git add docs design .claude
git commit -m "NAME: the work order and the design"
```

`workorder check` reads the order the way the run will and refuses what would stop it halfway: a placeholder left, a step whose Done when holds no number and no test path, a skill the project has not installed (with the pack that brings it), a red `doctor --strict`. Green, or the hand-over says what each line means and how to fix it. The runner runs the same check before its first session and starts nothing on a refusal.

## 4. Start

Open the project in VS Code (a WSL window on Windows), open Claude Code, and type:

```
Run docs/workorders/NAME/PROMPT.md
```

To leave it running on its own: read `PROMPT.md` and `run.sh` once, then:

```bash
bash docs/workorders/NAME/run.sh
```

It runs session after session, writes every decision in `decisions.md` and every finished item in `progress.md`, and stops on the `DONE` file. What to look at while it runs, so the person knows what "working" looks like: `progress.md` (one line per finished item), `decisions.md` (overturn any), `bugs.md`, and `build/evidence/` (what each step measured). Three sessions in a row that move nothing stop the runner; its log says why.

## 5. With a GitHub connection in claude.ai: set it up for them

When the chat has a GitHub connector or repository access, Stage 9 starts with a choice:

> I can set the project up for you: create the repository, lay down the folder structure with claude-packs installed, put the work order and the design in place, and push it, so you only clone it and type the start sentence. Or I can give you the steps above to do yourself. Which?
> 1. set it up for me (recommended)  2. give me the steps

Setting it up means, in the chat's own workspace: run the commands of section 3 there, add the approved pictures (attached in the chat, or fetched from the OpenArt connector where it serves the file), run `workorder check` and show its last lines, commit on the work branch, create the repository under the person's account (private by default) and push. Then the hand-over is three lines:

```bash
git clone URL ~/projects/NAME && cd ~/projects/NAME
npm install   # if the order's W0 needs it
# open in VS Code, then in Claude Code:  Run docs/workorders/NAME/PROMPT.md
```

What cannot be done from the chat, and is said plainly: anything that runs on the person's machine (the house skeleton tool, the first build, the machine set-up in section 2), and a picture that only exists on the person's disk. Those stay as steps for them, listed.
