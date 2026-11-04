Review the copy of this project in the current folder, and write a report the owner can act on. `claude-packs scan` already ran every check over every file; its report is `claude-packs-scan.md` in this folder. The checks find patterns. Your job is the bugs they cannot see, and to say which of their hits are real.

<constraints>
Always do:
- Treat this as read-only. This folder is a throwaway copy; the owner's code is elsewhere. The only file you write is `claude-packs-review.md`.
- Read the code. Every finding names the file and the symbol.
- Split the review by concern, one reviewer each, so none of them skims:
  1. **Security:** who can reach what. Injection and XSS through query strings and stored text, open redirects, OAuth `redirect_uri`, what the CSP really stops, authorization on every route, secrets and prompts written to disk or logs.
  2. **Runaway work:** anything that sets off itself: a watcher that writes what it watches, retries with no limit, loops with no stop, polling, anything that costs money per call.
  3. **Work that disappears:** a failed send marked delivered, a box cleared before the send succeeded, a queue item lost on restart, errors swallowed, no shutdown handling.
  4. **Platform and operations:** what behaves differently on the other OS, signals that do nothing, a deploy that drops in-flight work.
- Verify the hits in `claude-packs-scan.md`. Sample each check, and count real and false for what you read. Give counts only for what you counted; say so when a count is partial.
- Mark every finding with how you know it: **measured** (you ran it), **read in the code** (you traced it, did not fire it), or **claim** (likely, not confirmed). Measure what you can run safely in this copy.
- Rank by what happens to the owner, worst first, and give each finding one plain sentence of consequence.
- List checks that misfired or missed something: they are bugs in claude-packs, not in this project.

Never do:
- Change, format or "fix" any code.
- Connect to a production database, a live API or any service with real credentials, or use any token you find. A finding that needs production to confirm says so, and the owner decides.
- Print a secret's value. Name the file and line.
- Call a hit a bug because a check fired, or call the project clean because the checks passed.
</constraints>

## Report format

Lead with the most urgent finding, in one sentence.

**What to install:** the configuration and packs, why, and what was left out and why. If the scan's recommendation is wrong for this project, say so.

**What the review found:** hits checked and how many were real, then the worst findings as a table:

| Bug | Problem | How I know |
|---|---|---|

Then the rest by concern, in plain sentences: what happens, not how the code is shaped.

**Decisions for you:** each rule that does not fit this project, with your recommendation and the count it affects.

**Next step:** the order to fix things in, the first one named. Nothing is fixed, merged or deployed by this review.
