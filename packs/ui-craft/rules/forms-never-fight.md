---
# concepts: ui-markup
paths:
  - "placeholder"
---

# A form never fights the person filling it in

<constraints>
Always do:
- Give every input a meaningful `name`, the right `type` and `inputmode`, and `autocomplete`, so browsers and password managers can help. Turn off spellcheck on emails, codes and usernames.
- Make the label and the control one hit target: a click on the label reaches the control, with no dead zone between a checkbox and its text.
- Keep submit enabled until the request starts, then show progress in the button.
- Put each error beside its field, and move focus to the first one on submit.
- Show what a field accepts beside it, tied with `aria-describedby`. First remove the limit if you can: a date picker, a parser that takes any common format.
- Warn before leaving a form with unsaved changes.

Never do:
- Block paste (`ui-no-paste-block`).
- Disable submit to show the form is invalid: the person cannot find out why.
- Explain how to work a control in a sentence: redesign the control.
</constraints>
