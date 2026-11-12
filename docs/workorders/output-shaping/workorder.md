# Work order: output-shaping

Written 2026-11-12, for claude-packs 2.1.0, from the user's instructions of the same day: "most compressors are hooks that
intercept certain commands and does the command for claude and returns a smaller output to claude. We could do something
similar in the kit. But not looking to super compress output. and also have a "killswitch/bypass" that can activate if claude
needs to see the actual real command output. So it should be claude thats in control"; "on certain keywords like if there is an
error or something that we know can be an issue to compress simple let the entire thing through"; "on a couple of feature builds
... log all output that claude reads somewhere and then after go over it all and see what could potentially be compressed/removed
that is not needed to read"; "all the ones I have tested robs claude of important output and usually leads to either wrong code
or bugs down the line or way more turns"; "tokens savings would be a great 2.1 build".

**What this is.** Fewer tokens and fewer turns, never at the cost of a turn or a bug. First a study: every piece of output Claude read during real
feature tasks, sorted by where it came from, counted in tokens, and judged by whether a later turn used it. Then, only for what
the study shows was never used, an output shaper in the kit: a `PreToolUse` hook that routes a matching command through
`.claude/tools/shape`, which runs the real command unchanged, keeps its exit code, saves the whole output to a file, and prints a
shorter version with a footer that always says it was shaped, by how much, where the whole output is and how to get it. Claude
is in control: `raw` before a command, `shape off` for the session, or reading the saved file. Anything that could matter goes
through whole: a non-zero exit, any word of a shared let-through list anywhere in the output, any command with no proved profile.
Finished looks like: the study's report naming the tokens per source and the turns per kind over at least six real tasks; the turn fixes at their sources (refusals that name the form to use, briefs that name the files, batch tools); profiles only for sources the
study justifies; each profile proved on re-runs of the same tasks with the same correctness, 0 extra turns and fewer tokens; the
let-through list, the `raw` switch and the footer each held by a test seen red first; 2.1.0 published with the numbers.

**The position.**
- *Known:* Claude Code's transcripts (`~/.claude/projects/PROJECT/*.jsonl`, and each subagent's) hold every tool result Claude read
  and each message's token usage; bandwarp's 38 agent tasks of 2026-11-11 and 12 and the kit's own typescript run are in them.
  Hook text the kit injects is small (bandwarp: about 49,000 tokens over 24,428 events); refusals were 87 over about 13,000 tool
  calls. A `PreToolUse` hook can rewrite a tool's input before it runs; a `PostToolUse` hook cannot change a Bash result, so the
  shaper must run the command itself. 2.0's resident runner answers a hook in milliseconds, so a rewrite costs nothing a user feels.
- *Not known (W1 and W2 settle each with a number):* how many of a task's tokens are tool output against model text, context
  re-sent and cached; which sources are large and never used; whether `updatedInput` on Bash is honoured in a `claude -p` run and
  in a subagent; how often a let-through word appears in output that passed.
- *Cannot be proved here:* that a profile is safe for every project and every future tool version; the study's tasks are this
  user's (synths and the kit). The report says so, and every profile stays off where its project has not proved it (W5).

**The sources.** The kit (`~/projects/claude-packs`, branch `work/2.1.0-output-shaping` from `work/2.0.0-typescript`); bandwarp's
transcripts and `.claude/logs/events-*.jsonl` (read only, never written; bandwarp is the PC session's for now); the kit run's
transcripts; Claude Code's hooks reference https://code.claude.com/docs/en/hooks.md (`PreToolUse`, `updatedInput`,
`permissionDecision`, `additionalContext`); the 2.0 order's `report.md` and `whats-new-in-2.0.md` for the per-task numbers this
order compares with.

