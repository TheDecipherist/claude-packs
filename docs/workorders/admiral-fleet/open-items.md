# admiral-fleet: what is left, unproved, or for a person to judge (W7)

Read on 2026-11-08 after 1.4.0 was published and admiralmcp's install was proved in a scratch clone. Each item says why it is open, tagged `[deferred]` (someone decided; who and why) or `[gap]` (real, nobody has decided).

## For the user to judge

1. [deferred: chosen by this run (d-1), for the user to confirm] **d-1: `straight-on-and-aligned` stayed in audio-core.** The skill moved to base and names the rule only where a project has it. The reasoning is in decisions.md d-1: the rule is about drawing hardware from a photograph. If web pages built from photographs (not mock-ups) turn out to need it, moving it is one file plus a neutral rewrite.
2. [gap] **skill-first's design-reference row now applies in every project.** It applies wherever `analyse-reference-look` is installed, and base installs it from 1.4.0. An existing project that runs `update` and keeps pictures under a `reference/` or `mock-ups/` folder is refused a read of one until the skill is loaded. That is the order's purpose, but it is a new refusal reaching existing projects without an `"enable"`, which CLAUDE.md's switch-on law asks for of new laws. The CHANGELOG says so. If it should be opt-in for existing projects, the row needs the switch, as `update` gives a new hook.
3. [deferred: chosen by this run (KWB-97, d-6), for the user to confirm] **KWB-97 changed what `update` does with a configuration's template.** A project already of a configuration never gains a folder or concept the template adds later; only a first install or a project taking the configuration does. A template folder every existing project should get must now come through a pack or by hand. The behaviour that was replaced wrote a second web folder into a project that had one.

## Unproved

4. [gap] **The Go tenant patterns never caught a real fault.** On 1,130 non-test Go files (swarmk's daemon-go, HitKeep, go-saas/kit) both checks had 0 hits. The shapes are present in HitKeep (141 WHERE calls, 142 URL reads, 15 role comparisons, read one by one), but Go handlers read the URL into a variable and query in a store function, so a one-call pattern cannot see a missing tenant key there. They are proved on their samples (the lesson-checks selftest, the installed hook) and clean on real code, nothing more. A data-flow check (a URL value reaching a query with no tenant key) is the stronger form; no lesson check can do it.
5. [gap] **The Admiral agent has no database.** The fleet spec makes the Go agent stdlib only with no database credentials, so W2's checks guard Go code that talks to a database, which the agent does not. The tenant law reaches the agent as "the connection stamps `org`, never the message body": `ws-identity-from-message` (websocket) reads only `.ts`, `.js`, `.mjs` and `.cjs`. A Go form of that check is the gap the spec's agent would actually meet. Not in this order's items.
6. [gap] **Depth is measured by each project's own script.** The skill and both rules say what to measure (shadow, bevel, edge light) and the proof's script (build/evidence/W4/depth/look_depth.py) shows it works on a real headless render. The kit ships no depth-measuring tool, unlike `page-measure.mjs` for a page's layout facts, so each project writes its own.

## The consumer's, recorded in decisions.md d-9

7. [deferred: the project's, d-9] **admiralmcp's kit stand-in must leave before its install block can run.** `packages/kit-standin` answers to `@thedecipherist/claude-packs` and shadows the published package. `packages/core/src/lifecycle/guard.ts` imports `./brief-guard` from it; the kit ships brief-guard as a hook, not an importable module, so that import needs a home in the project.
8. [deferred: the project's, d-9] **The spec's layout should declare `gates`.** doctor --strict asks for an a11y and a hover gate for the UI code already in `packages/api/src/ui/`; the scratch layout declares both `"none: <reason>"` because those pages retire.
9. [deferred: the project's own layout, as the spec says] **Template folders the real project needs that the template has not:** `packages/core/src/gateway` (the spec's gateway lives in core, beside the template's `adapters` in the API), `packages/channel/src`, `packages/web/charts`, the Go agent's `packages/agent/{cmd,internal,tests}`, `containers` and `planner`. admiralmcp passes them in its own `--layout`, as the spec says; none is general enough for the full-stack template.

## Left as they are

10. [deferred: this run, the script is running] **This order's own `run.sh` was not regenerated** with KWB-98's fix, since it is the script running the sessions and bash reads a running script as it goes. Its logs folder has the same one-line `.gitignore` by hand. The next order generated gets the fix.
11. [deferred: this run, d-8] **W5's literal `npx --no-install ...@1.4.0` form refuses in an empty folder** by design (d-8); the published package was proved with the install-then-`--no-install` form the kit prescribes.
12. [deferred: this run, d-2] **package-lock.json** was committed in 1.4.0 with this npm's form (the `libc` fields dropped, d-2). Another npm may write them back; it changes nothing installed.
