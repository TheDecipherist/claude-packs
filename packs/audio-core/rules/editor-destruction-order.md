---
# concepts: ui
---

# An editor comes apart in order: attachments first, and the processor never holds it

A host deletes a plugin's editor whenever the user closes its window, while the processor goes on running and the host goes on moving parameters. An editor that takes away its timer or its look-and-feel while an attachment is still connected leaves that attachment updating a control with nothing behind it, and a processor that keeps a raw pointer to its editor calls into freed memory the next time it uses it. Both crash only in some hosts, some of the time, which is why pluginval opens and closes the editor while it automates.

<constraints>
Always do:
- In an editor's destructor, reset every parameter attachment first (`cutoffAttachment.reset();`, `attachments.clear();`), then `stopTimer()`, then `setLookAndFeel (nullptr)` on the editor and on each control that was given one.
- Where attachments are left to member destruction, declare each one after the control it attaches to: members are destroyed in reverse order, so the attachment goes first.
- Reach the editor from the processor only through `getActiveEditor()`, a `juce::Component::SafePointer`, or a message the editor reads (an atomic, a FIFO, a `ChangeBroadcaster` it listens to and removes itself from in its destructor).
- Treat the editor as deletable at any moment while the processor runs: no state that the sound depends on lives only in the editor.
- Gate it: open and close the editor many times while audio and automation run (pluginval at strictness 10 does this), and see a planted wrong order fail.

Never do:
- Call `stopTimer()` or `setLookAndFeel (nullptr)` in a destructor before an attachment's reset (`editor-teardown-order` refuses the edit).
- Keep a raw pointer or reference to the editor in the processor, or set one in the editor's constructor for the processor to call.
- Let the audio thread touch the editor in any way.
</constraints>

## Check
`editor-teardown-order` catches a destructor that resets an attachment after `stopTimer()` or `setLookAndFeel (nullptr)`. Member order and the processor's pointer are for review, and for the editor open-and-close gate.
