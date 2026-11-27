# Review: 01 — Election page from the city's general election page

Reviewed 2026-09-17 by a dispatched Orca reviewer (`claude`, own terminal, same worktree), scoped to this
ticket's acceptance criteria. It reviewed commit `928bba1` and verified its claims against the recorded
fixtures: `npm run typecheck` clean, `npm test` 34/34 green, `npm run build:fixtures` renders the page in
both languages. Every acceptance box was judged genuinely met.

Findings below in the reviewer's order of severity, each with what was done about it. Fixes landed in
`941f0d1` (found by the implementer before the review returned) and in the commit that carries this file.

## 1. The document `<ticks>` are not "the city's own date" — FIXED

Raised: dating the voting-site lists from the `<ticks>` in the city's document URLs was justified in the
code as the city's own date, but on the same page the ticks disagree with the dates the city prints
(doc 24125 ticks 2026-08-10 against a printed August 19, 2026; doc 21743 ticks 2025-11-01 against a
printed October 31, 2025). Separately, every tick read as UTC lands between 01:00 and 14:00 Central,
i.e. the values are the city's Central wall clock and the code was labelling them `Z` and then shifting
them another five or six hours.

Fixed. The timezone bug was real and is corrected: the ticks are now read as Central wall clock through
`fromCentral`. Checked across all 569 document links in the recorded election and finance fixtures, the
stamps fall between 07:00 and 19:00 read as Central and between 01:00 and 14:00 read as UTC, which
settles it. The claim was overstated and is gone: `cityDocumentPublishedAt` is now
`cityDocumentPostedAt`, documented as the CMS's posting stamp rather than a date the city prints, with
the rule that a printed date always wins where the city prints one.

The stamp itself was kept rather than swapped for `firstSeen`, which was the reviewer's other suggestion.
Dating a document by when this site happened to first see it is arbitrarily wrong (the early-voting list
would read Sep 16 instead of Sep 2, and a document posted years ago and seen today would be years off),
and the codebase already dates Items by a Publisher's own publish stamp where one exists
(`MeetingDocument.publishedAt` on Legistar stream lines). The one stamp that can be cross-checked agrees
with the city's own filename (`EV Sites 090226.pdf` against a 2026-09-02 stamp). Where the stamp cannot
be read the link stays on the Election page and becomes no Item. The Directory entry now says in both
languages where each kind of date comes from, as the bids Source already does for its own dates.

## 2. A city page change would fail the whole build, not just this Source — FIXED

Raised: if the city moved its heading, `parseElectionPage` returned an empty title, the adapter recorded
the Election anyway, and `validateData` then threw inside `saveData` — which runs outside `ingest`'s
per-Source failure path, so one changed page would take down every other Source's run. The candidates
sub-page being unreachable would likewise lose the whole Election over an ancillary forum schedule.

Fixed. The adapter throws on a missing heading, so `ingest` records it as this Source's failure and the
rest of the build publishes. The candidates fetch is caught separately: forums degrade to none with a log
line and the Election keeps its calendar, notices, and links.

## 3. Links in the page's accordions were silently dropped — FIXED

Raised: only `.vi-img-overlay-buttons` links were read, so the "Other Information" accordion — Webb
County Elections Office, the Texas Secretary of State's important election dates, the city's political
sign regulations — was dropped with no log, although the ticket asks for the outside links grouped by
Publisher and the research inventory lists exactly those.

Fixed. Accordion links are read the same way as buttons, taking the label from the anchor text or, when
the city leaves it empty, from its `title`. The two accordions that hold material the spec puts out of
scope (the state forms a filer fills in, the district-map ordinances) are skipped by a declared list of
the city's own headings, `SKIPPED_ACCORDIONS`, and the run log counts what that leaves out rather than
dropping it silently. `www.sos.state.tx.us` joined `LINK_PUBLISHERS`; links are de-duplicated by URL,
which the city needs (it lists the elections office twice). The Election page now carries 15 links
against 9 before, and the test asserts the county and state groups, the sign regulations, and the
absence of the excluded material.

