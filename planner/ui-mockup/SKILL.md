---
name: ui-mockup
description: Use when a panel, a screen or a page needs a mock-up, a render or a design picture, when a render is to be iterated or approved, or when asked whether a render is good enough to build from.
---

# UI mock-up (one job: the approved design picture, one per screen)

The approved render is the design. The build measures it into numbers (the kit's `analyse-reference-look`), draws the panel in code from that table, and gates the result against the picture element by element, depth included. So a render approved loosely is built loosely, and a render with no readable depth is built flat. `analyse-a-mockup.md` beside this file holds the approval checks, the prompt bands and how a render is read into the order: read it before the first prompt.

Two things leave this skill, always together: the approved pictures and the exact prompts that made them. The prompt is the design's source: a new screen later extends it, and the family stays one.

## The interview, one question at a time

0. **Do you have a design in mind?** 1. I have pictures, or a machine to reproduce (pin); 2. surprise me (explore, recommended when unsure); 3. somewhere between (explore, seeded with what they have). A concept render made before the order is a source: read the sections and the feel off it, and render it again at the end.
1. **Which screen first?** Every screen, page, layer, open dropdown and dialog is its own render. The panel first.
2. **The feel** (explore only): the answer's words go into the prompt as they are ("dark, warm wood, soft glow").
3. **The colours** (explore only): "surprise me" is the recommended first option; a named scheme otherwise. Hex values come at pin time.

Skip a question the order already answers.

## Two kinds of prompt

- **Explore** (no direction yet): the layout skeleton (the sections in bands and their proportions), the instrument's job in one sentence, and the mood in strong adjectives. No hex values, no full control list. Two images per round. Cheap: this is where the direction is found.
- **Pin** (a direction is chosen): the prompt bands of `analyse-a-mockup.md`, in order, with every control, its real label and its count, the depth in words, and what is not in the picture. Every string that must appear is written out verbatim; anything only described is painted as text. State "exactly N" for every repeated control.

An approved explore image is a direction, not yet a reference: pin it, render it again clean, and only the pin result is approved.

<constraints>
Always do:
1. Render at **16:9**, straight on, the screen alone filling the frame: no device, no hands, no perspective, no room. A small screen or dialog is centred inside the 16:9 frame on a plain ground.
2. Use **Nano Banana Pro**; another model only if the person asks. If an OpenArt connector is in this chat, offer to render here (recommended), say the cost first, and never start a generation the account cannot afford. Without it, say OpenArt can be connected, and give the prompt with the steps: openart.ai, the image generator, Nano Banana Pro, 16:9, paste, generate, download, name the file for its screen.
3. Put every word that must be drawn exactly in double quotes, in every prompt, whether it goes to the OpenArt connector or to the person: the title, each control's label, each switch position and scale mark ("1", "2", "3", "4"), each readout and preset name. Add the text rule: the only text in the picture is the text in double quotes, spelled as written, and no other word, label or number. An unquoted word is read as description, and the model makes up text from it: one render drew knobs labelled "MIDTIT" and "KERV" that no order named.
4. Show the complete prompt before every render, never a summary.
5. Iterate by image: the previous render attached as the reference, the change in words, "where the layout below differs from the attached image, the layout below wins". One change per round, so cause and effect stay readable; check each new render for drift before showing it.
6. Make a detail render for anything too small to read whole (a knob and its label, the display), never a crop.
7. Approve only a render that passes every check in `analyse-a-mockup.md`: counts, depth, alignment, readability, live parts, clutter. Show the person each check's answer.
8. Extend the family by image: a new screen is rendered with the approved ones attached as references, "same design system as the attached image".
9. Put each approved picture in `design/reference/`, named for its screen, with its final prompt beside it (`panel.prompt.txt`), and the explore prompt that found the direction too.
10. Read each approved render into the order's UI step as `analyse-a-mockup.md` says, and put its counts in the order's repeated-things list.
11. For a rebuild of real hardware, the picture is the real panel straight on, from its real controls and labels, never reimagined; the kit's `straight-on-and-aligned` governs the measuring.

Never do:
- Prototype the panel or a page in HTML or any second medium: the picture is the design and the build is code; a page in the middle is a second design that drifts from the first.
- Approve by eye, approve a flat render for a panel with depth, or keep two pictures for one screen.
- Let a render add a control, a label, a pill or a marker the order does not name, or drop one it does.
- Put a real person's name, an email or a credential in a prompt.
</constraints>
