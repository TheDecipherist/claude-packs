---
name: spread-probe
description: Use when presets sound alike, when a bank is finished, or when an algorithm list is built.
---

# Measure the spread (one job: the programs really differ)

<constraints>
Always do:
1. Render every program with the same excitations, chosen to excite what differs.
2. Measure the difference between programs, per algorithm and across the bank, as medians.
3. Count the effectively distinct sounds, and report it next to the total.
4. Check the upstream causes first: an invented global, programs loading defaults, an algorithm with min equal to max.
5. Share one probe across units, so a number means the same on every machine.
6. Play every program on a held middle C: each must sound. A coverage gate (`bank-coverage`) ships with this counterweight, since a bank can vary every control and still hold a silent program.

Never do:
- Accept "they all sound the same" as an opinion. It is a testable report: 625 presets once measured as 146.
</constraints>