**The foundation.** Reused, never written again: 2.0's resident runner and hook table (the shaper's hook is one more judge-free
hook in the table), `lib/` and `packs/base/hooks/lib/` owners (`files`, `json`, `shell-lex` for parsing a command, `hook-log`),
`quiet-test.mjs` (it already keeps a test run's output in a file), the selftest library, the change-to-tests map, `release`.

**Models.** Token compressors that wrap commands (the pattern of a hook rewriting a command to a wrapper): take the wrapper and the
saved full output. Not taken: shaping by default, shaping a failure, shaping anything Claude edits from (`git diff`, a file read),
an output without a footer, a summary written by a model.

<constraints>
Always do:
- Work the steps in order; the study (W1, W2) decides what W3 and W4 build. A profile the study does not justify is not written.
- Leave output whole unless a proved profile matches, the exit code is 0, no let-through word is in it, Claude did not ask for
  `raw`, and shaping is on. Every shaped output ends with its footer; every whole output that a profile matched says why it was
  let through.
- Keep the shared let-through list in one table (`packs/base/hooks/lib/let-through.mts`), read by every profile; a profile may add
  words, never remove one.
- Prove each profile on re-runs of the same real tasks: the same tests pass, the same files change, 0 extra turns, fewer tokens;
  a profile that costs one turn (a `raw` re-run on a task that passed) is loosened or dropped, recorded.
- Give every new test a planted fault that turns it red, and show it red.
- Prove each step's Done when by running it, with the evidence in `build/evidence/W0/` to `build/evidence/W7/` (ignored by git).
- Record each decision in `docs/workorders/output-shaping/decisions.md` as it is made; one line per finished item in
  `docs/workorders/output-shaping/progress.md`.
- Stage by name, commit with `-- ` and the paths, push every commit; never rebase, amend or force.
- Run the kit's command as `node bin/claude-packs.mjs` after `npm run build`, never `npx`.

Never do:
- Commit a transcript, a tool output, or a study row that holds a person's name, a path under a home folder, a token or a secret;
  the study's raw rows stay in `build/`, the committed report holds counts only.
- Shape a non-zero exit, `git diff`, `git show`, a file read, a compiler error, a test failure, or any output with a let-through word.
- Ship a profile on by default that the study did not justify and W5 did not prove.
- Write into bandwarp or any other project.
- Publish, except at W7 with the user's yes written into the PROMPT.
</constraints>

---

## W0. Set up

The kit installs itself from its own packs (`update --dir .`); this block names what it runs.

```claude-packs
configuration: base
packs: base
```

1. The branch `work/2.1.0-output-shaping` from `work/2.0.0-typescript` (done); when 2.0.0 is on `main`, merge `origin/main` into
   it before W3.
2. `npm ci && npm run build`; `node bin/claude-packs.mjs update --dir .`; `doctor --strict`.
3. The folders this order adds (`build/study/` ignored, `packs/base/tools/shape/` for the profiles) in `.claude/layout.json`.

**Done when:** `doctor --strict` exits 0 in the kit; the branch is pushed; `.claude/layout.json` names the new folders.

## W1. The study: what Claude reads

1. `scripts/read-study.mts` reads transcripts (main sessions and subagents) and writes one row per tool result into
   `build/study/rows.jsonl`: the task (by agent id or session), the tool, the command or file, its source class (build log, test
   output, git, package manager, file read, search, hook text, rule or skill text injected, tool noise such as the cwd-reset line,
   other), its size in characters and in tokens (the transcript's usage where it has it, else characters over 4 stated as an
   estimate), and its exit code.
2. Six real tasks at least: two UI and two DSP tasks from bandwarp's agent runs, one kit task from the typescript run, one
   whole session; the tasks listed by id in the evidence with their kind.
3. The tokens of each task split into: model text, tool output by class, injected text (hooks, rules, skills), and context re-sent
   (cached and not), from the usage fields.

**Done when:** `build/evidence/W1/sources.md` holds, for each of the six tasks, its total tokens and the share of each class to one
decimal, and the top 10 commands by tokens across them; `read-study`'s test is green on a planted transcript (its class totals
equal a hand count, a planted secret is masked in the rows), seen red first.

## W2. The study: what was used

