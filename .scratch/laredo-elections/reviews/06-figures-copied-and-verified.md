# Review: 06 — Figures copied and verified

Reviewed 2026-09-18 by a dispatched Orca reviewer (`claude`, own terminal, same worktree), scoped to this
ticket's acceptance criteria. It reviewed commit `3e8be65` against the ticket, the spec, CONTEXT.md and
ADRs 0001/0004/0005; ran `npm run typecheck` (clean) and `npm test` (80 green); and probed the cover-sheet
reader with synthetic PDFs of its own, including the Ethics Commission's real blank FORM C/OH, a 20 MB
scanned report, 20 MB of random bytes, unclosed streams, unbalanced parentheses, 100k tiny streams and a
200 MB inflate bomb. It confirmed all six acceptance criteria are met at the build seam and found three
blockers, six should-fix items and three nits.

The three blockers were all the same failure in different clothes: the reader returned a **wrong number**
where its own contract says it returns nothing. None could have reached the published site — the owner
gate stands between a Figure and a page — but each would have put a made-up total under a real person's
name in the data file and the run log, which is the thing the note on ADR-0001 exists to prevent.

Findings below in the reviewer's order, each with what was done about it. All thirteen are fixed except 7,
8 and 12, which are answered. The fixes and their tests are in the commit that carries this file.

## 1. A blank box with the form's printed "$" read the next box's number as the amount — FIXED

Raised: `money` accepted digits with no cents behind a dollar sign, so a cover sheet with box 18 left blank
yielded contributions = 19 (the printed numbering of the box below it). Box 22 blank gave loans = 23, or
500 from the first contributor on Schedule A1, or 25 from a nearby fee. The comment above the function
claimed the opposite of what it did.

Fixed in `src/elections/figures.ts`: an amount must be money with cents, with or without a dollar sign, and
is refused if the text before it ends in a digit, comma, minus, dash or open parenthesis — so the numbering
of the next box, a number the writer broke across the page, and an accountant's negative are all refused.
Each box's amount is also now bounded by the next label rather than searched for after it. Tested through
the build with `synthetic-amended.pdf`, whose first sheet has a blank box 18: the report comes back
unreadable and renders as a link.

## 2. Loose amount grammar truncated numbers — FIXED

Raised: "$ 24," gave 24; "$ 24 310.75" gave 24; a `TJ` array with a wide kern between "24," and "310.75"
gave 24; "$ -500.00" gave 500.

Fixed by the same rule, plus one in the content-stream reader: a kern wide enough to be a space is not
turned into one when the runs on both sides of it are digits or commas, because that is a writer splitting
one number, not two words. Tested through the build with `synthetic-cover-sheet-kerned.pdf`, which breaks
every grouped amount at its comma with a space-width kern and still reads $9,004.20 whole.

## 3. A repeated cover sheet mixed original and amendment — FIXED

Raised: each occurrence of a label was tried in turn per total, so a blank box on the original was filled
from the amendment behind it, producing a set of four totals that nobody ever filed.

Fixed: the labels are grouped into sheets — a label coming round a second time starts the next sheet — and
all four totals are read from the first sheet or none are. Tested by the same fixture.

## 4. A 200 response that is not a PDF pinned a Filing unreadable forever — FIXED

Raised: any empty extraction set `unreadable`, and nothing checked what came back, so a CMS error page or
a bot challenge served with 200 would close that document for good.

Fixed: `copyFigures` refuses a body without a `%PDF-` marker in its first bytes and treats it as a failed
download — logged, not flagged, asked for again next run. Tested: a document the store refuses is asked for
once more on the next build and read then.

## 5. `unreadable` was sticky, and the reader cannot read the TEC's own form — FIXED

Raised: the reviewer ran the reader on the Ethics Commission's blank FORM C/OH (PDF 1.6, AcroForm, 60
fonts). Text comes out, but as glyph codes from subset fonts with their own encodings, so no label matches.
Returning nothing is the safe answer, but it means the most likely text-layer shape would be written off on
the first run and never opened again, even after the reader learned encodings.

Fixed: `READER_VERSION` in `src/elections/figures.ts`, recorded on the Filing as `unreadableBy`. A document
is opened again when this version rises, so raising it is all a future reader has to do to re-read every
report the one before it gave up on. The module header now states the font limitation plainly instead of
claiming the format work is "small and stable".

## 6. Flate output was unbounded — FIXED

Raised: a 200 MB inflate cost +573 MB RSS; a corrupt or crafted stream inside a 20 MB download could take
the whole scheduled run down, every Source with it. Everything else the reviewer threw at the reader held
up: a 20 MB ten-page scan in 85 ms, 20 MB of random bytes in 31 ms, malformed streams returning nothing
quickly.

