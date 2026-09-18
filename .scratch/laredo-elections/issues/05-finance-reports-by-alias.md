# 05: Finance reports attached by Alias

**What to build:** The Race table gains one column group per finance filing period the city has a heading for, in date order, showing "report filed" with a link or "not posted" when the city lists the name unlinked. Each Candidate page lists their finance report Filings labelled with period and the office the city filed them under, including reports filed as an officeholder. A report attaches only when the filer name equals, after trimming, the legal name, the name on ballot, or an Alias declared in the hand-kept file (ADR-0005); the hand-kept file is read and never written, and a missing file means no Aliases. Reports for a period that match no Candidate are listed under the Race table with the city's spelling and link, and named in the run log. Finance reports become Items in the Elections RSS dated by the filing-date heading; reports older than the earliest Election's first filing day are recorded without Items.

**Blocked by:** 03

**Status:** resolved

- [x] Fixture recorded for the campaign finance page
- [x] "Gilbert Gonzalez" with no Alias stays unmatched; with an Alias it attaches to Gilberto Gonzalez, and the same person can attach in two Elections
  - In the recorded fixture "Gilbert Gonzalez" is the District 1 candidate's name on ballot, so it attaches with no Alias, as ADR-0005 requires. The pair that needs an Alias is "Dr. Victor D. Treviño" against "Victor Daniel Trevino"; both paths and the two-Elections case are tested. See the review record.
- [x] Officeholder reports attach and show the office the city filed them under; no incumbent label anywhere
- [x] Unmatched reports render under the Race table and in the log
- [x] Finance report Items in the RSS with heading dates; pre-window reports produce no Items
  - "Pre-window" is read as before the first day on the earliest Election's own calendar (2025-11-03), not its first ballot-filing day (2026-07-18), which falls after the only 2026 reports the city has posted. Documented in `src/elections/coverage.ts`.
- [x] Directory entry for the finance Source in both languages
