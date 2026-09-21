# Branch review: feat/laredo-elections (after tickets 01 to 06)

Run 2026-09-18 by the coordinator with `/code-review feat/laredo-elections high` over the whole PR branch at 506ab2a
(82 tests green). Per-ticket reviews live beside this file; these are integration-level findings the fixtures do not
exercise. Each is to be fixed by a dispatched worker, who records the outcome under its heading.

## 1. Candidate identity keyed on whichever name the city printed (src/sources/city-elections.ts ~639)

Identity uses the legal name, else the ballot name. The general fixture has "Jorge A. Garza" in Mayor with no legal
name (id `…:mayor:jorge-a-garza`). When the city fills in his legal name, the next run yields a second Candidate with a
new id but the same slug; `mergeRecords` never removes the old one, so the Race table lists him twice, both pages write
to the same path (last wins), the search index carries two entries, and an Alias declared against the old id stops
attaching. Same effect for any legal-name typo the city fixes.

**Outcome:** Fixed. Candidate identity is now the Race plus the name on the ballot
(`src/sources/city-elections.ts`), and the id and the page's own path are made once from that one
name so they can never disagree. The name on the ballot is the name the candidate filed to stand
under; the legal name beside it is the cell the city fills in late and revises (a middle name, a
suffix, an accent), which is exactly the change this finding is about. The Race plus the treasurer
appointment document id was the other candidate and was rejected: not every row has a treasurer
link (a row may carry only a ballot application, or a treasurer named in plain text), and the city
re-uploading an appointment gives it a new document id, so that identity fails in the same way this
one is meant to survive. `data/laredo.json` holds no Candidates yet, so no stored id changed; the
ids in the existing tests, in `src/elections/hand-kept.ts`, in `data/elections.yaml` and in the
spec's Identity line did, and all four were updated. The spec said "Election, Race, and legal name
as printed", so this finding overturns a spec rule rather than a slip in the code: spec.md line 64
is amended and dated, for the coordinator to confirm.

Residual, worth the owner knowing: a row the city has printed with no name on the ballot at all
takes its identity from the legal name, so it does change identity if the city later adds the
ballot line. That row is already named in the run log ("... has no name on ballot"), and there is
no third name to key it on.

Test: `test/branch-01-election-tables.test.ts`, "keeps the id, the page and the owner's Alias when
the city corrects the legal name it printed" — two builds over the same data file, the second with
the city's own table corrected from "Victor Daniel Trevino" to "Victor Daniel Treviño Jr.", an
Alias declared in the hand-kept file against the id from the first build, and the finance report
still attaching to it after.

## 2. parseForumButton builds a date from unvalidated MM-DD-YY digits (src/sources/city-elections.ts ~543)

`fromCentral()` on an out-of-range day or month yields an Invalid Date and `Intl.DateTimeFormat.formatToParts` throws,
so the whole city-elections Source fails until the city fixes its typo. `src/dates.ts` already exports
`parseNumericDate()` with the round-trip guard; reuse it.

**Outcome:** Fixed. `parseForumButton` now reads the date with `parseNumericDate()` and its
round-trip guard, and refuses an hour outside 1 to 12 or a minute over 59 beside it, so no instant
is built from digits nobody checked. A button whose date cannot be read is a button with no date:
it goes to the `undated` list the caller already reports to the owner, with the city's own button
text in the line, so the typo is visible rather than silent.

Test: `test/branch-01-election-tables.test.ts`, "reports the forum button the site cannot read a
date in and keeps the rest of the Election" — the recorded page with "10-06-26" changed to
"13-45-26". Before: the Source fails and the Election, its notices and its Races go with it.

## 3. route.fetch() has no timeout (src/fetcher/browser.ts ~488)

The document request is capped by Playwright's 30 s default while the 45 s budget only covers the navigation. A slow
document aborts at 30 s, `download` returns status 0, `ensureOk` throws, and because `unreadableBy` is not set the
same document costs another 30 s every later run. Pass `{ timeout: timeoutMs }` to `route.fetch()`.

