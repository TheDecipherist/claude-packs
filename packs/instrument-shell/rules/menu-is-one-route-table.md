---
paths:
  - "**/*.cpp"
  - "**/*.cc"
  - "**/*.h"
  - "**/*.hpp"
  - "**/*.mm"
  - "**/*.py"
  - "**/*.ts"
  - "**/*.js"
  - "**/*.mjs"
---

# A menu is one route table: the code and the tests read it, and the diagram is drawn from it

A menu system (pages, pulldowns, windows, and the presses that move between them) is a graph. Written as branches in screen code it cannot be read whole, and a page nothing reaches, a window nothing closes or a button that silently does nothing goes unseen. Held as one table, each of those is a line a tool can find.

<constraints>
Always do:
- Hold every page and every route in one table, as data: page, input, condition, then the page it leads to or `back`. The screen code, the tests and the diagrams all read that table. A route that serves every instance of a container (each oscillator's page set) is one row, expanded from `design/shape.json` by the generator.
- Give every row its source: the manual's page, the firmware's address, the design document.
- Write the table out as JSON at build time (the form is at the top of `.claude/tools/lib/route-judge.mjs`) and gate it with `node .claude/tools/route-table.mjs check <table.json>`: one outcome for each page, input and condition; every page reached from the start; every page with a way back to the start; every input on every page routed, or declared inert with its reason; every pulldown and window closes back to the page beneath.
- Test at run time, through the menu's own model, what a table cannot show: close returns to the page beneath at every depth, and back after a jump returns where it came from.
- Draw the menu for a person with `node .claude/tools/route-table.mjs mermaid <table.json> <dir>`: one diagram per branch, made again whenever the table changes.
- On a rebuild of a machine, read the routes from the firmware's own page changes, with the manual as the second source.

Never do:
- Write navigation as branches in screen code (`if (page == edit && button == exit)`): the screen asks the table.
- Edit a drawn diagram by hand, or build code from a diagram: the table is the source, the picture is a view of it.
- Leave an input that does nothing unsaid: inert is a row with its reason.
</constraints>
