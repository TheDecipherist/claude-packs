# Where ui-craft came from

Everything in the pack is written for the kit, in its own words. Ideas and published numbers are credited here.

| Source | License | Read |
|---|---|---|
| [Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines) | MIT | the whole command file |
| [Anthropic frontend-design](https://github.com/anthropics/skills) | Apache 2.0 | the SKILL.md |
| [Impeccable](https://github.com/pbakaus/impeccable) | Apache 2.0 | the README and its 62-rule list |
| [taste-skill](https://github.com/Leonxlnx/taste-skill) | MIT | the SKILL.md; its reference files and scripts were not read |

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
| checks `ui-no-eyebrow`, `ui-no-index-numbering` | Anthropic, Impeccable and taste-skill agree |

A check blocks only what is objective, or what the sources agree on. taste-skill says plainly that some of its bans are one person's taste, so they stay in a rule, for a brief or design system to overrule: no gradients at all, no shadows at rest, no thin rules.
