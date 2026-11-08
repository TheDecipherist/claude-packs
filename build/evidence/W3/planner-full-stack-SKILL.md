---
name: project-layout
description: Use when planning, briefing or placing work in a full-stack project: where a new file, folder or kind of thing goes, and which laws hold there.
---
# Project layout: full-stack

A web service: a Fastify API and a Next.js web app in one repo, Zod 4 schemas in one shared folder, one database gateway, one error contract.

## Folders

- `packages/core/src/`: shared code the API and the web app both import
- `packages/core/src/schemas/`: every Zod 4 schema: requests, responses, records, forms, the error contract
- `packages/api/src/`: the Fastify API: buildServer(), env.ts, the error handler, plugins
- `packages/api/src/routes/`: thin routes: method, path, schemas, one handler call
- `packages/api/src/handlers/`: the work of each route, through adapters
- `packages/api/src/adapters/`: the one database gateway and every other outside service
- `packages/api/src/auth/`: authentication and the request's identity (the chain keys come from here)
- `packages/api/test/`: API tests through inject()
- `packages/web/`: the Next.js web app
- `packages/web/app/`: the web app's routes: pages, layouts and their loading and error states (the App Router)
- `packages/web/components/`: the web app's components, built from the one set of UI primitives
- `docs/`: the spec, decisions, versions.md
- `tools/`: scripts that never ship

## What goes where

- a Zod schema (z.object) and the error contract → `packages/core/src/schemas/`
- the database driver and its one gateway → `packages/api/src/adapters/`
- API tests (inject(), never a bound port) → `packages/api/test/`

## What it installs

- packs: base, full-stack, http-api, fastify, zod, docker, writing, hook-proof; to choose: js-ts, go, stored-text, ui-craft, shell, shell-hooks, react, web, multi-tenant, websocket, ci, host-agent, dynamic-data, mongo, postgres, ai, nginx, content-site
- hooks: brief-guard.mjs, code-shape.mjs, dispatch-once.mjs, file-size-guard.mjs, folder-law.mjs, git-guard.mjs, lesson-checks.mjs, look-gate.mjs, making-check.mjs, making.mjs, once-only.mjs, placement-law.mjs, repo-litter.mjs, reuse-hint.mjs, run-hooks.mjs, schemas-only.mjs, secrets-guard.mjs, shape-law.mjs, skill-first.mjs, stack-guard.mjs, suite-once.mjs, template-law.mjs, untrusted-boundary.mjs
- skills: add-lesson-check, app-screen, argument-post, build-from-reference, change-an-api, chart-choice, docker-diagnose, fix-from-scan, hover-state, humanize, land-branch, launch-post, make-it-a-template, new-project, page-critique, pdf-to-md, pick-subreddit, pick-tests, post-voice, pressure-test-skill, prove-a-hook, prove-instances-identical, prove-page, reddit-post, reddit-title, redesign-page, render-stored-text, reply-moves, reply-stance, secure-a-route, should-i-reply, test-quietly, ui-code-review, write-a-workorder, write-the-page
- rules: 99 (`npx --no-install @thedecipherist/claude-packs configs` lists the configurations)

## House rules

<constraints>
Always do:
- Put every kind of thing in its one place (the folders above); a new folder goes into `.claude/layout.json` first.
- Ask the user before inventing a new folder. A new folder goes into `.claude/layout.json` first.
- When a hook, check or guard blocks work that is correct, stop and report its exact message. A blocking hook is a red check: fix the hook first, with a selftest, then continue.
- When a command is refused or fails, the step fails loudly. Never report a refused write or a failed command as done.
- claude-packs (`@thedecipherist/claude-packs`) is the source of truth for every rule, check, hook and skill this project's configuration installs. A fix to one of them is made in the kit, with its test, and comes here with `npx --no-install @thedecipherist/claude-packs update`. A project edits its installed copy only to try a fix before it goes into the kit.

Never do:
- Create source files outside these folders, or put a kind of thing anywhere but its place. The folder-law and placement-law hooks refuse both.
- Put a database call outside the adapters, a Zod schema outside the schemas folder, or business rules in a route.
- Edit files in `.claude/rules`, `.claude/checks` or `.claude/hooks` to get past a block. Fix the code, or ask the user to change the law.
- Route around a block: no override variables, no writing through the shell after a refusal, no parking files in a scratchpad, no putting new code into an unrelated existing file.
- Point at a document by line number. Cite a fixed anchor (`{#id}`) or a symbol name; lines move.
</constraints>
