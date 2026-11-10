---
# concepts: ui-markup
paths:
  - "placeholder"
---

# The URL holds the state, and a destructive action can be taken back

<constraints>
Always do:
- Keep filters, tabs, pagination and open panels in the URL, so a view can be shared, reloaded and reached with Back.
- Use real links for navigation, so Cmd-click and middle-click work.
- Give a destructive action a confirmation that names what dies, or an undo window.
- Send focus somewhere sensible on a route change, and keep a sticky header from covering what has focus.

Never do:
- Navigate from `onClick` on something that is not a link.
- Delete on one click with no way back.
</constraints>
