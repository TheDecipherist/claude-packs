---
# hook: chart-first.mjs
---
# The chart of every module and route is committed before the code

A synth is a set of modules and the routes between them. Drawn first, the chart is the one place a route is decided: the engine and the panel are both built from it, and a review reads one picture. Drawn after, it records whatever the code happened to do.

<constraints>
Always do:
- Commit a Mermaid chart (`docs/**/*.mmd`, or where `layout.json` `"chart"` says) of every module and every route before any UI or engine code.
- Change the chart first when a change touches a route: the chart's commit comes before the code's.
- Keep the chart whole: every module the code has, every route between them, and the controls that steer each route.

Never do:
- Write source before the chart is committed; `chart-first` refuses the write, naming the glob it looked for.
- Commit an empty chart, or one left out of git, to get past it: the hook reads only a committed file that is not empty.
</constraints>
