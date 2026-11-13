---
name: map-the-io
description: Use when a firmware's writes to unknown addresses must be named, a chip select or port map is unclear, or a hardware register has no documentation.
---

# Map the I/O (one job: name each address from the CPU's register map and what the code writes there)

<constraints>
Always do:
1. With no address bus, the chip select is the map: list the values written to the select port.
2. Treat a don't-care write as a strobe; data can ride the address bus.
3. With no ADC register, look for comparators on port bits.
4. Treat equally spaced windows as possibly one banked chip; identify a chip by its write protocol.
5. Read both ends of a link: a diagnostic's addressing is not the runtime's.
6. Use a masked read to show undriven lines.

Never do:
- Settle a map from a literal-pool census alone.
</constraints>
