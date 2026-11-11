---
name: write-the-readme
description: Use when a product's UI is finished, when a work order reaches its README step, or when asked to write or redo a README.
---

# Write the README (one job: a front page a stranger understands, with the product itself on top)

The README is the first thing anyone sees of the project. It describes what exists, so it is written last, when the UI is finished, and its pictures are of the real thing.

<constraints>
Always do:
1. Open with the name and one or two plain lines: what it is, and who it is for. Then a screenshot of the product, at the top.
2. Take every screenshot from the product itself, through its real code path: the app rendering its own window (a component snapshot of the opened window, a headless render, the browser's own capture), at its opening size. A script the build runs makes them, saves them compressed in `docs/images/`, and makes them again whenever the look changes.
3. Show each screen worth seeing, and each theme or mode the product has, one caption line under each. A command-line tool shows a real run of its main command instead.
4. Then the sections, in this order: what it does (each feature in plain words, the way a user meets it: what a control or command does, not adjectives); install; first use (how to start it, and the first thing to try); build from source (the exact commands, as they are in the repo); requirements; what is not done or not supported yet; licence.
5. Describe only what exists and is proved. A feature still open goes under "not done yet", never into the description.
6. Give the last pass with the `humanize` skill: this is public text.
7. Check it before calling it done: every link and image resolves (0 broken), and every command in it runs as written.

Never do:
- Use a mock-up, a design render, an AI image or a picture edited by hand as a screenshot.
- Put the release history in it: that is the CHANGELOG.
- Name a brand, a machine or another product the project does not own.
- Leave a section empty to fill later: an unknown is said, under "not done yet".
</constraints>