Fixed: both inflate calls take `maxOutputLength` of 64 MB; over that the stream is dropped and the document
reads as unreadable.

## 7. The coverage-window download restriction was recorded only in a ticket bullet — FIXED

Raised: the spec's Fetching section says documents are opened "only for document ids absent from the
previous data file", but this build also restricts them to the filing deadlines the site's Elections cover
(21 downloads, about nine minutes, against roughly 3.5 hours for all 504). The reviewer agreed the
restriction is right and matches the spec's own Cost note, but it lived only in a code comment.

Fixed: recorded on the note on ADR-0001, together with the reader-version consequence from finding 5, and
the run log now counts the reports that were recorded and not opened because they are older than the
earliest Election's calendar (483 in the recorded fixture). The reviewer also confirmed the gate predicate
is right to be "has a Figure, or a reader of this version already gave up" rather than "the Filing is new":
Filings left by a ticket 05 deploy would otherwise never be read at all.

## 8. The browser download recipe's ordering dependency — FIXED (and partly ANSWERED)

Raised: `route.fetch()` is Playwright's Node-side request carrying the context's cookies, not the browser's
own network stack. It works only because the finance page was navigated in the same context first, which is
exactly the "request API gets a challenge" case the comment warns about. Also `page.route(url)` reads its
string as a glob, so `?` and `*` in a `showdocument?id=` URL are wildcards, and `filenameOf` did not decode
`filename*=UTF-8''`.

Fixed: `download` takes the Publisher's own page as a referer and navigates it once per host when the
context has not been there, so the ordering is guaranteed rather than lucky; the route matcher is a
predicate on the exact href; `filenameOf` decodes the percent-encoded form. The recipe itself remains
unverifiable from here — it was verified against the live store on 2026-09-17 and the fixtures cannot
exercise Playwright — and that is now stated in the method's own comment.

## 9. A verified id that matches no Figure was silent — FIXED

Raised: an owner who lists a scanned report's id after reading it by eye sees nothing change and no message.

Fixed: one log line per verified document id with no totals behind it. Tested.

## 10. The synthetic cover sheet carried a real person's name — FIXED

Raised: the fixture printed "MR Gilbert Gonzalez", a real office and invented sworn totals. The reader never
reads the name — filer names come from the finance page's HTML — so nothing needs it.

Fixed: all four fixtures are filed by Pat Q. Example-Filer, Robin T. Notareal-Person and Sam V. Placeholder
at 000 Example Street, Nowhere, TX. The generator's claim to reproduce the TEC's own box numbering is
withdrawn: the six totals boxes are verbatim because that is what the reader matches on, the rest is
approximate, and `test/fixtures/README.md` says so. The reviewer confirmed the published-site path is safe:
`site/` and `site-data/` are gitignored, CI runs the live build, the real 23838 is a scan, and a Figure
shows only once the owner lists its id. The one residual — listing one of these ids in the real
`data/elections.yaml` would show invented totals in a local `build:fixtures` run — is documented.

## 11. Test gaps — FIXED

Raised: an identical ternary in the amounts assertion; and nothing covered a retried download, a verified id
with no Figure, an unreadable report rendering as a plain link, or the `TJ`, hex-string and indirect
`/Length` paths, which the single fixture did not exercise.

Fixed: two more written fixtures carry those paths through the build seam, and there are now six tests
covering all of the above. 82 tests green.

## 12. Render — ANSWERED, no change

The reviewer found the rendering sound: both languages present, the table inside `.table-scroll` so a phone
never scrolls the page sideways, `dl` inside `td` valid and readable, every value escaped. Two observations
left as they are by design: the Race cell's visible text changes from "Report filed" to "Awaiting review",
so only its hidden text says the link opens the report, which user story 3 asks for; and Spanish prints
"$24,310.75" in United States format, because the number was copied off a United States form and this site
no more restyles it than it translates a name.

## 13. Overstated comment — FIXED

Raised: box 17's label contains "POLITICAL CONTRIBUTIONS" but not "TOTAL POLITICAL CONTRIBUTIONS", so
"word for word" overstated it. Reworded; the guard never depended on it.

## Criteria

| Criterion | Status |
|---|---|
| Two PDF fixtures, one readable, one unreadable stub | Met; four after review, all written rather than captured, all documented as such |
| Extracted totals match the readable fixture's cover sheet | Met; and nothing is returned rather than a guess in the three shapes of finding 1 to 3 |
| Awaiting review, then four totals with period, link, last-seen-live, both languages | Met |
| Unreadable report degrades to a link, build succeeds | Met |
| Second build downloads nothing | Met |
| Log counts present | Met |
