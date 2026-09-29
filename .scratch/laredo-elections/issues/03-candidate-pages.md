# 03: Candidate pages

**What to build:** From a Race table a resident opens one Candidate and sees their legal name and name on ballot as the city printed them, their Race, their treasurer, every Filing under a plain label (treasurer appointment, ballot application) with its link and last-seen-live date, and the fixed neutrality sentence: everything shown is copied from City of Laredo filings and the site adds no opinion, incumbent label, or outside material. Both languages. Candidate pages are findable in search by either name.

**Blocked by:** 02

**Status:** resolved

- [x] One page per Candidate at the spec's URL; slugs derive from name on ballot, ASCII, hyphenated, numeric suffix on collision
- [x] Filing labels and the neutrality sentence live in the strings file in both languages; names and city titles are never translated
- [x] Search index returns the Candidate page for the legal name and the name on ballot
- [x] Spanish and English pages show identical names and links

## Comments

**2026-09-18, implementer:** Render-side only: the adapter from issue 02 already records Candidates with
their slugs, so this ticket added `PATHS.candidate`, `candidatePage` in `src/render/elections.ts`, the write
loop in `src/render/index.ts`, Candidate entries in the search index, and the strings. Tests are
`test/elections-03-candidate-pages.test.ts`, each the whole build against the recorded fixtures. The
judgement calls the ticket left open:

- **Which name heads the page.** The name on the ballot, because that is the name in the city's ballot-order
  column and the name the Race table shows; the legal name is the first row of the summary list. Both are
  printed as the city printed them, including its own capitals for the Election's title.
- **The city's own words stay beside the plain label.** Each Filing line is the site's label
  ("Campaign treasurer appointment"), then the city's own anchor title as a sub-label, then the date the
  site last saw the document on the city's page. A reader can match the line to the city's page without
  the site translating the city's wording.
- **Search.** The index gained `s` (the language-independent path of a page this site makes of its own
  records) and `a` (a second name the entry answers to, matched but not shown). A Candidate entry shows the
  name on ballot, matches on the legal name too, is dated by election day, and opens the page in the
  reader's own language. Checked in a browser: "Jose David Gonzalez", "JD Gonzalez", and "Treviño" in
  Spanish all return the right page (the search box already folds accents).
- **A self-appointed treasurer.** The city names the mayor as his own campaign treasurer, so linking the
  name in the Race table put two links with the same text in one row. The treasurer link now carries a
  visually hidden "Campaign treasurer appointment", which keeps issue 02's rule that every link in the
  table has its own accessible name; two assertions in `test/elections-02-race-pages.test.ts` moved to the
  link's first text node, and its bilingual check now compares the city's links (the site's own links
  differ by language tree).
- **Finance report Filings** have their label string already (`filing.finance-report`) but no Figures: those
  are issues 05 and 06.

Reviewed by a dispatched Orca reviewer; findings and their fixes are in
`.scratch/laredo-elections/reviews/03-candidate-pages.md`.
