---
name: prove-control
description: Use after adding, renaming, re-ranging or removing a control, or before calling a control's step or bug done.
---

# Prove a control at every surface it has

## Steps
For the control's parameter ID, run each check through the real path and save the command plus its output as evidence. Use the project's own probes and tests (see CLAUDE.md, Project commands).

Start with the real input path (`a-control-is-proved-through-its-input`): a gesture sent at the real editor's peer moves the parameter, the pixels and the audio. A gate that writes the parameter proves none of the control. Then see it red: with this control's input handling compiled out, the gate fails while the parameter's own tests stay green.

1. **Host:** set the parameter by ID in an offline render, at its minimum, default and maximum. The render must change, and a null test against default must fail where it should and pass where it should.
2. **Editor:** the widget is attached to that same ID. Moving it changes the parameter, and a host-set value shows in the widget with the same text as the host's value-to-text.
3. **Patch:** save, load and compare. The value is bit-identical, and old patches without the ID load the spec default.
4. **Init and reset:** the init patch and the reset action give the value the spec states.
5. **MIDI** (if mapped): the CC or learn moves the parameter over its full range.
6. **Undo:** one drag is one undo step, and host automation never enters undo.
7. **In the real window:** press, drag, wheel and double click one control of this template on a loaded patch (not only INIT); a table
   read proves the same control on the other slots is that template and is wired (`test-the-template-once`). The value and the sound or picture change. A choice control (dropdown, select, menu) opens its list on a press, shows every
   choice with the current one marked, sets the one chosen, and closes on Escape or a press outside; it never steps on a press.
8. **IDs:** the parameter ID list diff is empty except for the intended change (see `parameter-ids-never-change`).

## Report
A table with the columns Surface, Command, Result and PASS/FAIL. A surface the control doesn't have is marked N/A, with the reason. Change nothing in this skill. Fix through `bug-fix-starts-red`.
