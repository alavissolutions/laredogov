# 06: Figures copied and verified

**What to build:** Table cells and Candidate pages show the four cover-sheet totals from each finance report (contributions, expenditures, contributions maintained, outstanding loans) with the period, once the owner has listed the report's document id under `verified` in the hand-kept file; before that they show "awaiting review" with the link. The build downloads a report once through a fetcher download mode that navigates headless Chromium to the document and captures the bytes and filename, only for document ids absent from the previous data file. A report the extractor cannot read renders as a link with no Figure and does not fail the build. The run log ends with counts of Figures awaiting review and unreadable reports.

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] Two PDF fixtures: one readable July 2026 officeholder report, one unreadable stub
- [ ] Extracted totals match the readable fixture's cover sheet
- [ ] Awaiting review until verified, then all four totals with period, Filing link, and last-seen-live date, in both languages
- [ ] Unreadable report degrades to a link; build succeeds
- [ ] Second build downloads nothing
- [ ] Log counts present

## Comments

**2026-09-17, coordinator:** Probed all six 2026 candidates' July 15, 2026 officeholder reports (docs 23842, 23838, 23844, 23884, 23862, 23812). Every one is a scanned image PDF from a Toshiba copier (producer `SECnvtToPDF V1.0`, zero fonts, one image per page, 1.3 MB to 20 MB). None has a text layer, so the "readable July 2026 officeholder report" fixture this ticket asks for does not exist in the city's filings. Assumption taken so the ticket can proceed: build the extractor for text-layer PDFs as specified, treat every scanned report as the spec's "extractor cannot read" case (Filing, link, no Figure, logged), and test the readable path against a small synthetic text-layer PDF laid out like the TEC cover sheet (documented as synthetic in the fixtures README). Adding OCR is a decision for the owner; until then no current report will produce Figures.
