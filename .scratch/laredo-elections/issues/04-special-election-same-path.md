# 04: Special election through the same path

**What to build:** The December 5, 2026 District 8 special election appears as a second Election with its own Election page, District 8 Race page, and Candidate pages, produced by the same adapter reading the special election page and its candidates sub-page. The treasurer-only row renders as not yet posted. The Elections Topic page lists both Elections, upcoming first.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Fixtures recorded for the special election page and its candidates sub-page
- [ ] Two Elections in the data file; the special has 1 Race, 3 named Candidates, and 1 unnamed row
- [ ] Special notices in the Elections RSS with the city's dates
- [ ] Candidate slugs do not collide across Elections

## Comments

**2026-09-17, issue 01 implementer:** Two things found while building the shared adapter, so this ticket
does not have to rediscover them.

- The special election page writes some of its notice dates as `MM-DD-YY` (10-07-26, 08-28-26, 08-24-26)
  where the general page writes them out ("August 19, 2026"). `parseNoticeRows` reads only the written-out
  form today, so those three notices parse to nothing until this ticket widens it.
- `ELECTION_PAGES` in `src/sources/city-elections.ts` is the table to extend: add
  `{ slug: '2026-special', date: '2026-12-05', url: SPECIAL_ELECTION_URL, candidatesUrl: SPECIAL_CANDIDATES_URL }`.
  Both URLs are already exported and both fixtures are already mapped in `test/fixtures/fetcher.ts`.
  The special page's accordions include "Candidate Instruction Guides", already in `SKIPPED_ACCORDIONS`.
