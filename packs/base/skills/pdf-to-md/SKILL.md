---
name: pdf-to-md
description: Use when a PDF has to be read or searched, when converting a PDF to Markdown, or when a manual, datasheet, schematic or spec arrives as a PDF.
---

# Convert a PDF to Markdown with docling, its images with it (one job: nothing in the PDF is left unread)

Use docling, not `pdftotext` or a hand-written extractor, and no second read by default. It keeps tables as tables. A manual's graphs, drawings and schematics are pictures, though, and a Markdown file that only marks where they were has lost them. A service manual made of scanned sheets converts to almost nothing at all.

<constraints>
Always do:
1. Check it is there: `docling --version`. If not, `pipx install docling` or `uv tool install docling`, and say the PDF is unread until that is done.
2. Check the file is a PDF: `file manual.pdf`. A download can be an HTML error page with a `.pdf` name.
3. Convert into the reference library's place for the document, never into the project (the user, 2026-11-14: converted manuals, data sheets and circuits belong in the library, placed there when they are converted): an owner's or user manual into `~/projects/reference-library/manuals/<brand>/<model>/`, a service manual into `service-manuals/<brand>/<model>/`, a data sheet into `chips/<maker>/<part>/` (`node ~/projects/reference-library/tools/makers.mjs <part>` names the maker folder). Every image is saved as its own file, beside the Markdown:
   `docling manual.pdf --to md --image-export-mode referenced --output <the library place>`
   The Markdown then links each figure, so a reader finds the picture where the text refers to it.
   **Conversions run at low priority, and the load governor holds how many run at once.** Each docling run takes a whole core and 2 to 3 GB of memory; seven at once loaded an 8-core machine to 16. Run every conversion through the load governor's helper, which blocks inside its own call until a slot is free and frees it when the run ends (no polling loop; the same cap holds across agents):
   `node .claude/tools/governed.mjs --for install --want 1 -- docling manual.pdf --to md --image-export-mode referenced --output <the library place>`
   (see the `load` skill). A lead that hands out many PDFs gives each agent its list.
4. Render every page to an image as well, numbered by page, with an index of each page's first words, into `<the library place>/pages/`. docling's own Python has `pypdfium2`: `page.render(scale=dpi / 72)`, 150 dpi for text, 300 for a drawing or a schematic. A page with no text layer is still read this way.
5. Judge the result. Count the pages, the images and the characters of text. Pages with almost no text are a scan or a drawing: read those from their images, and say so.
6. For a scan, run docling again with `--force-ocr`, and treat the text as a lead only: OCR drops symbols, values and part numbers.
7. Read whatever matters from the page image: a table, a graph, a schematic, a part's value. Cite the printed page or sheet number.
8. When a converted Markdown is found broken at the time it is used (shifted cells, a fused two-column list, values that do not line up), make the backup read (`pdftotext -layout`, or the rendered page; split a two-column page at the gutter first) and tell the user: which file, what was broken, what the backup read gave. Details in `reading-a-pdf.md` (beside this file).
9. Bring it in at once, so the next lookup says "here it is" (the user, 2026-11-14): in the library, `node tools/build-index.mjs`, then `node tools/ingest.mjs` (only changed files are written; chip-search answers from Atlas first), then commit the new files there by name. Check it: `chip-search` for the part or machine now finds the page. The project cites the library's path and holds no copy; the PDF itself stays outside every repository (the archive).

Never do:
- Write a conversion into the project (`out/`, `docs/`, `scratch/`): it belongs in the library, where every machine finds it, and one left in a project is converted again by the next.
- Use `--image-export-mode placeholder`: it drops every figure, and a reader never learns they were there.
- Call a PDF read when its images were not. Count `<!-- image -->` in the Markdown: each one is a picture still unread.
- Read a large PDF's Markdown whole. Grep its headings, then read the section and its pictures.
- Run docling a second time on every table by default: the backup read is for a file found broken.
- Treat an empty search as absence: the answer may be in a picture.
</constraints>
