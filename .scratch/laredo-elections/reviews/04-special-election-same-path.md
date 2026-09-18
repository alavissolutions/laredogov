# Review: 04 — Special election through the same path

Reviewed 2026-09-18 by a dispatched Orca reviewer (`claude`, own terminal, same worktree), scoped to this
ticket's acceptance criteria. It opened on commit `24e2720` and finished against `91039f7`, and checked its
claims independently rather than reading the diff: `npm run typecheck` clean, `npm test` 55/55 green at both
commits, `npm run build:fixtures` clean, its own cheerio pass over `special-2026.html` and
`special-2026-candidates.html`, the rendered Election page, District 8 Race page, Elections Topic page and
feed read in both languages, both new date parsers run over every date cell on both election pages, and five
behaviours mutated one at a time to confirm the ticket 04 tests catch them.

It judged acceptance boxes 1, 2 and 4 met and verified, and box 3 (special notices in the Elections RSS with
the city's dates) met only in letter, for two reasons, one of which is fixed here.

Findings below in the reviewer's order of severity, each with what was done about it. Two of them were
already fixed in `91039f7` before the review landed; one is left open on purpose and says why. The fixes and
their tests are in the commit that carries this file.

## 1. The two Elections' voting-site lists were indistinguishable outside their own pages — FIXED

Raised: the New panel, the Elections Topic page and the Elections feed each carried "Early Voting Sites"
twice and "Election Day Sites" twice — docs 24402/24400 dated 2 September for the general election, 24387/24385
dated 1 September for the special — and nothing on any of them said which Election an entry belonged to. The
meta line read "City of Laredo · Sep 1, 2026 · Elections" and the RSS description "City of Laredo · Elections".
A District 8 voter following the feed could open the general election's early-voting list (19–30 October, for
3 November) for an election whose early voting runs 23 November to 1 December, or the reverse. Every Item
already carried `election: { id, kind }`; nothing rendered it. This ticket is the first with two Elections,
so the collision is new to it.

Fixed. An Item that carries an Election now names it, in the city's own words and never translated: a
`.election` chip in the meta line, linking to that Election's page, and the same title in the RSS
description. `itemList`/`itemLine` take an `omitElection` option, which the Election page passes so its own
notices do not each repeat the page's own title. Asserted in both languages and in the feed: the two "Early
Voting Sites" entries in the New panel now differ, carry the two Election titles, and link to the two
Election pages. Removing either the chip or the description field fails the test.

The RSS `<title>` is still the city's own title on both, unchanged: titles are the Publisher's words and the
site does not append to them (CONTEXT.md). The `<description>` is what disambiguates them in a reader.

## 2. The drawing notice reaches no feed until the day of the drawing — NOT FIXED, out of this ticket

Raised: the city dates "Notice of Drawing for Order on Special Election Ballot" `10-07-26`, the day of the
drawing, while its CMS stamp is 2026-09-17. The printed date wins (spec: Item rules), so the Item is dated
2026-10-07 and `recentItems` (`postedDate <= today`) keeps it out of the New panel and the feed until
7 October. A subscriber learns of a public drawing on the day it happens, against user story 14.

Not fixed, deliberately. The reviewer established that this is the site's own rule and not something this
ticket introduced — the general election page has the same shape, an August 19 printed date against an
August 10 stamp — and that the smallest real fix is "treat an Item as new when either its city date or its
`firstSeen` falls in the window", which changes how every Source's Items enter the New panel and every feed
on the site. That is a site-wide rule change and belongs in its own issue with the owner's say-so, not in a
ticket about wiring up one more Election.

What is true today is asserted rather than glossed: the two August notices are in the feed under the city's
own dates; the October one is on the Election page from the day the city posts it, because the Election
page's list of notices is the record and is not windowed; and it enters the feed on 7 October under the date
and the id it was first seen with. The acceptance box is ticked on that reading and the caveat is written
into the ticket's comment, so nobody has to rediscover it.

## 3. A calendar row with text but no readable date was dropped in silence — FIXED

Raised: `parseCalendarRows` skipped any row whose first cell held no date it could read, with no log. Today
that is only the city's spacer rows, but a misspelled month ("Octber 5, 2026") would take a filing deadline
off the calendar and nobody would know.

Fixed. A row whose first cell has text and whose description is non-empty, and in which the site can read no
date, is collected and named in the run log. A test builds against the recorded special election page with
`October` misspelled: the calendar loses that entry, and the log names the row. Spacer rows, whose first cell
is empty, are still not reported, and nothing in either recorded page triggers the line.

## 4. The city's printed weekday disagrees with its own date on one row — FIXED (logged)

