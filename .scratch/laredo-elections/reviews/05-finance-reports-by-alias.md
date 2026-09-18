# Review: 05 — Finance reports attached by Alias

Reviewed 2026-09-18 by a dispatched Orca reviewer (`claude`, own terminal, same worktree), scoped to this
ticket's acceptance criteria. It reviewed commit `5b8b112` against the ticket, the spec, CONTEXT.md and
ADRs 0001/0004/0005; ran `npm run typecheck` (clean) and `npm test` (63 green); read the recorded finance
fixture for layouts the parser does not handle; and checked bilingual completeness, ADR-0005 exactness,
the accessibility of the new table columns, and whether the tests assert behaviour rather than restating
the implementation. It found no blockers, five should-fix items and five nits, and confirmed the
implementation is right where the ticket's own second criterion is wrong (see finding 10).

Findings below in the reviewer's order, each with what was done about it. Findings 1 to 9 are fixed;
10 is bookkeeping and is answered. The fixes and their tests are in the commit that carries this file.

## 1. The city writes the office inside the link in two periods, so the filer name was wrong — FIXED

Raised: under January 15, 2023 and January 15, 2015 the city puts its usual "Office - Name" *inside* the
anchor (`<a>District 1 - Gilbert Gonzalez</a>`). The filer name was then "District 1 - Gilbert Gonzalez",
which answers to nobody, so Gilbert Gonzalez's January 2023 report (document 3200) was missing from his
Candidate page — and because those periods are before this site's coverage opens, nothing was logged
either. The test's count of 13 reports baked the gap in.

Fixed in `parseFinancePage`: where the city printed no office beside the link, an "Office - Name" link
text is split, the prefix taken as the office and the rest as the filer name. All nineteen links on the
page with that shape are the city's own "Office - Name"; nothing else in the fixture contains " - ".
Documented in the module header with both dates. Tested: document 3200 now renders on his page with
"District 1" as the office, and his report count is 14.

## 2. An Alias under a Candidate id that is nobody was silently ignored — FIXED

Raised: a mistyped or stale fifty-character Candidate id in the owner's file attaches nothing and says
nothing, which is the owner's most likely mistake with that file.

Fixed: the Source now logs `"<id>" in <file> is no Candidate, so its Alias attaches nothing` for every
declared key that is not a Candidate this run. Tested through the build with a made-up id.

## 3. "Not posted" claimed more than the site knows — FIXED

Raised: the cell read "Not posted" whenever no report was attached, so Victor D. Trevino's Mayor row said
"not posted" for both deadlines while both of his reports sat unattached under the same table. The ticket
reserves "not posted" for a name the city lists unlinked, and the adapter does not record that case.

Fixed with an honest sentence instead: `race.finance.none`, "No report under this name" / "Ningún informe
bajo este nombre", in both languages. It is true in all three states a cell can be in (nothing posted, a
report posted under a spelling nobody has declared, a name the city listed with a dead link), it is never
blank (user story 2), and the unmatched list under the table carries the reports it does not claim.
`race.notPosted` stays what it was for the treasurer and application cells.

## 4. Columns used a per-Election window while Items used the earliest — FIXED

Raised: `financePeriods` used that Election's own calendar start and the Source used the earliest across
Elections, so once issue 04 lands the special election's Race table would show no finance column for
July 2026 although those reports exist for its candidates and are already Items.

Fixed: both now use `earliestCoverageStart`, one line for the whole site, and `financePeriods(ctx)` no
longer takes an Election. The second half of the finding — that the ticket says "the earliest Election's
first filing day" while the code uses the first day on the Election's own calendar (2025-11-03 for the
general election) — is a deliberate reading, documented in `src/elections/coverage.ts`: the city's own
first filing day for this election is 2026-07-18, three days *after* the July 15, 2026 reports, so that
reading would leave the ticket's own "finance report Items in the RSS" criterion unsatisfiable against
the recorded fixtures. Flagged to the coordinator for the ticket's wording.

