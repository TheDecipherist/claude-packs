# From the finished order to the first build session (for `workorder-writer`)

Two additions to the skill: a process list the person can see at any point, and a hand-over at the end that leaves nothing to guess. Plus the thing that makes the hand-over short: the order carries its own install block, so claude-packs is set up from the order, not from memory.

## 1. Where you are, from start to finish

The skill already starts each message with "Stage n of 8". Two more things:

- **The whole list, with the current one marked**, is shown at the start of Stage 1, at the start of every later stage, and whenever the person asks "where are we", "what's left" or "what's next". Done stages get a tick, the current one an arrow, the rest nothing. One line each, no detail.
- **One more stage.** Stage 8 becomes two: the check (8) and the set-up (9), because the set-up is where a beginner is on their own and it deserves its own screen.

```
Where we are:
  ✓ 1  What you are making
  ✓ 2  What it does
  ✓ 3  What you have
  → 4  How it looks
    5  How it is built
    6  The steps
    7  The design pictures
    8  The check
    9  Setting up the project
```

The list is the same nine lines every time, so the person learns it once.

## 2. The order carries its own install block

Everything the kit needs to set a project up is already decided by the time Stage 5 ends: the configuration, the packs, the folders, the opt-in hooks and checks, the looks, the guards. Today that knowledge is spread across the order's prose and the person's memory. Instead the order carries one fenced block, written by the skill in Stage 5 and never by hand:

````markdown
## Install

```claude-packs
configuration: synth-creator
packs: cpp, audio-core, instrument-shell, midi, sound-design
enable:
  - checks/ui-drawn-in-code.json
  - hooks/idle-wake.mjs
looks:
  - name: panel
    reference: design/reference/panel.png
    code: ["src/ui/**"]
guards:
  images:
    allowed: ["design/reference/**", "build/pictures/**"]
commands:
  build: node .claude/tools/buildq.mjs cmake --build build --preset dev
  test: node .claude/tools/buildq.mjs ctest --preset dev
```
````

What it is for:

- **The hand-over reads it** to print the exact commands (section 3), so the person types what the order says, and the order is the single source.
- **W0 reads it**: the run's first step installs from this block and proves it with `doctor --strict`. A skill the order names that the install does not bring is a kit gap, logged, never worked around.
- **The kit gets one command**, as its own kit work order: `claude-packs init --from docs/workorders/<name>/workorder.md`, which reads the block and does what the hand-over's commands do by hand. Until it exists, the hand-over prints the commands; after, it prints the one line. Either way the block is the truth.

The block's keys are the kit's own (`layout.json`'s `configuration`, `enable`, `looks`, `guards`, `commands`, and `init`'s packs), so there is nothing new to learn and nothing to translate.

## 3. Stage 9: setting up the project

The skill prints this in full, filled in from the order, with the person's platform and name in place of the placeholders. Nothing is "see the README".

**First, the machine (once per computer).**

