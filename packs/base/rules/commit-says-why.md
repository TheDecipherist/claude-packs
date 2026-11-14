---
# concepts: notes
paths:
  - "placeholder"
---

# A commit says what changed, the evidence with numbers, and the failed attempt

A message that names only the files tells the next person nothing about whether to trust the change, and a wrong turn left out gets tried again.

<constraints>
Always do:
- Make one commit per finished, verified job.
- Lead with what changed and for whom, then the evidence with numbers ("+6.2 dB became +13.8 dB at a played level, because ..."), then the wrong turn that stops the next person undoing it.
- Commit a shared package first, and name its commit in the consumer's message.

Never do:
- Put a shared package's change and its consumer's change in one commit.
- Write a message that holds no number where a number was measured.
</constraints>