## 5. The column heading ran together, and two reports in one cell shared a link name — FIXED

Raised: `<span>Campaign finance report</span><time>Jan 15, 2026</time>` with no whitespace reads as
"Campaign finance reportJan 15, 2026"; and an amended report filed for the same deadline would give two
links in one cell the same accessible name.

Fixed: a space between the two, asserted in both languages; and where a cell holds more than one report
each link's hidden text names the city's document id (`race.finance.document`, both languages).

## 6. An office read from the parent list item could be punctuation or a person — FIXED (in part)

Raised: the parent item's own text becomes the office, which under October 11, 2022 is a bare "*" and
under July 15, 2020 is "District VII - Benigno G. Cepeda", one filer's name standing as five others'
office.

Fixed for the punctuation case: own text with no letter or digit in it is the city's own marker, not an
office, and is ignored — the same rule issue 02 applies to a name cell. The Cepeda case is left as the
city printed it, because the site never rewrites the Publisher's words, and is now named with its date in
the function's doc comment. Both are from before this site's election coverage opens.

## 7. Item titles inherited a per-link title attribute the CMS varies — FIXED

Raised: the label comes from the anchor's `title`, which the city writes as "CFR" on document 13810 and
"Campaign Finance Report - Jesus Dominguez" on 22031, and the Item title used it.

Fixed: the Item title always uses `FINANCE_LABEL`, the city's own words for these links, so feed titles do
not wobble with one anchor's attribute. The Filing keeps the city's own title for that document.

## 8. Gaps in the hand-kept file's tests and its promises — FIXED

Raised: the committed `data/elections.yaml` was never parsed by a test; "never written" was asserted only
where the file exists; and an inline `# comment` after a name becomes part of the name, which the module
header's "it is YAML" did not warn about.

Fixed: a test parses the committed file (no Aliases, nothing verified, so a syntax slip in it fails the
suite); the first test asserts a build with no file leaves none behind; and both the module header and the
file's own comments now say a name runs to the end of its line, so a note goes on the line above it.

## 9. Stale strings and one log line — FIXED

Raised: `race.description` still promised only a treasurer and a ballot application; `candidate.filings.intro`
said "in the order it lists them" although finance reports are appended newest deadline first; and the
Source logged "this election's periods" for a window that spans every Election.

Fixed, all three, in both languages.

## 10. The ticket's own second criterion, and housekeeping — ANSWERED

Raised: the ticket says `"Gilbert Gonzalez" with no Alias stays unmatched; with an Alias it attaches to
Gilberto Gonzalez`. In the recorded fixture "Gilbert Gonzalez" is the District 1 candidate's **name on
ballot**, so it attaches with no Alias at all, exactly as ADR-0005 requires; the pair that needs an Alias
is "Dr. Victor D. Treviño" against "Victor Daniel Trevino" (the ADR's own other example). The
implementation is right and both paths are tested: the ballot-name match with no file at all, the Alias
path with Treviño, and the legal-name match with his 2022 reports. The criterion's box is ticked with a
note rather than silently, and the wording is the coordinator's to amend. Import order in
`src/render/elections.ts` fixed; the ticket's six boxes are ticked.

## Checked and fine (reviewer's list)

- ADR-0005 exactness: trimming and nothing else; legal name, name on ballot, and Aliases only.
- One document is one Filing wherever the city lists it (six duplicates in the fixture, counted in the log),
  and one Filing attaches to the same person in two Elections without duplication.
- The hand-kept file is read and never written; ENOENT means empty; any other error fails only this Source.
- The broken `http://` link is recorded as listed-with-nothing-to-open and logged, not as a Filing.
- Every city string is escaped; the quoted nicknames survive into RSS escaped.
- The unmatched list is per Election rather than per Race, with the comment and the intro sentence saying why.
