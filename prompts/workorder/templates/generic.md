# Work order: {{name}}

Written {{date}}. Replace everything in angle brackets. The `write-a-workorder` skill says how.

**What this is.** <One paragraph: what gets built, for whom, and what "finished" looks like.>

**The position.** <What is known, what is not, and what cannot be proved. Say it plainly, so no document claims more than the work can show.>

**The sources.** <Every input, by path or URL: specs, data, designs, reference code. What each gives, and what is still missing. Nothing the run needs may live only in someone's head.>

**The foundation.** <What is reused and must not be written again: libraries, shared code, earlier projects to read for their method.>

**Models.** <Existing work to learn from, and which part of it. Say what not to take.>

<constraints>
Always do:
- Work the steps in order.
- Prove each step's "done when" by running it, and keep the evidence in `build/evidence/<step>/`.
- Give every new test or gate a planted fault that turns it red, and show it red.
- <The laws of this project.>

Never do:
- Commit <what must stay out of git: secrets, data, other people's files>.
- Mark a step done when it was not measured, or weaken a test to pass it.
- <What this project must not do, or claim.>
</constraints>

---

## W0. Set up

The kit is installed from this block and nothing else. Name the configuration and the packs the project needs (`suggest` reads them from the code), and any layout keys it owns (`enable`, `commands`, ...).

```claude-packs
configuration: base
packs: base
```

1. Install from the block: `{{kit}} init --from docs/workorders/{{name}}/workorder.md`.
2. <The project's skeleton, and a build that runs.>
3. Run `doctor --strict` and fix what it finds.

**Done when:** <A measurement: the build passes (exit 0), the first test runs, `doctor --strict` reports 0 problems.>

## W1. <The first real step: usually finding out, before building>

1. <What to do, in order. Say what to read and what to produce.>

**Done when:** <A number or a test (for example 0 failures in `tests/x.test`, 12 of 12 present), never "looks right".>

## W2. <The next step>

1. <Put what the rest depends on first, and prove it before building on it.>

**Done when:** <A number or a test (for example 0 failures in `tests/x.test`).>

## W3. The README

Use `write-the-readme`. Written last, when the UI is finished: `README.md` at the project's root is the project's front page. Its name and what it is in its first lines, a screenshot of the product itself on top, then what it does, install, first use, build from source, requirements, what is not done yet, and the licence. Every screenshot is one the product renders of itself through its real code path, never a mock-up or a reference render: the main screen and each one worth seeing, when it has a UI; a command line shows a real run of its main command instead; made by a script the build runs, saved compressed in `docs/images/`, and made again whenever the look changes.

**Done when:** the README has every section `write-the-readme` names; each image in it was made by the script from this commit's build (the run and the images' hashes in the evidence); 0 broken links or missing images; every command in it runs as written; the `humanize` pass is recorded.

## W4. Before calling it finished

Read the finished work as a senior engineer would. List what is left, what is unproved and what a person must judge.

**Done when:** every open item is written down, with why, and the count of open items is stated (0 open items without a reason).

## W5. The report

Before the final report, list each deliverable the user asked for and where it is. Write `docs/workorders/{{name}}/report.md`: what was built, what is proved and how, what is not, and what the kit did well and badly, with counts from `logs`.

**Done when:** every section has counts, or a stated reason there are none, and each deliverable asked for is listed with its path (0 missing).