- **Windows: build in WSL.** Claude Code, the kit's hooks (node and bash) and the builds run far faster under WSL than on native Windows, and the kit's shell laws assume a Unix shell. Install WSL with Ubuntu, keep the project inside the WSL filesystem (`~/projects/<name>`, not `/mnt/c/...`: the Windows side of the filesystem is slow from WSL), and open VS Code with the WSL extension. The Windows-native build of the plugin is a separate step at the end of the order, from the Windows side; the rest of the work never needs it.
- **macOS:** Xcode command-line tools (`xcode-select --install`), Homebrew, `brew install cmake node llvm` (llvm gives clangd).
- **Linux / WSL:** `sudo apt install build-essential cmake ninja-build clangd` plus the JUCE Linux dependencies (listed in JUCE's own `docs/Linux Dependencies.md`, looked up at the version the order pins, never remembered), Node 22+ from NodeSource or nvm, git.
- **VS Code** with the Claude Code extension (and the WSL extension on Windows), or Claude Code in the terminal.
- **LSP on.** Claude Code has native language-server support (since 2.0.74): switch it on with `ENABLE_LSP_TOOL=1` in the shell profile, add the LSP plugin marketplace and install the C++ server plugin (`clangd@claude-code-lsps`) with clangd on the PATH. Check the exact steps against Claude Code's plugins reference at set-up time, since this has changed between versions and some builds need a patch. For clangd to see the project, the build must write `compile_commands.json` (`CMAKE_EXPORT_COMPILE_COMMANDS=ON` in the preset); W0 does that.

**Then the project (once).**

```bash
mkdir -p ~/projects && cd ~/projects
npx @thedecipherist/claude-packs new <name> --config <configuration> --packs <packs from the install block>
cd <name>
npx --no-install @thedecipherist/claude-packs workorder <name>
```

That makes the folder, the house files, a git repo on a work branch, installs the kit and writes `docs/workorders/<name>/` with `PROMPT.md` and `run.sh`. (A rebuild of real hardware uses the same command; the template is chosen by the order's own text, not by a flag.)

**Then the order and the design.**

1. Save the finished `workorder.md` over `docs/workorders/<name>/workorder.md`.
2. Put the approved pictures in `design/reference/`, one per screen, named as the order names them (`panel.png`, `display.png`), with the prompt that made each beside it as `<name>.prompt.txt`.
3. Apply the rest of the install block to `.claude/layout.json` (`enable`, `looks`, `guards`, `commands`), then `npx --no-install @thedecipherist/claude-packs update`. Until the kit reads the block itself, this is the one step done by hand; the hand-over prints the JSON to paste.
4. `npx --no-install @thedecipherist/claude-packs doctor --strict`. Green, or the hand-over says what each red line means.
5. Commit: `git add docs design .claude && git commit -m "<name>: the work order and the design"`.

**Then start.**

Open the project in VS Code (WSL window on Windows), open Claude Code, and type:

> Run docs/workorders/<name>/PROMPT.md

To leave it running on its own: read `PROMPT.md` and `run.sh` once, then `bash docs/workorders/<name>/run.sh`. It runs session after session, writes every decision in `decisions.md` and every finished item in `progress.md`, and stops on the `DONE` file.

**What to look at while it runs**, so the person knows what "working" looks like: `docs/workorders/<name>/progress.md` (one line per finished item), `decisions.md` (overturn any), `bugs.md`, and `build/evidence/W<n>/` (what each step measured). A session that moves nothing three times in a row stops the runner; the log says why.

## 4. If a GitHub connection is available in claude.ai: set it up for them

When the chat has a GitHub connector or repository access, Stage 9 starts with a choice:

> I can set the project up for you: create the repository, lay down the folder structure with claude-packs installed, put the work order and the design in place, and push it, so you only clone it and type the start sentence. Or I can give you the steps above to do yourself. Which?
> 1. set it up for me (recommended)  2. give me the steps

Setting it up means, in the chat's own workspace: run the `new` and `workorder` commands above there, write `workorder.md` and the `layout.json` additions from the install block, add the approved pictures (attached in the chat, or fetched from the OpenArt connector where it serves the file), run `doctor --strict` and show its last lines, commit on the work branch, create the repository under the person's account (private by default; synth repositories go to the account the person names) and push. Then the hand-over is three lines:

```bash
git clone <url> ~/projects/<name> && cd ~/projects/<name>
npm install   # if the order's W0 needs it
# open in VS Code, then in Claude Code:  Run docs/workorders/<name>/PROMPT.md
```

What cannot be done from the chat, and is said plainly: anything that runs on the person's machine (synthkit's skeleton tool, the first build, the machine set-up in section 3), and a picture that only exists on the person's disk. Those stay as steps for them, listed.

## 5. What the skill's text changes

- Stage 1 opening: show the nine-line list.
- Every stage opening: the list with the arrow moved.
- Stage 5: write the install block from the decisions, show it, get a yes.
- Stage 8: the check as today, plus two new lines: every command in the hand-over exists in the kit at the version the order pins (no `--template`, no skill the kit lacks), and the install block's packs bring every skill the steps name.
- Stage 9 (new): the GitHub choice when available, then the hand-over above, filled in.
- The laws section: "The order carries its install block; W0 installs from it and nothing else."
