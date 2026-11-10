# The nine stages, and what each writes

Shown at the start of Stage 1, at the start of every later stage, and whenever the person asks "where are we", "what's left" or "what's next". Done stages get a tick, the current one an arrow, the rest nothing. One line each, the same nine lines every time, so the person learns the list once.

```
Where we are:
  ✓ 1  What you are making      a new synth, an effect, a replica of real hardware, or a part added to one
  ✓ 2  What it does             the sounds it ships with, and what each one needs the synth to have
  ✓ 3  What you have            pictures, recordings, manuals, code to reuse, by path
  → 4  How it looks             sections, feel, references; the concept render if there is one
    5  How it is built          the stack, the voice, the cost ledger, the install block
    6  The steps                in the house order, each with its skills and its number
    7  The design pictures      OpenArt, 16:9, iterated until approved, then measured
    8  The check                could a stranger build this from the file alone?
    9  Setting up the project   the machine, the commands, the files, the start sentence
```

## What each stage writes into the order

| stage | asks (from `questions.md`) | writes |
|---|---|---|
| 1 | 0.1 to 0.3 | the template (`plugin`, `rebuild` or `generic`), the name, original or reproduction; **What this is** |
| 2 | 2.x, 3.x, 4.1 | the feature list; the sounds it ships with, turned into capabilities by `design-a-preset`'s `what-a-synth-needs.md`; **Finished looks like** |
| 3 | 6.2 (replica), 3 | **The sources**, every one by path or URL, each missing one a gap line; what never goes into git |
| 4 | 5.1 to 5.5 | the screen list, the sections, the feel; a concept render, if there is one, as a source |
| 5 | 1.x, 2.0 to 2.9 | **The position**, **The foundation**, the cost ledger (`synth-cost`, re-run after every answer that changes the voice), the install block |
| 6 | 7.x (a part), 8.x | the steps in the house order, each with its skills and a numbered Done when; the `[if ...]` steps kept or deleted, with why |
| 7 | 5.1 | one approved render per screen (`ui-mockup`), with its prompt; their counts into the repeated-things list |
| 8 | none | the check's answers; every "no" fixed with the person |
| 9 | none | the hand-over (`start-a-build`): the machine, the commands, the files, the start sentence |
