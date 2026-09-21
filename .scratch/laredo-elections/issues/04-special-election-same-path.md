# 04: Special election through the same path

**What to build:** The December 5, 2026 District 8 special election appears as a second Election with its own Election page, District 8 Race page, and Candidate pages, produced by the same adapter reading the special election page and its candidates sub-page. The treasurer-only row renders as not yet posted. The Elections Topic page lists both Elections, upcoming first.

**Blocked by:** 02

**Status:** resolved

- [x] Fixtures recorded for the special election page and its candidates sub-page
- [x] Two Elections in the data file; the special has 1 Race, 3 named Candidates, and 1 unnamed row
- [x] Special notices in the Elections RSS with the city's dates
- [x] Candidate slugs do not collide across Elections

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

**2026-09-18, implementer:** Done in `test/elections-04-special-election.test.ts`. The special election needed
no new code path: one row in `ELECTION_PAGES` and a widened notice-date reader, and the Election, its Race, its
three Candidates, its unnamed row, its seven Filings, its notices, and its pages all came out of the code
issues 01 and 02 already wrote.

- `parseNoticeRows` and `parseCalendarRows` now share one `printedDates`, which reads either form the city
  writes a date in (`parseNumericDate` in `src/dates.ts` is new). The three `MM-DD-YY` notices parse.
- The city writes its two-day Thanksgiving holiday as both dates in one calendar cell. Read as one day the
  page told an early voter the wrong thing about the second, so `ElectionCalendarEntry` gained an optional
  `endDate` and the calendar renders a range (`elections.calendar.through`, both languages). The special page
  is the only page in the fixtures with such a row.
- The city's drawing notice is dated `10-07-26`, three weeks after `FIXTURE_NOW`, so the New panel and the
  Elections RSS leave it out until its own date, like every other future-dated Item. The Election page's
  notices are not windowed, so it is on the Election page from the day the city posts it.
- `elections-01` and `elections-02` now take their counts of the general Election's own records, because the
  Source reads both Elections in one run; the run-log lines in both files are of the whole run.
- Candidate ids are `${electionId}:${raceSlug}:${slug of the legal name}` and page paths carry the Election
  and the Race, so two Elections cannot collide. A test renames the special election's rows to two people
  already running for Mayor and asserts two Candidates, two ids, two pages.

**2026-09-18, implementer, after review:** Review at `.scratch/laredo-elections/reviews/04-special-election-same-path.md`.
Six findings and four nits; everything is fixed except one, deliberately.

- The reviewer's first finding was real and voter-facing: both Elections post a list titled "Early Voting
  Sites", so the New panel, the Topic page and the feed carried each title twice with nothing to tell them
  apart. An Item that carries an Election now names it in its meta line and its RSS description, in the city's
  own words; the Election's own page leaves the chip off so its notices do not repeat the page's own title.
- **Left open on purpose:** the city dates its drawing notice `10-07-26`, the day of the drawing, so under the
  site's printed-date-plus-90-day-window rule it is in no feed until 7 October. That rule is the site's, not
  this ticket's (the general page has the same shape), and the fix — counting an Item as new by its city date
  *or* its `firstSeen` — changes how every Source's Items enter every feed on the site. It wants its own issue
  and the owner's say-so. Box 3 is ticked on the reading that the two August notices are in the feed under the
  city's dates, the October one is on the Election page from the day the city posts it, and it joins the feed
  on its own date. Worth raising with the owner.
- Two smaller ones are now run-log lines rather than silence: a calendar row whose first cell has text the site
  can read no date in, and a row whose printed weekday is not the weekday its date falls on (the city opens its
  filing window "Monday, September 05, 2026", which is a Saturday).
