# 06: Figures copied and verified

**What to build:** Table cells and Candidate pages show the four cover-sheet totals from each finance report (contributions, expenditures, contributions maintained, outstanding loans) with the period, once the owner has listed the report's document id under `verified` in the hand-kept file; before that they show "awaiting review" with the link. The build downloads a report once through a fetcher download mode that navigates headless Chromium to the document and captures the bytes and filename, only for document ids absent from the previous data file. A report the extractor cannot read renders as a link with no Figure and does not fail the build. The run log ends with counts of Figures awaiting review and unreadable reports.

**Blocked by:** 05

**Status:** ready-for-agent

- [x] Two PDF fixtures: one readable July 2026 officeholder report, one unreadable stub
  - Neither is a capture, on the coordinator's assumption below: no readable report exists in the city's filings, and a real scan is a megabyte this project does not keep (ADR-0001). Both are written by `npm run make:pdf-fixtures` and documented as written in `test/fixtures/README.md`. The readable one is a text-layer FORM C/OH cover sheet with invented totals standing in for document 23838; the unreadable one is one image and no font, which every real report is. Every document URL but 23838's answers with the scan, so the recorded build reads one report and finds nothing in twenty.
- [x] Extracted totals match the readable fixture's cover sheet
  - Including the hazard the form itself sets: boxes 17 and 19 are the unitemized subtotals and their labels contain the labels of boxes 18 and 20 word for word, so the extractor matches the six labels against each other and takes each amount from between one label and the next. Sanity-checked by hand against two of the real scans: both report unreadable in milliseconds rather than crashing.
- [x] Awaiting review until verified, then all four totals with period, Filing link, and last-seen-live date, in both languages
- [x] Unreadable report degrades to a link; build succeeds
- [x] Second build downloads nothing
  - A document is opened once, the first run that sees its id, and only for the filing deadlines this site's Elections cover: the page carries 504 reports back to 2015 and the city's store takes roughly 25 seconds per navigation, so downloading all of them would be hours (spec: Cost). A report the extractor found nothing in is marked on its Filing so it is not opened again either; a download that failed outright is tried once more next run.
- [x] Log counts present

## Comments

**2026-09-17, coordinator:** Probed all six 2026 candidates' July 15, 2026 officeholder reports (docs 23842, 23838, 23844, 23884, 23862, 23812). Every one is a scanned image PDF from a Toshiba copier (producer `SECnvtToPDF V1.0`, zero fonts, one image per page, 1.3 MB to 20 MB). None has a text layer, so the "readable July 2026 officeholder report" fixture this ticket asks for does not exist in the city's filings. Assumption taken so the ticket can proceed: build the extractor for text-layer PDFs as specified, treat every scanned report as the spec's "extractor cannot read" case (Filing, link, no Figure, logged), and test the readable path against a small synthetic text-layer PDF laid out like the TEC cover sheet (documented as synthetic in the fixtures README). Adding OCR is a decision for the owner; until then no current report will produce Figures.
