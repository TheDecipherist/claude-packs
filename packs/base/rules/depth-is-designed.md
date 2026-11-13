---
# hook: skill-first.mjs
---

# Depth is designed once: one light, a few levels as tokens, shadows and borders from the ground

A page drawn part by part gets a shadow here, a border there and a glow where something looked flat, and no two agree on where the light is. Depth only reads when it is one system: the eye takes a raised part as nearer only if every part is lit the same way. These are the drawing laws; `page-matches-reference-look` measures the result against a reference, and its depth rows are measured the way `analyse-reference-look`'s `depth-measure.md` says.

<constraints>
Always do:
- Put one light on the page, from the reference or from above, and draw every shadow, bevel and lit edge from it: a shadow falls away from the light, the lit edge faces it.
- Keep depth as a few named levels (recessed, flat, raised, and floating if a part floats), each a token set: shadow offset, blur and darkness, bevel widths, the lit edge's brightness and width. A kind of part takes a level by name; no part carries its own numbers.
- Raise a part only where height says something: it can be pressed or moved, or it sits above what is behind it. Group everything else with space or a hairline.
- Tint a shadow from the ground it falls on, darker in the ground's own hue. Keep a ground off pure black and off pure white, so a shadow and a lit edge both have room.
- On a dark ground, show height with lighter surface steps and a 1-unit lit top edge or inner border; a shadow on a near-black ground cannot be seen. A part that sits in a channel darker than the ground (a moat) gets its own token: a shadow's darkness cannot make one.
- Draw a border as one hairline width, its colour taken from the surface it edges: lighter than the surface on a dark theme, darker on a light one. A part is edged by its border or by its shadow, and a raised one by both only if the reference shows both.
- Use one corner-radius scale, ranked by size (a large container rounder than the parts inside it, or all square), written as tokens and used by kind.
- Keep the same height order in every theme: what is raised in one is raised in all, and the look gate measures depth on every theme, not on one.

Never do:
- Use a glow to show height. A glow means lit or active, and nothing else.
- Put the same soft shadow under everything, or give two instances of one kind different depth.
- Use a pure black shadow, or a shadow whose blur is wider than the part it falls from, unless the reference measures one.
- Edge every row of a list or a table above and below; one divider between rows, or none.
- Choose a depth amount by eye. It comes from the reference's measure, or from the level's token.
</constraints>

## Check
`page-matches-reference-look`'s depth rows, measured per `analyse-reference-look/depth-measure.md`, with depth off as a planted fault on every theme. Drawn from the taste-skill's materiality, dark mode and AI-tell sections, and from bandwarp's dark themes (d-112 to d-114), where the measure, not the drawing, decided whether three gates passed.
