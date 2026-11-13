# Reading a PDF: the details

- **Backup read:** `pdftotext -layout` is clean on a table docling shifted, but fuses a two-column list; split the page at the gutter (crop each column, or `pdftotext -x -y -W -H`) and read each half. Diff the backup read against the Markdown on the broken rows and say which one the values match on the rendered page.
- **Scanned PDF:** make a contact sheet (all pages as small thumbnails in one image) to see which pages hold what, then read quadrants of the pages needed at 150 dpi.
- **Thin conversion:** a conversion with under 120 bytes of text per page is a scan or a failure: queue it again with `--force-ocr`, through the same slot helper.
- **Language:** OCR a Japanese manual with the language asked alone (`--ocr-lang ja`); a mixed language list reads it as noise.
- **Printed page numbers:** cite the printed page, not the PDF's index. Measure the offset (printed number against index) on two pages and use it; where the offset does not hold for a page, leave the citation blank, never guess.
- **A chart in a scan:** before saying a table (a MIDI chart, a list of values) is absent from a manual, check the scan PDF's page images for it.
- **Page images:** keep the page images in `out/pages/` beside the Markdown, so any value can be re-read from its page.
