---
# concepts: cpp, js, notes, tooling
---

# A layout is proved by arithmetic that closes and was not used to fit it

A stride read from two records fits those two records. A stride whose widths sum, whose count lands on the next table and whose chain closes was not tuned to anything, and the guess cannot fake it.

<constraints>
Always do:
- Count a closure the layout was not tuned to as an independent proof: base + count x stride lands on the next table, field widths sum to the stride, a pointer chain `offset[N] + size*count = offset[N+1]` holds link for link, sections tile the image.
- Count a count the guess was tuned to as one source, never two.
- Make counts agree including the holes, and state the decode coverage and the shape of the undecoded remainder.
- Run every container checksum over every record, n of n, and inspect the odd and last records.
- Close every step table on its printed maximum.
- Call a layout done only when every record is written as a byte sum to its length, with the residual stated.
- Prefer a structure a wrong record size cannot produce (loops halving against roots an octave apart).

Never do:
- Call a layout proved because the arithmetic that chose it adds up.
</constraints>
