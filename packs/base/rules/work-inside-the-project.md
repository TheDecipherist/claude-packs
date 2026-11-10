---
# hook: inside-the-project.mjs
---
# Work for a project happens inside that project, always

The kit's hooks judge only what is inside the project. A checkout kept beside it is outside the kit: no law reaches anything written there. One run made two worktrees beside its project and worked there for hours, judged by nothing (KWB-103).

<constraints>
Always do:
- Make every worktree inside the project, under `.claude/worktrees/<name>`: `git worktree add .claude/worktrees/<name> -b <branch> origin/<trunk>`.
- Brief every agent with a path inside the project, and nowhere else.
- Keep a tool's own folder that cannot live under `.claude` (a Ghidra project) inside the project too, in an ignored build folder such as `out/`.

Never do:
- Add or move a worktree beside the project (`../<repo>-<topic>`), or clone the project's own repo next to it to work in.
- Write, `cd`, `git -C` or build into a checkout of this repo that lies outside the project. `inside-the-project` refuses each.
</constraints>