Raised: the special election page opens its filing window "Monday, September 05, 2026"; 5 September 2026 is a
Saturday. The site rendered "Saturday, September 5, 2026" and told nobody, so a voter comparing with the
city's page sees a different weekday and the owner never learns the city has a typo.

Fixed as far as the site honestly can. Which of the two the city meant is the city's to say, so the date is
still what is rendered, and the run log now names the row and says the date is what is shown. Asserted, along
with the fact that this is the only such row on either page.

## 5. A forum button with no date was dropped in silence — FIXED in `91039f7`

Raised: the special candidates sub-page has a "District 8" button under "2026 POLITICAL FORUMS" with no date
and no href, and `parseForums` dropped it without a word, so the Election page's "The city has not scheduled
a forum for this election yet" was not quite what the city's page showed.

Already fixed before the review landed. `parseForums` returns `{ forums, undated }` and the adapter logs the
button by the text the city gave it. A forum with no date is not a schedule, so it is still not shown as one.

## 6. The calendar range split the date column — FIXED in `91039f7`

Raised: in `24e2720` the holiday row's two `<time>` elements were each a 16rem inline-block at 40rem and up,
so that one row's description sat out of line with every other row's.

Already fixed before the review landed: both ends sit in one `.when` span and the stylesheet lays the date
column out on that. Re-measured in headless Chromium over an HTTP server after the chip change above, at 320,
375 and 900 px, on the home page, the Elections Topic page and both special election pages in both languages:
no horizontal page overflow anywhere, the District 8 table scrolls inside its own container at phone widths
(544 px inside 288 px at 320, inside 343 px at 375), and at 900 px the range and its description are on one
row. The reviewer checked the range's accessibility separately: two valid `datetime` attributes, read aloud
as "Thursday, November 26, 2026 through Friday, November 27, 2026".

## Nits

- **The `Mendoza,` assertion was toothless — FIXED.** `expect(race('main').text()).not.toContain('Mendoza,')`
  passed for the wrong reason: the treasurer's name appears legitimately without a comma. It now asserts that
  the only leaf element on the Race page containing "Isabella Mendoza" sits in the `td.treasurer` cell, which
  is the actual rule: the site never borrows a treasurer's name for the candidate the city has not named.
- **A cell repeating one date twice was untested — FIXED.** `endDate` is set only when the last date the city
  printed is later than the first. A test now builds against the recorded page with the holiday's second date
  replaced by its first: one day, no `endDate`, one `<time>` on the page.
- **`seen` is shared across Elections — DOCUMENTED, not changed.** A document the city linked from both
  Election pages becomes an Item for the first Election only. That is forced by the id scheme, not a bug: an
  Item's id is the city's document id, so one document is one Item and can belong to one Election. The set now
  says so in a comment. Only docs 13768 and 13770 are linked from both pages today and both are ordinary
  links, so nothing is affected.
- **The Directory entry still points at the general election page — NOT CHANGED.** `directory.url` is one URL
  and the city keeps no index of its election pages, so it has to be one of the two. The entry's description
  already says the Source is "the city's own page for each election it runs", and the Elections Topic page is
  where a reader meets both. Changing it to the special election page would be trading one arbitrary choice
  for another.
- **Spanish "hasta" versus "al" in the calendar range — NOT CHANGED.** The reviewer marked this optional.
  "hasta" ("jueves, 26 de noviembre de 2026 hasta viernes, 27 de noviembre de 2026") is correct and
  unambiguous; "al" reads better only with a "del" in front of the first date, which the markup does not have,
  since each end is its own `<time>`.

## What the reviewer said about the edits to elections-01 and elections-02

No assertion lost its teeth. `elections-01` now finds the general Election by slug instead of taking `[0]`,
filters Items by `election.id` while still asserting topic and source, asserts all four requests in the order
the Elections are declared (stronger than before), and asserts the two-Election totals in the run log.
`elections-02` filters Races, Candidates and Filings by `electionId` only where the count was of the whole
file, and keeps its whole-file assertions — Filing id uniqueness, "Casso" absent, no Item sharing a Filing's
URL — whole-file. The special half of each total is asserted in `elections-04`.

## On the date parsers, from the reviewer's own run over both pages

`parseNumericDate` is anchored to the whole cell, reads `MM-DD-YY` (the same form the city writes its forum
buttons in), takes a two-digit year as this century, refuses impossible dates, and accepts a four-digit year
and `/`. Over the fixtures it parses the three special-page notice cells to the dates the city printed and
changes nothing on the general page: all 17 of its date cells parse as before, and the five non-date cells in
the candidate-forms table still yield nothing. `parseMonthNameDates` finds exactly one range in the fixtures,
the Thanksgiving row, and no spurious second date anywhere else.
