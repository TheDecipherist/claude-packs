---
# concepts: ui-markup
paths:
  - "placeholder"
---

# A screen answers one question, and the biggest thing on it is the answer

For application screens: dashboards, admin, settings, inboxes. The `app-screen` skill is the method. The numbers are from taste-skill's study of 23 product screens.

<constraints>
Always do:
- Write the screen's one question in a line ("Which deploy broke?", "Who is waiting for a reply?"). It decides what is biggest, what comes first, and what is left out.
- Name the one finding in today's data ("the 23:28 deploy doubled the error rate") and put it where it is read first, next to the action it drives.
- List the blocks as answers to the next questions. A block with no question is deleted: this is how to escape KPI row, big chart, two small charts, table.
- Put the most frequent job one click away, where the answer shows. A screen with no control for its main job is a report, not a tool.
- Show the evidence beside the answer: one annotated line on the event that matters beats a second chart.
- Show everything the brief names on the first screen; cap long lists at 4-6 rows with "View all".
- Size each block to its question, not to the data the product hopes for. A new account's small numbers are drawn at their real size.

Never do:
- Let a secondary figure out-shout the answer: the largest number answers the title's sentence.
- Copy a well-known product's arrangement: take the structure from this product's own things.
</constraints>
