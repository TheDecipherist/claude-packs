---
name: design-the-edit-layer
description: Use when designing a synth's edit layer (an editor that shows every parameter) or writing the AI image prompts for its pages, before the first prompt is written. Also /design-the-edit-layer.
---

# Design the edit layer (one job: every control in the right section, in the machine's colours, on pages that fit, from the first prompt)

An edit layer designed prompt by prompt takes a dozen images to get right: controls missed because a menu page was never read, three identical oscillators drawn three ways, sections filled with colour, a top bar rearranged. Each of those is decided here, once, before the first prompt.

<constraints>
Always do:
1. **Count every control before any picture.** Read the machine's manual section by section: every button, knob, slider and switch on the panel, every menu page's parameters, every combination a button changes (one Level knob that sets level, pulse width, sync or hardness by the button lit is several controls). Read the parameter table beside it. Write a census in `docs/editor/census.md`: one row per control, its section, its kind (knob, choice, switch, depth), its range from the table, and its source (the manual's page or the firmware's address). Where the manual and the table disagree, log a bug and let the firmware decide; never pick one silently.
2. **Count the sections and their instances.** From `design/shape.json`, each many concept's count (three oscillators, three envelopes, two LFOs, eight parts) and what every instance owns. Identical instances get identical layouts with the same places; a control one instance lacks leaves an empty place, never a shifted row.
3. **Decide the pages.** One page per area a player works in (the sound, the voice, modulation, effects, arpeggiator, presets, performance or multi), every control of the census on exactly one page, nothing behind a menu. Lay the main page out in columns that read like the signal, left to right, the most important section alone in the widest column; cards stacked full width in a column, never side by side; 16:9 (`ui-is-16-9-resizable`).
4. **Decide tabs by the numbers.** When a section's instances will not fit side by side at a readable size, they become one card with instance tabs. A hardware select row (buttons that pick which source the section edits) becomes the tab strip, every source it selects a tab. A button that changes what a pair does (an FM switch) is a switch on its tab, never a tab of its own. Every tab shows its instance's live state under its label by default: an oscillator its wave drawn small with its name, an envelope its shape, an LFO its wave, a source its level; nobody has to ask for this.
5. **Take the colours from the machine.** Measure the real panel's section title colours (the look analysis) and give each editor section its section's colour, used only on the card's title bar, group labels, knob dots and lit tabs; card bodies stay dark. Where two different things sit side by side in one colour on the machine (LFOs and envelopes both green), give one of them another of the machine's own colours that is not on that page, and write why.
6. **Write each prompt from the census.** Every control in its section by its census name, in a fixed place, once; the ranges from the table; placeholder names only, never a factory program's name. Describe arrangement as well as content (which items sit on one line, what is never stacked, what is never moved), and state the hard rules in capitals: card bodies dark and never filled with their colour; no dropdowns, no pop-ups, no slide toggles inside cards; exactly N columns, never N+1. Mark the prompt document `<!-- audience: outside -->`.
7. **Anchor the style on an approved image.** Once one mock-up is approved, attach it as the style reference to every later prompt ("copy its visual style exactly; only layout and controls differ; the image wins"), and attach a crop of any part that must not drift (the top bar). Keep the references in `design/reference/`, never in git.
8. **Check every image against the census.** Control by control: present, once, right range, right section, right label; list what is missing, doubled or wrong, fix the prompt's wording for each slip, and record each design choice in `docs/editor/decisions.md` with an anchor. A tabbed card shows one tab per image, so generate one image per tab state that must be checked.
9. **Displays follow their laws.** Every display carries its scale, its drag points and, where it fits, a morph point (`displays-carry-their-scale`), an expand icon (`display-expands-to-a-layer`), and the echo where the user chose (`display-echo`).

Never do:
- Write a prompt from memory of the machine, or before the census exists.
- Let identical instances be drawn differently, or let a control appear twice.
- Fill a card with its section colour, or describe a part's content without its arrangement.
- Ask the user to remember any of steps 1 to 9: they are the default.
</constraints>