**Outcome:** Fixed. `route.fetch({ timeout: timeoutMs })` gives the document request the budget
the caller set instead of Playwright's 30 s default, and the navigation that carries it is given
that budget plus a five-second grace, because the navigation starts first and would otherwise be
what times out — leaving the caller with a Playwright error rather than a response, which is the
same bug wearing a different hat. The route handler now catches its own failure explicitly (it
used to escape as an unhandled rejection) and still fulfils the blank page, so a document the store
will not answer comes back as status 0 for `ensureOk` to turn into a logged skip.

Not changed: the document is *not* marked `unreadableBy` after a refused download, so the next run
does ask for it again. That is deliberate and documented at the call site in `city-finance.ts` — a
store having a bad afternoon must not close a real report for good — so the re-cost the finding
describes is the retry policy, not this bug.

Test: `test/branch-03-browser-session.test.ts`, "gives the document up when its budget runs out" —
a local server standing in for the city's store, holding a document open and never answering.

## 4. cityHref rewrites every *.cityoflaredo.com hostname to www (src/sources/city.ts ~854)

The city runs other hosts under its domain (click2gov.cityoflaredo.com appears in the bids fixture). Rewriting the
hostname sends readers to a 404. Only upgrade the protocol; leave the hostname alone, or map only the bare apex to www.

**Outcome:** Fixed. `cityHref` upgrades the protocol on the city's own hosts and leaves the
hostname as the city wrote it; only the bare apex `cityoflaredo.com` is mapped to `www`, which is
what the city's own site does with it. `click2gov.cityoflaredo.com` and any other host the city
runs now keep their own name. The lookalike guard is unchanged: `evilcityoflaredo.com` is not the
City of Laredo and is touched by none of this.

Test: `test/branch-02-city-links.test.ts` — the recorded Election page with one of the city's own
document links replaced by `http://click2gov.cityoflaredo.com/...`, asserted through the build and
on the rendered page, plus the apex and lookalike cases.

## 5. A Race heading with no letters or digits gets an empty slug (src/sources/city-elections.ts ~401)

The Election title guards this hazard; Races do not. An empty slug fails `validateData` inside `saveData`, outside the
per-Source failure path, and no page of the site publishes. Throw or skip-and-log when `nameSlug(title)` is empty, the
way `printedName()` does for candidate names.

**Outcome:** Fixed. `parseRaces` now refuses a heading that slugs to nothing, the way
`printedName()` refuses a name cell that does, and counts it in a new `unsluggable` list the
adapter reports in the run log with the heading's own text. The Race is left out rather than
recorded with no page to be on, so nothing reaches `validateData` that would take the whole build
down outside any Source's failure path.

Test: `test/branch-01-election-tables.test.ts`, "leaves that Race out, tells the owner, and still
publishes every other page" — the "District 6" accordion heading replaced with "***". Before: the
build throws in `saveData` and no page of the site publishes.

## 6. download() re-navigates the referer page fetch() already visited (src/fetcher/browser.ts ~475)

`fetch()` never records the origin in `warmed`, so every scheduled run pays one redundant headless navigation of the
finance page plus its networkidle wait before the first PDF. Have `fetch()` add `origin(url)` to `warmed` after a
successful goto.

**Outcome:** Fixed. `fetch()` records `origin(url)` in `warmed` after a successful navigation, so
the finance page a Source has just read is not navigated a second time to warm cookies the context
already holds. A run that reads the page and then reaches for the documents on it now pays one
headless navigation and its networkidle wait, not two.

Test: `test/branch-03-browser-session.test.ts`, "does not navigate the referring page a second time
to warm cookies it already has" — the local store counts the hits on the referring page.

## 7. contentText glues adjacent shown strings without a separator (src/elections/figures.ts ~272)

Consecutive `Tj` strings on one row are joined with no space unless a TJ kern is present, and the `'` and `"` show-text
operators are neither a break nor a space, so a label written as several operators reads as one run
("TOTALPOLITICALCONTRIBUTIONS") and never matches; the Filing is stamped unreadable until READER_VERSION is bumped.
Insert a space between adjacent shown strings and treat `'`/`"` as row breaks like `T*`.

**Outcome:** Fixed. `contentText` now puts a space between two strings shown one after the other
with no kern between them, and treats `'` and `"` as a move to the next line. Both halves were
needed: the labels were being read as one run ("TOTALPOLITICALCONTRIBUTIONS"), and without the row
break the last amount of one row runs into the number of the box below it, which the digit guard
would then glue rather than separate. Because `'` and `"` follow the string they show, the row ends
in front of that string rather than after it, which is what the reader now does.

