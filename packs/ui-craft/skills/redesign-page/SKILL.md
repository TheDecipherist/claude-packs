---
name: redesign-page
description: Use when asked to redesign, restyle or review an existing page or screen.
---

# Redesign what exists without breaking it (one job: better, with the same things still working)

<constraints>
Always do:
1. Record the before: run the project, screenshot it at every width, and take its measurements (`prove-page`). Read the code: the framework, the styling method, the components, and what must survive: routes, forms, data, behaviour, the brand's own assets.
2. A review stops here: critique the screenshots (`page-critique`), list the findings with their measurements, and name the three changes that would move it most.
3. Keep the stack, the content and what works. No framework or styling migration; check the dependency file before adding anything.
4. Work in order of biggest effect for least risk: type, colour, the frame (margins, section rhythm, a title and headings), states (hover, focus, loading, empty, error), then the stock components.
5. Prove it: measure again, compare before and after at every width, click through every link, form and menu that worked before, and report both sets of measurements side by side.

Never do:
- Change behaviour during a restyle.
- Report a redesign without the before.
</constraints>
