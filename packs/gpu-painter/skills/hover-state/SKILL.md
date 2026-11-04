---
name: hover-state
description: Use when a control, handle, tab, list row, key or button is added or changed in a drawn UI, when a user says something does not react under the mouse, or when a hover gate is written or fails.
---

# Hover state (one job: every pressable thing answers the pointer, and a gate proves it)

The law is the rule `hover-every-pressable`: a cursor naming the interaction, and a small visible effect on the hovered thing itself. The hover follows the press's own hit test.

## Add the hover to a new control
1. Find the one function the press uses to find the item under the pointer (the hit test). If there is none, make one and have the press call it.
2. Have the mouse-move path call that same function and store the result (the hovered id). Do not keep a second list of hoverable things.
3. Pick the cursor from the interaction, not the look: drag up-down, drag left-right, drag both ways (a 2-D point), press (button, tab, row, key), text. Set it from the hovered id.
4. Draw the effect on the item's own pixels from the hovered id: a lift, a ring, a brighten. Ease it over about 0.1 s on the frame clock (not the wall clock, or two runs differ). A neighbour must not change.
5. Disabled looks are for what is truly disabled. If the press works, the hover shows.
6. Add the item to the hover walk (below) in the same change.

## Prove it: the hover walk
A gate that runs the real window (or the real page) and, for every item the pointer can act on:
1. moves the pointer there through the same function a mouse move calls, and waits the glide on the virtual frame clock;
2. reads that the hover model found the item the press finds there (the two lists agree);
3. reads that the cursor is the interaction's;
4. reads the pixels of the item's box and of a ring round it, hovered against at rest: the box changes by a floor (pixels and share), the ring does not;
5. moves away and reads that the box came back to rest.
Rows a press cannot reach (another control covers every point) are listed, not judged. Run it twice and require one digest (a wall-clock hover differs between runs).

Plant its faults so the gate is seen red: hover off altogether, one kind of item with no cursor or effect, one kind drawn interactive but left off the hover list, the wall clock in place of the frame clock. A gate never seen red is not a gate.

## Declare it
`layout.json`: `"gates": { "hover": "<the command>" }`. `doctor` is red while the project has UI code and no gate is declared, or the declared command names a file that is not there. A project with truly no pointer says `"hover": "none: <reason>"`.

## Worked example
Stellix: `tools/gates/hover_gate.sh` (the runner and its `--selftest` plants), `lib/app/gates/editor_hoverwalk_read.h` (the walk that hovers every item through the mouse-move path), `tools/gates/hover_judge.py` (the judge: cursor per kind, own pixels change, ring does not, comes back). Read them for the shape; the numbers and names are that project's own.
