# Review: 02 — Race pages with the comparison table

Reviewed 2026-09-18 by a dispatched Orca reviewer (`claude`, own terminal, same worktree), scoped to this
ticket's acceptance criteria. It reviewed commit `e3487b5` and checked its claims independently: it ran
`npm run typecheck` (clean), `npm test` (43 green), `npm run build:fixtures` (clean), made its own cheerio
pass over the recorded candidates fixture (6 accordion tables, 16 named rows, 32 titled document links),
read the rendered English and Spanish Race pages, and measured the table in headless Chromium at 320 and
375 px. It judged acceptance boxes 1, 2, 4, 5, and 6 met and verified, and box 3 met only in letter.

Findings below in the reviewer's order of severity, each with what was done about it. Every finding is
fixed; the fixes and their tests are in the commit that carries this file.

## 1. The Race table squashed instead of scrolling on a phone — FIXED

Raised: `.race-table{min-width:100%}` with `white-space:normal` under the site's `overflow-wrap:anywhere`
let the table shrink to any container width, so the scroll container never had anything to scroll and the
city's names broke mid-word at phone widths ("Man / uel / A. / Ran / gel, / CPA"). The acceptance box was
therefore met only in letter, and the test asserted only that the wrapper element exists.

Fixed. The table now has a floor wider than a phone (`min-width:34rem`) and its cells wrap at word
boundaries (`overflow-wrap:normal`), so it overflows into the container, which scrolls.

Re-measured in headless Chromium over an HTTP server (the reviewer's measurement, and this implementer's
first one, loaded the pages over `file://`, where the site's absolute `/style.css` never loads and every
number is of an unstyled page — worth knowing for the next person). With the stylesheet actually applied,
at 320 px the container scrolls 544 px inside 288 px and no name breaks mid-word, on all six office Race
pages in both languages.

That measurement also turned up a second, real bug in the same CSS: the visually hidden `<caption>` is
absolutely positioned, and with no positioned ancestor its containing block was the initial containing
block, so it escaped the scroll container's clip and pushed the whole page 112 px sideways at 320 px.
`.table-scroll` is now `position:relative`, and the page no longer scrolls horizontally at 320 or 375 px.

## 2. One document linked from two rows produced two Filings with one id — FIXED

Raised: `mergeFilings` built its id map once and never updated it after a push (unlike `mergeItems`), and
the adapter emitted one Filing per link with no dedupe, so a document the city links from two rows was
written twice under the same id; on the next run only one copy was refreshed. Filing identity is the city's
document id, which is one of this ticket's acceptance criteria.

Fixed in both places. The adapter now keys its Filings by document id and logs the second link (one PDF
under two candidates is a city data-entry slip the owner should see), and the three record merges share one
`mergeRecords` helper that keeps its map current. A test builds against a fixture where District 1's second
application points at the mayoral candidate's document: 31 Filings, all ids distinct, and the log line.

## 3. Question Race pages carried the office meta description — FIXED

Raised: the question page's `<meta name="description">` said the city had posted a candidate for
"Non-Binding Election-Pediatric Hospital Services", contradicting the page's own intro.

Fixed. `race.question.description` in both languages, branched on in `racePage`, and asserted in the
question test in both languages.

## 4. A row named in only one of the two name cells was treated as unnamed — FIXED

Raised: the adapter keyed "named" off the legal-name cell alone, so a row where the city printed only a
name on ballot would render as "candidate name not yet posted" — hiding a name the city did print, which
is the mirror image of the rule the ticket asks for, and invisible to the owner.

Fixed. A row is unnamed only when the city printed neither name; with one cell blank the Candidate is
recorded under the name the city printed and the run log says which cell is blank. Tested through the build
with a fixture whose legal-name cell is emptied.

## 5. A re-seen record never lost a field the city removed — FIXED

Raised: `Object.assign(existing, incoming)` cannot delete a key, so a treasurer the city clears, or a
Filing that stops belonging to a Candidate, would keep its stale value. The reviewer rated this low and
noted it matters most for `Filing.candidateId`, which decides whose page a document appears on in issue 03.

Fixed by the same `mergeRecords` helper: a re-seen record is replaced rather than assigned onto, keeping
its `firstSeen` and taking the new `lastSeenLive`. `mergeElections` keeps its own shape deliberately: its
empty-list guard from issue 01 exists so an Election page that briefly loses a section does not empty the
record.

## 6. `nameSlug` stripped accents with raw combining characters in the regex — FIXED

Raised: the combining-mark range was written as literal U+0300–U+036F bytes, which is unreadable in review
and fragile if a tool NFC-normalises the file.

Fixed: `̀-ͯ` escapes.

## 7. The ticket file was not ticked or annotated — FIXED

Raised: issue 01 ticked its boxes and appended an implementer comment in its own commit, per
`docs/agents/issue-tracker.md`; this ticket had not.

Fixed in the commit that carries this file.

## Nits — FIXED

- The declared anchor-title spellings now carry the `2026-09-17` verification date the other declared
  tables carry.
- An unnamed row's application link now names its ballot position, so two unnamed rows in one Race cannot
  give their links the same accessible name.
- `rel="noopener"` without `target="_blank"`: left as is, consistent with the Election page.
