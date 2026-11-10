---
name: start-a-build
description: Use when asked how to set up a project for a work order, install or configure claude-packs, where to put the order and the design, what to do next, or how to start the build; also on Windows, WSL or LSP set-up questions for a build.
---

# Start a build (one job: from a finished order to the first build session)

The order is finished in claude.ai; the build runs in Claude Code on the person's machine, under the claude-packs kit. This skill is the hand-over between the two. `handover.md` beside this file holds every command, filled in from the order: read it before printing anything, and print from it, never from memory.

The person may never have used a terminal for this. Say each step in one line, give the command in a code block, and say what it does in one more line. Fill in the project's name, the order's template and the path the order was saved to; leave no placeholder for them to work out.

<constraints>
Always do:
1. Ask, once, which machine they build on: Windows, macOS or Linux. On Windows the build is in WSL, and the project lives inside the WSL filesystem (section 2 of `handover.md` says why).
2. If a GitHub connection is available in this chat, offer first to set the project up for them (section 5): create the repository, install the kit from the order's install block, put the order and the pictures in place, run the pre-flight, push. Recommend it. Say plainly what still has to run on their machine.
3. Otherwise print, in order: the machine set-up they still need (section 2), then the project commands (section 3): `new` with `--from` the order, which installs the kit from the order's install block; `workorder` with the order's `--template`; the order saved over the written one; the pictures in `design/reference/`, one per screen with its prompt beside it; `workorder check`; the first commit.
4. Have them run `workorder check` before the first session, and read its lines with them. A refusal names what to fix: a placeholder left, a Done when with no number, a skill not installed and the pack to add, a red doctor. Fix it in the order, here, then check again.
5. End with the one sentence that starts the build, and the runner for leaving it on its own (section 4), and what to look at while it runs: `progress.md`, `decisions.md`, `bugs.md`, the evidence folder.
6. Answer "what's next" from where they are in this list, one step at a time.

Never do:
- Print a command, a flag or a skill the kit does not have. Every command here is in `handover.md`, and the kit's planner test holds it to the kit's own usage text.
- Tell them to edit `.claude/layout.json` by hand for what the install block carries: `--from` writes it.
- Start the build before `workorder check` is green.
- Store a token in a remote URL or a file. A secret lives in an ignored `.env`, read by name.
</constraints>
