# Where ui-craft came from

Everything in the pack is written for the kit, in its own words. Ideas and published numbers are credited here.

| Source | License | Read |
|---|---|---|
| [Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines) | MIT | the whole command file |
| [Anthropic frontend-design](https://github.com/anthropics/skills) | Apache 2.0 | the SKILL.md |
| [Impeccable](https://github.com/pbakaus/impeccable) | Apache 2.0 | the README and its 62-rule list |
| [taste-skill](https://github.com/Leonxlnx/taste-skill) | MIT | the SKILL.md; app-screens, critique, tells, the core of copy, colour, type, layout, imagery; the rules of motion and scenes; lint.mjs. The inspector's own code was not read or copied |
| [image-to-code](https://github.com/Leonxlnx/imagegen-skills) | MIT | the SKILL.md |

| Kit piece | From |
|---|---|
| rule `forms-never-fight` | Vercel forms; taste-skill: a control explains itself, a limit stays beside the field |
| rule `motion-is-rare` | Vercel animation; Anthropic: one orchestrated moment; Impeccable: bounce easing, marquee, pulsing dot, content hidden at rest |
| rule `survives-real-data` | Vercel content handling |
| rule `url-holds-the-state` | Vercel navigation and state |
| rule `touch-and-small-screens` | Vercel touch, safe areas, dark mode; WCAG 2.2 target size |
| rule `dates-and-numbers` | Vercel locale, hydration, typography |
| rule `interface-copy` | Vercel content and copy; taste-skill: first screen, headline length, full content, proof never invented |
| rule `type-space-colour` | taste-skill laws of the craft and its numbers; Impeccable: line length, heading rhythm, tiny text, gray on colour |
| rule `no-generated-look` | Anthropic's calibration list; Impeccable's slop rules; taste-skill's house rules and its study numbers |
| rule `page-proved-rendered`, skill `prove-page` | taste-skill: real browser at three widths, production build; Impeccable: rendered-page rules; axe-core in Playwright |
| skill `ui-code-review` | Vercel: file:line findings; Impeccable: P0 to P3 |
| skills `design-direction`, `design-review` (web) | Anthropic: review the plan against the brief; taste-skill: defend a taste finding, judge the production build |
| checks `ui-no-transition-all`, `ui-no-zoom-lock`, `ui-no-paste-block`, `ui-input-needs-autocomplete`, `ui-intl-for-dates` | Vercel's anti-patterns |
| checks `ui-no-gradient-text`, `ui-no-ai-palette`, `ui-no-side-tab`, `ui-no-bounce-easing`, `ui-no-marketing-buzzword` | Impeccable |
| rule `pointer-feedback` | the user; taste-skill's timings; the press and hover law of the gpu-painter rule |
| rules `screen-answers-one-question`, `data-tells-the-truth`, `apps-are-not-pages`; skills `app-screen`, `chart-choice` | taste-skill app-screens.md and its study of 23 product screens |
| rule `page-holds-its-frame` | taste-skill layout.md, its house rules and how pages fail |
| rule `pictures-do-a-job` | taste-skill imagery.md |
| motion timings, curves and first-frame laws in `motion-is-rare` | taste-skill motion.md |
| states in `survives-real-data` | taste-skill app-screens section 11 |
| skill `page-critique` | taste-skill critique.md: the passes, the caps, the fix order, three rounds |
| skill `redesign-page` | taste-skill's redesign route |
| skill `write-the-page` | taste-skill copy.md: the argument, the headline budget and shapes |
| skill `build-from-reference` | image-to-code: extraction, anti-drift, missing-detail order |
| micro-UI clutter and box-in-box in `no-generated-look` | image-to-code |
| "procedures, not products" and "removal is not enough" in `no-generated-look` | taste-skill tells.md |
| tool `page-measure` | taste-skill's list of what its inspector measures, written for the kit |
| checks `ui-no-custom-cursor`, `ui-no-animate-layout`, `ui-no-scroll-hijack`, `ui-no-placeholder-names`, `ui-no-assistant-palette`, `ui-no-emoji-as-ui`, `ui-no-stock-labels`, `ui-no-furniture-text`, `ui-no-lorem`, `ui-no-empty-image`, `ui-no-uppercase-table-header`, `ui-no-zebra-rows` | taste-skill's lint rules and house rules |
| checks `ui-no-eyebrow`, `ui-no-index-numbering` | Anthropic, Impeccable and taste-skill agree |

A check blocks only what is objective, or what the sources agree on. taste-skill says plainly that some of its bans are one person's taste, so they stay in a rule, for a brief or design system to overrule: no gradients at all, no shadows at rest, no thin rules.

Not taken from taste-skill: its dealt art directions and scene library (`draw.mjs`, `assets.mjs`, `charts.js`, `stage.js`): large, and a system of their own. Use the skill itself for that. From image-to-code: generating the image first, which needs an image tool.
