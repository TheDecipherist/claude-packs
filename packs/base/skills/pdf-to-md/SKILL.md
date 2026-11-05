---
name: pdf-to-md
description: Use when a PDF has to be read or searched, when converting a PDF to Markdown, or when a manual, datasheet or spec arrives as a PDF.
---

# Convert a PDF to Markdown with docling (one job: a PDF becomes text you can read, grep and cite)

Use docling, not `pdftotext`, a Python PDF library or a hand-written extractor. It keeps tables as tables, and a manual's tables are usually what you came for.

<constraints>
Always do:
1. Check it is there: `docling --version`. If not, `pipx install docling` or `uv tool install docling`, and say the PDF is unread until that is done.
2. Check the file is a PDF: `file manual.pdf`. A download can be an HTML error page with a `.pdf` name.
3. Convert with images left out, into a folder of its own:
   `docling manual.pdf --to md --no-ocr --image-export-mode placeholder --output out/`
   On an 87-page manual this took 37 seconds and gave 79 KB. The default embeds every image, and took three times as long for 2.2 MB.
4. Judge the result. Compare the text with the page count: pages with almost no text mean a scan.
5. For a scan, run it again with `--ocr`, or `--force-ocr` when the text layer is bad, and treat the result as a lead: OCR drops symbols and shuffles columns.
6. Read a table that matters from the page itself, and cite the printed page number. When the table is a picture, docling leaves an image placeholder there: render that page.
7. Keep the Markdown out of git unless the project wants it there: a vendor's manual is not yours to publish.

Never do:
- Read a large PDF's Markdown whole. Grep its headings, then read the section.
- Treat an empty search as absence before step 4: the text may not have converted.
</constraints>
