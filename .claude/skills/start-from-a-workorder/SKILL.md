---
name: start-from-a-workorder
description: Use when starting a new app, product or rebuild, when a work order or a design image is handed over to build from, or when asked to start building from a plan.
---

# Start a build from a work order and its design (one job: the run starts from a finished brief, never a blank page)

A build goes best when the thinking is done before the code: the work order says what the app is, every source, every step and how each is measured, and the design picture says how it looks. The user writes the order in claude.ai, starting from the kit's template, and makes the design with an image model from a prompt Claude writes. This skill takes both and starts the run.

<constraints>
Always do:
1. No work order yet: write one from the kit's template, never a blank page. `npx --no-install @thedecipherist/claude-packs workorder <name>` writes the general one; add `--template rebuild` for a hardware instrument rebuilt as a plugin. Then the `write-a-workorder` skill.
2. A work order handed over: run `workorder <name>` (with the template it was written from) for `PROMPT.md` and `run.sh`, and put the handed order in place of the generated `workorder.md`, word for word.
3. Read it as the run will, against `write-a-workorder`: what finished looks like, the position, every source by path, the foundation, every step ending in **Done when:** with a number or a test. Every **[if ...]** step is kept or deleted, with the reason in `decisions.md`. List each gap for the user before the run starts, with the recommended fix. Change the order only with the user's yes.
4. A design handed over: put each picture in `design/reference/` under the name of the screen it shows, and point the order's UI steps at it. Run `analyse-reference-look` on each before the code that draws it.
5. No design yet, and the order is complete: write the user "an AI image prompt for the app": one per screen, from the order's own words (what the screen holds, its controls, its text, its mood), straight on, no device frame. Every word to be drawn exactly (the title, each label, each scale mark, each readout) goes in double quotes, with the rule that the only text in the picture is the quoted text: an unquoted word is read as description, and the model makes up text from it. Every mock-up is 16:9 (1920 x 1080), so every screen resizes and scales the same way; a small screen sits centred in the 16:9 frame. Recommend Nano Banana Pro, the model known to work well for UI. With an OpenArt connector, offer to make them; without one, the user renders them on openart.ai and hands them back.
6. Check the run can start: `doctor --strict` is OK, the first step's sources exist, and `PROMPT.md` and `run.sh` were read. Then say how to run it: `Run docs/workorders/<name>/PROMPT.md` to watch, or `bash docs/workorders/<name>/run.sh` to leave it.

Never do:
- Start building before the order is complete. A gap found at step 9 costs a rebuild; a gap found now costs a line.
- Ship a design picture in the source, or draw the UI from it by eye: it is a reference, measured by `analyse-reference-look` and judged by the look gate.
- Edit the handed order's steps silently, or fill a gap by guessing. Ask, with the recommendation.
</constraints>
