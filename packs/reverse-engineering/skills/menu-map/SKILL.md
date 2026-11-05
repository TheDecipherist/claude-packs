---
name: menu-map
description: Use when mapping where each parameter is reached on the machine, when a control has no byte in the patch map, or before building effects or a panel from a decoded record.
---

# Map the menus (one job: every parameter joined to the page that reaches it, and every mismatch listed)

A patch map says what byte N means. A menu map says how you reach byte N from the panel, and it names what you can edit that is no byte in a patch at all. On one machine the chorus and delay TYPE selectors sat outside the patch block, and that blocked the effects work for a day.

<constraints>
Always do:
1. Write the tree from the manual's own section order, page by page, with the printed page number each page is cited from. This is the only part edited by hand: a script looks up everything else and regenerates the table.
2. Tag each name by its source: `[FW]` in the firmware's display pools (`names-first`), `[MAN]` printed. Page membership and page order are usually `[MAN]` alone, and the map says so.
3. Join the two with the manual's own display drawings: the page name on the top line, the parameter on the bottom. Find each half in the firmware's pools. That is the two-source check for the whole tree.
4. Give every parameter its home: patch, multi or performance, global, or stored nowhere.
5. Print both mismatch lists, because they are the point of the file:
   - on a page but not in the patch map: multi and global parameters, and anything with no published index;
   - in the patch map but no page reaches it: dead, reserved, or a page still to find.
6. Check whether every parameter that shapes the sound is in the dump. One that is not must be sent another way, and a rebuild that loads only the dump loses it.
7. Write down what changes the map. Menus are dynamic: a page hidden while its effect is off still exists. Pages re-label themselves: one byte can carry two names, by mode, so list both.
8. Keep corrections in the file, and end it with what is not established.

Never do:
- Conclude a parameter does not exist because its page did not appear on the hardware.
- Give one byte one name when a mode re-labels it.
- Edit the generated table by hand.
- Build effects or a panel before the first mismatch list is read.
</constraints>
