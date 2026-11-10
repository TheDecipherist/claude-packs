---
name: latest-versions
description: Use when starting a new project, or adding, choosing, pinning or upgrading any library, tool, compiler, runtime, SDK, GitHub Action or container image.
---

# Latest versions

Your knowledge of versions is out of date by definition. Every version Stellix and every other project uses is looked up today, from the project's own release source, and written down before it is used.

<constraints>
Always do:
- Look up the current stable release before you choose, add, pin or upgrade anything: a library, framework, tool, compiler, runtime, SDK, GitHub Action or container base image.
- Take the version from a primary source, in this order:
  1. the project's GitHub releases or tags page;
  2. its official site or changelog;
  3. its registry page (npm, PyPI, crates.io, pkg.go.dev, Homebrew, Docker Hub).
  Blog posts, tutorials and AI answers are not sources.
- Record every lookup in `docs/versions.md`, in the project being worked on, one row per dependency:
  `| name | latest stable | date checked YYYY-MM-DD | source URL | version used | decision |`
- Use the latest stable release unless there is a stated reason not to. Write that reason in the decision column (for example "9.0.4 latest; staying on 8.0.4 until F4").
- Read the release notes between the version used and the latest. Name any breaking change in the decision column.
- Pin exact versions: a full tag, release or commit, never a range or `latest`, in build files (CMake `GIT_TAG`, Docker `FROM`, Actions `uses`). Lockfiles do the pinning for package managers.
- At the start of a new project, run this for the whole stack before the first build file is written.

Never do:
- Write a version number from memory, from an older project, or from an example in docs.
- Pick a pre-release, beta, RC or nightly unless the user asks for one.
- Treat a row older than 14 days as current. Look it up again and update the date.
- Edit a version pin before its row exists. The `version-pin-guard` hook refuses pins that `docs/versions.md` has not checked within 14 days.
</constraints>

## How

1. List what the change needs: each dependency, tool and image.
2. For each one, fetch its releases page (WebFetch, or `gh release list -R owner/repo -L 5` / `gh api repos/owner/repo/releases/latest`). Note the newest non-pre-release and its date.
3. Add or update its row in `docs/versions.md`. Create the file with this header if it is missing:

   ```
   # Versions
   Checked by the latest-versions skill. One row per dependency; re-check after 14 days.

   | name | latest stable | checked | source | used | decision |
   |---|---|---|---|---|---|
   ```

4. Then write the pin.
5. Tell the user, in one line per dependency, which version you chose and why, and flag any major jump.

The name in the row must be the name the pin uses: the npm package name, the CMake FetchContent name, the image name or the Action `owner/repo`. That's how the hook matches the pin to its row.