What is deliberately not separated: a number the writer split across two strings. The old guard
(both halves starting and ending in digits or commas: "24," then "310.75") is kept and extended by
one case that only adjacency makes possible, a decimal point beginning the second half ("24,310"
then ".75").

`READER_VERSION` is raised to 2, which is what it is for: this reader finds text in a document the
last one gave up on, so every report stamped `unreadableBy: 1` is opened once more. Nothing stored
is affected today — `data/laredo.json` carries no Filings yet — but the finding's own last line
("the Filing is stamped unreadable until READER_VERSION is bumped") is only answered by bumping it.

Test: `test/branch-04-report-text.test.ts`, a cover sheet written a show operator at a time: the
label read as words, the rows split, the four totals copied, and the split number still one number.

## 8. mergeRecords is O(n²) (src/ingest.ts ~774)

`records.indexOf(existing)` inside the loop is an O(n) scan per incoming record on top of the byId map already built.
city-finance returns ~600 Filings every run and the data file only grows. Build the map as id to index and replace in O(1).

**Outcome:** Fixed. `mergeRecords` builds a map of id to index and replaces in place, so a run
costs what it brought in rather than what the data file has accumulated. Nothing about the result
changed: the same record is replaced in the same position, and first-seen still survives.

Test: `test/branch-05-merge-records.test.ts` — 200,000 records merged twice. On this machine the
scan took 10.0 s and the index takes 0.3 s; the test's bound is 4 s. The cost is the finding, so
the cost is what is measured.

## Review of the fixes

Reviewed 2026-09-18 by a dispatched Orca reviewer (one worker, same worktree, scoped to the eight
findings and their tests, read-only). It read the whole working-tree diff against the spec,
CONTEXT.md and ADR-0004/0005, ran typecheck, the suite and `build:fixtures` itself, reverted each fix
in a scratch copy to confirm every new test fails before it and passes after, and compared the old
and new `mergeRecords` over 2,000 random cases including duplicate ids. It found all eight fixes
close their findings and every Outcome claim matched by the code, with no blocking concern. What it
raised, and what was done:

1. **The split-number guard misses a writer that splits after the decimal point** ("24,310." then
   "75" now reads as two things, and a report reader 1 could read comes back unreadable under
   reader 2). Real, and **not fixed, deliberately**. The suggested third clause — glue when a
   number ending in a point meets digits — would read "6." and "18.75" printed beside each other as
   6.18: an amount nobody filed, under a real person's name, which is the one outcome this module
   exists to prevent (note on ADR-0001). The failure it leaves instead is the safe one: no Figure,
   the report still linked, still in the run log, and read again when `READER_VERSION` next rises.
   The choice and its reason are now guarded by a test of their own ("keeps a box number and the
   amount beside it two things rather than one number", `test/branch-04-report-text.test.ts`). If
   the city ever posts a report this loses, the answer is a reader that knows where the form's boxes
   sit, not a wider guess about digits.
2. **A word split mid-way with no positioning between the halves is now spaced** ("Contri" +
   "butions"). Accepted residual, inherent to the trade the finding asks for, and moot for the
   ASCII labels this reader matches on.
3. **Two rows sharing one ballot name in a Race are told apart by row order** (`-2`), so a reorder
   by the city swaps them and an Alias follows the wrong person. Real, pre-existing (the counter
   already did this when the id came from the legal name), and slightly likelier now that the
   shorter of the two names is the key. Not fixed here: the alternative, falling back to the legal
   name to break the tie, reintroduces finding 1 for exactly those rows. Recorded as a residual for
   the owner; the run log already names both rows.
4. **The merge test asserted only wall-clock time.** Fixed: it now also asserts every record is in
   the position it was in, that first-seen survived the replacement and last-seen-live moved, at
   both ends of the array.
5. **Nit: the lookahead for `'` and `"` was an 8-character slice**, so more than seven spaces before
   the operator would miss the row break. Fixed: the window is 64 characters and named.

The coordinator still has one thing to confirm: finding 1 overturns the spec's own Identity rule, so
`spec.md` line 64 is amended and dated rather than the code being bent to it.
