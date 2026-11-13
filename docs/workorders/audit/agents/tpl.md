# tpl: work order templates (W7, items 13)

| id | new or extend | file | its one thing | proof |
|---|---|---|---|---|
| T1 | extend | rebuild.md W1 step 6 | grade the evidence, record the path | test/integration/workorder.test.mts, tpl-templates.log |
| T2 | extend | rebuild.md W8 | every unit answers sync / can be the clock in laws.md | same |
| T3 | extend | rebuild.md W13 Done when | panel table count equals the ROM test mode's count | same |
| T4 | extend | rebuild.md W15 step 3 | the machine's own program numbers | same |
| T5 | extend | generic.md W5 | list each deliverable before the report | same |
| T6 | extend | rebuild.md W8 | the machine's arp remade exactly, unless the user says otherwise | same |
| T7 | extend | rebuild.md "No firmware" | no-firmware branch | same |
| T8 | extend | rebuild.md W10 step 1 | plan the hardware session | same |
| T9 | extend | rebuild.md oracle and W5 step 3 | external simulator as black box only | same |
| T10 | extend | rebuild.md "Shared OS" | prove shared parts once | same |
| T11 | dropped | | SORTED.md section 2 | |
| C8 | extend | rebuild.md Sources and W2.4 | photo first | |
| processors | extend | rebuild.md install block and W0 | drives re-toolchain from identify-the-cpu | |

Faults: the rebuild template had 13 Done whens with no digit or test path (and generic 5); each now has a count and a test path. The `[if` marker list in test/integration/workorder.test.mts gained the two new markers. A fresh order still refuses on placeholders by design; 0 Done-when refusals remain on all three runs.
