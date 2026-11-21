# 02: Race pages with the comparison table

**What to build:** From the Election page a resident opens a Race (Mayor, District 1, 2, 3, 6, Municipal Court Judge Position 1) and sees a table of Candidates in the city's ballot order with name on ballot, treasurer, and the ballot application link. The adapter follows the Candidates Information link and reads one table per Race; Filing kinds come from the table column and anchor title, never from filenames. The non-binding pediatric hospital question renders as a question Race with the city's ordinance linked. A row the city has not named renders as "candidate name not yet posted" with its treasurer link and creates no Candidate. Applications and treasurer appointments are Filings but not Items.

**Blocked by:** 01

**Status:** resolved

- [x] Fixture recorded for the general candidates sub-page
- [x] First build yields 6 office Races with 16 named Candidates and 1 question Race
- [x] Race pages render in both languages with the table in ballot order and the table scrolling within its container on a phone
- [x] Question Race page shows the question title and ordinance link
- [x] No Item is created for applications or treasurer appointments
- [x] Document identity drops the trailing ticks and treats both city document URL forms as one id

## Comments

**2026-09-18, implementer:** Built onto `src/sources/city-elections.ts` and `src/render/elections.ts`; the
Race, Candidate, Filing, and UnnamedRow records and their data-file arrays are new, and `mergeRecords` in
`src/ingest.ts` now serves all three. Tests are `test/elections-02-race-pages.test.ts`, every one of them
the whole build against the recorded fixtures. The judgement calls the ticket left open:

- **Which accordion is which Race.** Slugs are declared in `RACE_SLUGS` from the city's own accordion
  headings, so a Race keeps its URL when the city re-words a heading. A heading the city adds that is not
  declared is still recorded, under a slug derived from the heading and a line in the run log, because
  dropping a Race the city published would be worse than an undeclared URL. `District 8` is pre-declared
  for issue 04.
- **Where the question comes from.** The city publishes no table for its non-binding question: it links
  resolution 2026R221 from an "Election Ordinance" button whose sub-label is
  "Non-Binding Election-Pediatric Hospital Services". The question Race is declared per Election page by
  that sub-label, and takes its title from it, so the site prints the city's words and invents nothing. If
  the city drops the link, the question is not shown and the run log says so.
- **Filing kinds.** The column the city put a link in decides the kind, and the city's own anchor title has
  to agree with it; a link titled as something else is left out and counted in the log. Filenames are never
  read (the judge race's treasurer filenames say "MCJ P2" while the page says Position 1).
- **Write-in rows.** The city ends each table with an empty write-in block whose columns differ ("Contact
  Info." in place of a name on ballot). Rows after that header are counted in the run log, not shown; when
  the city fills one in, that count is the signal to wire it up.
- **The comparison table's finance columns** are issue 05; the table today is name on ballot, treasurer,
  and ballot application.

Reviewed by a dispatched Orca reviewer; findings and their fixes are in
`.scratch/laredo-elections/reviews/02-race-pages-comparison-table.md`.
