# Table shapes to search for

| Shape | How it shows | Proof |
|---|---|---|
| Known values | the printed maxima, consecutive, at stride 1, 2, 3, 4 and as 8/16-bit, big and little endian | the base-plus-stride load |
| Stated needle | one value from the manual | exactly one window in the image |
| Stepped curve | first differences constant in pieces | a law per piece, tested on held-out entries |
| Pointer array | words that all fall inside a string or data region, ascending | the strings read at each target |
| Back-pointer descriptor | a record that holds a pointer to its own parent or name | the chain closes |
| Erased-space run | `2^n` entries times a count, 0xFF or 0x00 around it | the size equals the arithmetic |
| Coarse low end | steps wide at the bottom, narrow at the top | by design: check the manual's resolution |
| Shape times multipliers | rows alike up to a scale factor | one row, a multiplier column |
| Monotone run of N | N entries rising, N the manual's stated count (121 cutoff points) | one hit in the image |
