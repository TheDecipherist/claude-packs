---
name: pdf-to-md
description: Use when a PDF has to be read or searched, when converting a PDF to Markdown, or when a manual, datasheet, schematic or spec arrives as a PDF.
---

# Convert a PDF to Markdown with docling, its images with it (one job: nothing in the PDF is left unread)

Use docling, not `pdftotext` or a hand-written extractor. It keeps tables as tables. A manual's graphs, drawings and schematics are pictures, though, and a Markdown file that only marks where they were has lost them. A service manual made of scanned sheets converts to almost nothing at all.

<constraints>
Always do:
1. Check it is there: `docling --version`. If not, `pipx install docling` or `uv tool install docling`, and say the PDF is unread until that is done.
2. Check the file is a PDF: `file manual.pdf`. A download can be an HTML error page with a `.pdf` name.
3. Convert with every image saved as its own file, beside the Markdown, in a folder of its own:
   `docling manual.pdf --to md --image-export-mode referenced --output out/`
   The Markdown then links each figure, so a reader finds the picture where the text refers to it.
   **At most two conversions at once on one machine, at low priority.** Each docling run takes a whole core and 2 to 3 GB of memory; seven at once (three agents fetching data sheets) loaded an 8-core machine to 16 and left no free memory. Every conversion, by the lead or an agent, waits for a free slot the same way, so the cap holds across agents:
   `until [ "$(pgrep -fc '[/]docling ')" -lt 2 ]; do sleep 15; done; nice -n 15 docling manual.pdf --to md --image-export-mode referenced --output out/`
   A lead that hands out many PDFs gives each agent its list, never more conversions than the cap at a time.
4. Render every page to an image as well, numbered by page, with an index of each page's first words, into `out/pages/`. docling's own Python has `pypdfium2`: `page.render(scale=dpi / 72)`, 150 dpi for text, 300 for a drawing or a schematic. A page with no text layer is still read this way.
5. Judge the result. Count the pages, the images and the characters of text. Pages with almost no text are a scan or a drawing: read those from their images, and say so.
6. For a scan, run docling again with `--force-ocr`, and treat the text as a lead only: OCR drops symbols, values and part numbers.
7. Read whatever matters from the page image: a table, a graph, a schematic, a part's value. Cite the printed page or sheet number.
8. Keep the Markdown and the images out of git unless the project wants them: a vendor's manual is not yours to publish.

Never do:
- Use `--image-export-mode placeholder`: it drops every figure, and a reader never learns they were there.
- Call a PDF read when its images were not. Count `<!-- image -->` in the Markdown: each one is a picture still unread.
- Read a large PDF's Markdown whole. Grep its headings, then read the section and its pictures.
- Treat an empty search as absence: the answer may be in a picture.
</constraints>