## 4. `parseMonthNameDate` accepted impossible dates — FIXED

Raised: "February 31, 2026" became `2026-02-31`, which `formatDate` silently renders as March 3 and which
is an invalid `<time datetime>`. Fixed by round-tripping through `Date.UTC` and returning undefined when
the month or day moved.

## 5. The special election page dates some notices `MM-DD-YY` — NOT FIXED, handed to issue 04

Raised as a low finding the reviewer itself scoped to issue 04: three notices on the special election page
use `10-07-26` rather than a written-out date and would parse to nothing. Not fixed here because this
ticket does not read that page — `ELECTION_PAGES` holds the general election only, and issue 04 is the
ticket that wires the special election up. Recorded where that ticket will see it: a comment on
`parseNoticeRows` and a note appended to `.scratch/laredo-elections/issues/04-special-election-same-path.md`,
together with the exact table row issue 04 needs to add.

## 6. Links sharing an accessible name — FIXED

Raised: three "Where do I Vote?" links and two "Election Ordinance" links had identical link text, with the
city's distinguishing sub-label outside the anchor, so a screen reader's link list showed duplicates. Fixed
by moving the sub-label inside the anchor; a test asserts every link name on the page is unique.

The reviewer also noted, as optional, that English city text on the Spanish page carries no `lang="en"`.
Not fixed: that is how every Item on the site already renders, so changing it here alone would make this
page inconsistent with the rest. It belongs to a site-wide change, not to this ticket.

## 7. An unsourced claim in the interface text — FIXED

Raised: `elections.links.intro` asserted "Only Webb County registers voters, prints ballots, and runs the
polling places", which is the site adding something the city did not publish. Removed. The two Spanish
wordings the reviewer flagged were taken as well.

## 8. `cityHref` matched look-alike hosts — FIXED

Raised: `hostname.endsWith('cityoflaredo.com')` also matches `evilcityoflaredo.com`, which would have had
the site unwrap a splash parameter from, and force https on, a host that is not the city. Fixed with an
exact match on `cityoflaredo.com` or a `.cityoflaredo.com` suffix. The reviewer confirmed the rest of the
helper: `javascript:`, `data:` and `mailto:` are refused before and after unwrapping, relative hrefs
resolve to the city, and nested splash wrappers terminate.

## 9. Test gaps — FIXED

Raised: the Directory assertions only checked that text existed rather than the per-language name; nothing
exercised a forum that does have an href; nothing covered loading a data file written before `elections`
existed. All three are now asserted. The forum-with-a-link case runs the whole build against the recorded
candidates page with one href injected, which is how issue 07 already derives its "before minutes were
published" state, so the build seam is kept. The suite is 36 tests.

The reviewer also observed that two of the three notices fall outside the 90-day window from
`FIXTURE_NOW`, so the Topic and RSS assertions cover only the August 19 one. That is the site's existing
window rule rather than a defect, and the Election page itself is deliberately not windowed, which the
test does assert by listing all three notices there.

## 10. A re-read that came back empty would wipe the record — FIXED

Raised: `mergeElections` replaced the stored Election whole, so a city page that briefly lost its calendar
or its buttons would empty what the site had recorded, against the spec's rule that the pages stay up
frozen. Fixed: an incoming empty calendar, link list, or forum list no longer overwrites stored entries.

## What the reviewer found clean

Ingest and the data file (a second build adds no Items, `firstSeen`/`source`/`publisher` survive merges, a
data file without `elections` loads as `[]`, `saveData` sorts and writes the new key, nothing is dropped);
no filename read for meaning anywhere; the voting-site and Publisher rules declared as tables per ADR-0004;
Publisher text never translated while interface text and dates always are; everything escaped; no iframe
and no third-party script; sections labelled; the calendar stacking at phone width. The other seven test
files and the fixture build are unaffected.
