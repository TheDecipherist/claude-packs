---
name: can-the-user-open-it
description: Use when a visible change is about to be called done, when the user is to open or launch the plugin or app, or when a build did not seem to change what runs.
---

# Prove the binary the user will launch holds the change (one job: the launched file is the built one)

A step called done because the code compiled left the user opening an old copy, or a RelWithDebInfo folder that sorts before Release. The report of `can-open` is the evidence; the build's exit code is not.

<constraints>
Always do:
1. Run `node .claude/tools/can-open.mjs <build folder> <launched file or bundle>` with a `--source` folder for each place the change was made, a `--asset` for each file compiled in (image, font, data), and a `--marker` for a string the change added.
2. Read the report. It names the file that would be launched and when it was built. `stale` means the file is older than a changed source: rebuild through the queue and run it again.
3. Delete a configuration folder named as a leftover (Debug, MinSizeRel, RelWithDebInfo beside Release), then run the tool again. A host takes the first it finds.
4. An asset or marker "not inside the launched file" means the build did not link it: delete the generated binary-data folder, reconfigure and rebuild.
5. When the user's running copy was opened before the build time the tool prints, say so and ask for a relaunch. A copy that is still open runs the old bytes.
6. Report the verdict in the words it gives: exit 0 is "the launched file holds the change"; anything else is "written and committed; not in a binary the user can open yet".

Never do:
- Call a visible change done from a compile, a test of the library or a picture of the spec.
- Point the tool at a file other than the one the user launches.
</constraints>