1. For each tool result of W1, whether a later turn used it: a quote or a number from it in the model's text, a file or line it
   named then read or edited, an error in it then fixed, a command it showed then run. A result never used by any later turn of
   its task is "unused". Mark by script first, then read by hand a sample of 50 unused results and 50 used ones, the hand verdict
   recorded beside the script's.
2. For each source class and each top command: used, could be shorter with nothing used lost (the used parts are a small, stable
   part, such as a summary line), or noise; the tokens each would save.
3. How often a let-through word (W3's list) appears in output whose command passed, per class.

**Done when:** `build/evidence/W2/used.md` holds the per-class table (tokens, share unused, the candidate profile and its saving),
the script's agreement with the hand sample (a percentage, and each disagreement listed), and the let-through word rate; the
committed `docs/workorders/output-shaping/study.md` holds the same numbers with no row text; the decision of which profiles to
build written in `decisions.md`, each with its expected saving.

## W2b. The study: the turns each task spends (the user, 2026-11-12: "turns optimizations. we should look at how many turns we spend on each task and if possible can those turns be reduced somehow")

1. For each W1 task, every turn (each assistant message with a tool call) classified by what it did and why, by script and then
   by hand on a sample: real work (a write, a build, a test the change needs); and the kinds that may be cut: a retry after a
   refusal (and which hook, and whether its message named the right form); a re-run of a test or build with nothing changed in
   between; a re-read of a file already read with no write in between; a search for a file, a path or a name the brief or the
   layout could have given; a command that failed on its form (a wrong path, a wrong flag, the shell's dialect) then corrected;
   a check of a job's state (polling by turns); a `raw` re-run (from W5 on); a turn spent reading a long output for one line.
2. For each cut kind: its count and share per task, the tokens those turns cost (from usage), and the fix at its source, never a
   rule that only says "do fewer turns": a refusal whose message carries the exact command to run instead; a brief template that
   names the files, paths and commands the task needs; one tool call that does what several did (a batch read, a status in one
   line); a hook that catches the failed form before it runs (the kit's shell-traps pattern); an output that answers the next
   question (a test run that names the failing test's file and line).
3. Each fix judged by its saving: the turns it removes times how often, on the six tasks.

**Done when:** `build/evidence/W2b/turns.md` holds, per task, its total turns and each kind's count and share, the hand sample's
agreement with the script (a percentage), and the cut kinds ranked by turns and tokens; the committed `study.md` carries the same
counts; `decisions.md` names which turn fixes W4b builds, each with its expected saving in turns per task.

## W3. The shaper and its switches

1. `packs/base/hooks/output-shape.mts`: a `PreToolUse` hook on Bash that, when shaping is on and the command (parsed with
   `shell-lex`) is a single command matching a proved profile and does not start with `raw`, rewrites it to
   `.claude/tools/shape PROFILE -- COMMAND` through `updatedInput`; a pipe, a redirect, a compound command or an unknown command is
   left alone.
2. `.claude/tools/shape` (`packs/base/tools/shape.mts`): runs the command unchanged in the same folder and environment, saves the
   whole output (stdout and stderr in order) to `build/out/NNNN.log` (rotated, last 200), and prints: the whole output when the
   exit code is not 0, when any let-through word is in it (with `[not shaped: "WORD" at line N]`), or when the profile does not
   apply; otherwise the profile's shorter text and the footer `[shaped: PROFILE, A -> B lines; full output: PATH; run with "raw"
   to see it all]`; it exits with the command's own code.
3. The switches: `raw COMMAND` runs unshaped; `shape off` and `shape on` (a tool) set the session's state, read by the hook; the
   saved file is the third way. The skill `read-the-whole-output` tells Claude when to use them: before diagnosing anything
   surprising, when a summary does not add up, when unsure; and the rule `shaped-output-says-so`.
4. `let-through.mts`: the shared list, whole words and any case: error, errors, fail, failed, failure, fatal, warning, warn,
   exception, traceback, panic, abort, assert, denied, refused, conflict, segfault, killed, timeout, "not found", deprecated,
   undefined, cannot, unable; and the words W2 found that matter.
5. Off by default in 2.1.0 for every project; `enable output-shaping` turns it on with its proved profiles.

**Done when:** `test/hooks/base/output-shape.test.mts` and `test/tools/base/shape.test.mts` are green with 0 failures, and
each of these is a case in them seen red on its plant: a planted output with each let-through word comes through whole
(one case per word); a non-zero exit comes through whole; `raw` and `shape off` leave the command unrewritten; a pipe, a redirect
and a compound command are left alone; the exit code is the command's own in every case; the footer is on every shaped output;
the saved file equals the command's whole output byte for byte; a profile that tries to remove a shared word is refused by the
table's test; `updatedInput` measured honoured in an interactive session, a `claude -p` run and a subagent (each with its raw
evidence), or the gap written as a KWB and the shaper off where it is not.

## W4. The profiles

1. One profile per source the study justified (W2's decision), each in `packs/base/tools/shape/NAME.mts` with its own test:
   expected candidates, only if the study shows them: a passing test run to its summary and every skip; a passing build without
   its per-file lines; a package install to its warnings and totals; `git status` on a large tree grouped by folder; `git log`
   left as asked; the cwd-reset and other tool noise dropped.
2. Each profile keeps every part W2 found used, and states what it drops in its own header.

**Done when:** each profile's test feeds it the recorded outputs of W1 (from `build/study/`, masked) and checks that every part a
later turn used is still in its output (0 missing), and its saving on them in tokens; each profile seen red on a planted output
with a used part it would drop.

## W4b. The turn fixes

1. Each fix W2b's decision names, at its source: refusal messages that carry the exact command or form to use (every hook's
   message read against its refusals in `logs`); the agent brief template naming files, paths, commands and the gate; batch tools
   where several calls did one job; hooks that refuse a known failed form before it runs; outputs that name the next thing to do.
2. Each with its test, seen red first, and the count of turns it is expected to remove.

**Done when:** each fix's test is green and was seen red on its plant; every hook that refused in W1's tasks has a message that
names the form to use (a check over the hook table, red on a planted message without one); the brief template holds the fields
(a check).

## W5. Proof on real tasks

1. Re-run each W1 task, scripted or by the same brief, twice on 2.0 as it stands and twice with this order's shaping and turn
   fixes on, from the same commit: the same tests pass, the same files change, the turns (by W2b's kinds), the tokens (from
   usage), the `raw` re-runs and the wall time recorded.
2. A profile that caused a `raw` re-run on a task that passed, or any extra turn, or a different result, is loosened or dropped,
   and the run repeated.

**Done when:** `build/evidence/W5/proof.md` holds, per task, both runs' turns by kind, tokens, `raw` re-runs, tests and changed
files; 0 tasks with a different result; the turns and tokens saved per task and in total stated, with the cut kinds' counts
before and after; every profile and turn fix kept has saved tokens or turns on at least two tasks.

## W6. Before calling it finished

Read the finished work as a senior engineer would: a profile that drops more than it must, a let-through word missing, a
command form the hook mis-parses, the saved files' growth, the skill's wording read by a fresh session.

**Done when:** every finding is in `progress.md` with its fix or why it stays, 0 left blank; a fresh `claude -p` session given only
the skill uses `raw` on a planted surprising output (its transcript in the evidence).

## W7. The report and 2.1.0

1. `docs/workorders/output-shaping/report.md`: the study's numbers, the profiles and what each drops, the proof per task (turns,
   tokens, results), what is not proved, and the counts from `logs`.
2. `docs/whats-new-in-2.1.md` (public, its copy through `tim-writing`) and the README's section, its numbers from the report.
3. `npm run release minor` with the user's yes written into the PROMPT.

**Done when:** the report has every section with numbers or a stated reason; 2.1.0 on npm (`npm view` shows it) and `main` equal
to the local `main`; `docs/workorders/output-shaping/DONE` names the commit.
