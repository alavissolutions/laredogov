# Review: 03 — Candidate pages

Reviewed 2026-09-18 by a dispatched Orca reviewer (`claude`, own terminal, same worktree), scoped to this
ticket's acceptance criteria. It reviewed commit `74cd406` and checked its claims independently: it ran
`npm run typecheck` (clean), `npm test` (51 green), and `npm run build:fixtures` (clean: 16 Candidates, 32
Filings, 16 Candidate pages per language); made its own cheerio pass over all sixteen English/Spanish page
pairs (identical headings, identical summary values but the date, identical city links, own links differing
only by language tree, no images, no link off cityoflaredo.com, no two links sharing an accessible name);
measured Race and Candidate pages in headless Chromium over HTTP at 320 px (no page overflow, the Race
table still scrolls 544 px inside 288 px); and ran the Spanish search box for "Jose David Gonzalez",
"JD Gonzalez", "Treviño", "gonzález", and "Guadalupe De Leon". It judged all four acceptance boxes met and
verified, box 3's test weak, and rated every finding low or a nit.

Findings below in the reviewer's order of severity, each with what was done about it. Findings 1 to 6 are
fixed; 7 and 8 are answered below. The fixes and their tests are in the commit that carries this file.

## 1. A placeholder in a name cell slugged to nothing and its page overwrote the Race page — FIXED

Raised: `nameSlug('—')` is `''`, so `PATHS.candidate` gave `/mayor//`, which `path.join` collapses to
`mayor/index.html`: a dash typed into the city's name cell would silently replace the Race page in both
languages. Low likelihood, total damage, and no log line to tell the owner.

Fixed at the source rather than at the URL. A name cell holding no letter or digit at all is the city's
placeholder for a name it has not printed, so `parseRaceRow` reads it as blank: the row becomes one the
city has not named (CONTEXT.md), its documents are still Filings, and the run log counts the cells so the
owner sees that something was typed there. A slug can no longer be empty. Tested through the build against
the recorded fixture with the mayoral row's two name cells set to `-`: fifteen Candidates, one unnamed row,
the log line, and the Race page still the Race page.

## 2. The Spanish meta description called every Candidate a "candidato" — FIXED

Raised: `candidate.description` read "…, candidato para {race}", which genders Alyssa Cigarroa and Daisy
Campos Rodriguez male. The site prints no label the city does not print, and this one is the site's own.

Fixed: "…, quien se postula para {race}", which is neutral. (`race.description` from issue 02 has the same
shape, "como candidato para {race}", but it describes a Race rather than a person; left for that ticket's
owner to decide.)

## 3. Two Filings of one kind would have shared one accessible link name — FIXED

Raised: the link text was the plain label alone and the city's own title sat outside the link, so an
amended treasurer appointment — common in Texas, and certain once issue 05 adds one finance report per
period — would put two links reading "Campaign treasurer appointment" on one page.

Fixed by moving the city's own title inside the anchor as a sub-label, which is what the Election page
already does with its link sub-labels and for the same reason. Chromium's accessibility tree now reads
"Campaign treasurer appointment Campaign Treasurer Application". A test asserts every link on a Candidate
page has its own name.

## 4. A Candidate hit in search showed election day as if it were a posting date — FIXED

Raised: the result line renders `fmt(it.d)` for every hit, so a Candidate read "City of Laredo · Nov 3,
2026 · Elections" as though something had been posted that day.

Fixed: an entry that is a page of this site labels its date, "Election day Nov 3, 2026" / "Día de la
elección 3 nov 2026" (`search.electionDay`, both languages). The date still sorts the hits. The comment on
`u` in `search-index.ts` now says what that field is for these entries: the Election's own page at the
Publisher, kept as the fallback while `s` is what the reader opens.

## 5. The search test asserted the script's text, not the match — FIXED

Raised: the test checked that the inline script mentions `it.a`, which does not prove a resident typing
either name finds the page.

Fixed: the test now folds the index entries the way the page does (shown name plus the name it also answers
to, NFD, combining marks stripped) and asserts that "jose david gonzalez", "JD Gonzalez", and "Treviño"
each return exactly the right Candidate page. The same three queries were also run through the real page in
headless Chromium.

## 6. Issue 02's bilingual check no longer compared the site's own links — FIXED

Raised: when the Candidate links entered the Race table, that test's exact href comparison was split into
an exact comparison of the city's links and a prefix check of the site's own, which is weaker than what it
replaced.

Fixed: the own links are compared exactly after the language segment is removed, and their count and first
value are asserted. The reviewer judged the `contents().first()` change to the treasurer assertion fine:
the visible name is still asserted exactly, and the unique-name assertion covers the hidden suffix.

## 7. City titles in the Spanish tree carry no `lang="en"` — NOT FIXED, out of scope

Raised as a nit: every untranslated string the city wrote — Item titles, Body names, Race titles, and now
the Filing sub-labels — is read by a Spanish screen reader with Spanish pronunciation rules. The reviewer
itself called it site-wide and not this commit's regression. Marking up the Publisher's language everywhere
it appears is an ADR-sized decision about the whole site, not a change to make inside one ticket; raised
here so the owner can take it as one.

## 8. No rendered test for a Candidate whose ballot-name cell is blank — FIXED

Raised: `candidateName` falls back to the legal name and the slug comes from it, but only the adapter side
of that was tested (issue 02).

Fixed: a test builds against the recorded fixture with JD Gonzalez's name-on-ballot cell emptied, and
asserts the page is at `/mayor/jose-david-gonzalez/`, headed with the legal name, with the name on ballot
shown as not posted and both Filings still listed.
