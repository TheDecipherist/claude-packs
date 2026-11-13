# Where a data sheet or a maker's manual is found, in order

Read by `gather-sources` (a processor's manuals) and `read-a-circuit-diagram` (a chip's page) at the moment they look for one. Try each in order and stop at the first that has the part; record which gave it, with its address, in `docs/sources.md`. An entry the user found reliable says so.

1. **The reference library:** `chip-search --part NUMBER` (Atlas, or its files). A page there is read, never fetched again.
2. **The archive:** the machine's folder, and the archive's `chips/` (the PDFs already fetched for other machines).
3. **The maker, or its successor:** Motorola and Freescale parts at nxp.com; Hitachi and Mitsubishi at renesas.com; Crystal Semiconductor at cirrus.com; National and Burr-Brown at ti.com; Signetics and Philips at nxp.com. A maker's own copy is the authority; a later revision of it is noted as such.
4. **alldatasheet:** the user's most successful archive (2026-11-13). Search: `https://www.alldatasheet.com/view.jsp?Searchword=PART`; a part's page then leads to its download page, `https://www.alldatasheet.com/datasheet-pdf/download/ID/MAKER/PART.html` (for example `.../download/115717/CIRRUS/CS4391A-KZ.html`), which holds the PDF link. Check the maker and the revision on the PDF's own first page: the site files a part under whatever a scan says.
5. **datasheetarchive.com and bitsavers.org** (bitsavers for older processors' programming manuals and handbooks), then **the Internet Archive** (archive.org search, and the Wayback Machine for a maker's page that has gone).
6. **A pin-compatible copy or a second source** (a modern clone's sheet often has curves the original lacked): a lead for the original, tagged as the copy's, never as the original's.

State, for each chip, what its function is and whether its sheet has an electrical table or a pin table only: know this before planning a fit. Check what a part is before trusting its name (a dbx 2252 is a detector, not a VCA), and carry a successor's number across only where the sheet says it matches. Where no part-specific manual exists, a family manual stands in, with the differences written (a uPD650 uses its family's uPD546 manual: the same instruction set, a different process). Record in the part's sources file the URL, the page count, what the document holds, the page where the part sits inside a catalogue, and `not obtainable: X, sites tried, date`.

A source that answers with a login, a captcha or a refusal is recorded with what refused, and the next one is tried; a part none of them has is the `[gap]` `gather-sources` describes, with every place tried.
