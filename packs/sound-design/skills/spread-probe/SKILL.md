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
6. Render twice first. Report in sections: coverage, reach, settings, spread, twins. Render notes at C2, C4 and C6, set floors, and give the probe a collapse self-test that must fail on a bank of one sound.
7. Use instrument-specific excitations (a long note, a sparse line, a held chord), and quote the shared metric's inert terms: the ones that cannot change on this bank.
8. Play every program on a held middle C: each must sound. A coverage gate (`bank-coverage`) ships with this counterweight, since a bank can vary every control and still hold a silent program.
9. Exempt a pair of factory presets that store identical values when the manual documents them as twins, naming the page; fail only an undocumented twin.

Never do:
- Accept "they all sound the same" as an opinion. It is a testable report: 625 presets once measured as 146.
</constraints>
