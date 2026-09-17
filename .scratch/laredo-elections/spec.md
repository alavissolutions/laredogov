# Laredo Elections: compare the Candidates from the city's own filings

Status: ready-for-agent
Date: 2026-09-17
Vocabulary: `/CONTEXT.md` (Election, Race, Candidate, Filing, Figure, Alias). Decisions: `/docs/adr/0005` plus the note on `/docs/adr/0001`. Page inventory: `/docs/research/laredo-elections-2026.md`.

## Problem Statement

The biggest question residents bring to the site is who is running and what to make of them. The City of Laredo publishes everything a voter is entitled to see (who filed, who their treasurer is, their sworn campaign finance totals, the election calendar, where to vote) but spreads it over two election pages, two candidate sub-pages, and one finance page that lists every filer since 2015 by filing date. Nothing groups it by candidate. A resident who wants to compare the five people running for Mayor has to open thirty PDFs and keep their own notes.

## Solution

An Elections section that takes only what the city publishes, groups it by Race and Candidate, and shows it side by side: one page per Election with its calendar and notices, one page per Race with a comparison table, and one page per Candidate listing every Filing the city posted under their name and the finance totals copied from those Filings. Neutrality is a rule stated on every page: everything shown is a link to, or a number copied from, a City of Laredo filing. No photos, statements, endorsements, news, or social media, because the city publishes none and the site adds nothing.

## Elections in scope now

- City of Laredo 2026 General Election, Tuesday November 3, 2026: Mayor; Council Districts 1, 2, 3, 6; Municipal Court Judge Position 1; one non-binding question on pediatric hospital services (a Race with a question and no Candidates).
- City of Laredo 2026 Special Election, Saturday December 5, 2026: Council District 8.

The model allows an Election per Publisher so county or school district elections can follow as their own Sources.

## User Stories

### Comparing

1. As a Laredo voter, I want a page per Race that lists every Candidate in the city's ballot order with their name on the ballot, treasurer, ballot application, and each finance report's totals side by side, so that I can compare them without opening PDFs.
2. As a Laredo voter, I want a cell to say "not posted" when the city lists a Candidate under a filing period without a report, so that a blank never looks like a missing site feature.
3. As a Laredo voter, I want a cell to say "awaiting review" when a report exists but its totals are not yet verified, so that I can still open the PDF myself.
4. As a Laredo voter, I want the Race page to list any finance report the city posted for that period that is not yet attached to a Candidate, with the city's spelling and link, so that nothing the city published is hidden by the site's bookkeeping.
5. As a Laredo voter, I want the non-binding question shown as a Race with the city's ordinance linked, so that I know what else is on the ballot.

### Researching one Candidate

6. As a Laredo voter, I want a page per Candidate with both their legal name and name on the ballot, their Race, their treasurer, and every Filing the city posted under their name with a plain label and a link, so that I can go deeper on one person.
7. As a Laredo voter, I want a Candidate's finance reports filed as an officeholder shown on the same page, labelled with the office the city filed them under, so that sitting officeholders are not shown with less history than challengers.
8. As a Laredo voter, I want every Figure to show its period, the Filing it was copied from, and the date the site last saw that Filing live, so that I can check any number against the source.
9. As a Laredo voter, I want a fixed sentence on every Candidate page saying what the page is and is not (copied from city filings; the site never adds opinion, incumbent labels, or outside material), so that I can trust it is not campaigning.
10. As a Laredo voter, I want no person named who the city has not named on its page, so that a treasurer-only row appears as "candidate name not yet posted" and nothing more.

### Following the Election

11. As a Laredo voter, I want an Election page with the city's calendar (filing deadlines, registration deadline, early voting, election day, ballot-by-mail dates), the early voting and election day site PDFs, and the election notices, so that I have the dates in one place.
12. As a Laredo voter, I want the forum schedule shown, with a link to each video once the city posts one, so that I can watch the candidates speak.
13. As a Laredo voter, I want the sample ballot, precinct map, and voter registration links shown as "from Webb County" or "from the Texas Secretary of State", so that I know I am leaving city material.
14. As a Laredo resident, I want new election notices and new finance reports to appear in the New panel and the Elections RSS, dated by the city's own date, so that I hear about them without checking.
15. As a Laredo voter, I want the Election, Race, and Candidate pages to stay up after election day, frozen, so that the record is there next cycle.

### Language

16. As a Spanish-speaking voter, I want Filing labels, table headings, dates, and the neutrality sentence in Spanish, with names and the city's own titles left as posted, so that I can compare in my language without the site mistranslating a filing.

### Owner

17. As the owner, I want one hand-kept file for Aliases and verified Figures that the scheduled job never writes, so that my edits never conflict with the cron commits.
18. As the owner, I want the run log to list finance reports whose name matched no Alias and Figures awaiting verification, so that I know what to do after each build.
19. As the owner, I want to verify a Figure by adding one document id to a list after checking the four numbers against the PDF, so that verification is one line and I never retype a digit.
20. As the owner, I want the build to fetch a PDF only when its document id is new, so that a steady-state build costs nothing and a filing deadline costs minutes, once.

## Implementation Decisions

### Model

- **Election, Race, Candidate, Filing, Figure** are new records in the data file beside Items and Meetings. An Election belongs to a Publisher and a Source. A Race belongs to an Election and is either an office (with Candidates in the city's order) or a question (with a link). A Candidate has legal name, name on ballot, treasurer name, slug, and Filings. A Filing has kind (treasurer appointment, ballot application, finance report), a period and report type for finance reports, the office the city filed it under, the city's document id, the URL, and first-seen and last-seen-live dates. A Figure has the four cover-sheet totals (contributions, expenditures, contributions maintained, outstanding loans), the Filing it came from, and a verified flag.
- **Identity** is the city's numeric document id for every Filing (`/home/showpublisheddocument/<id>` and `/home/showdocument?id=<id>` are the same store; the trailing ticks are a cache-buster and are dropped). Candidate identity is Election, Race, and legal name as printed in the table.
- **Two Sources, two adapters.** The city election pages Source yields Elections, Races, Candidates, treasurer and application Filings, and notice Items. The city campaign finance Source yields finance report Filings and Items. Each is an ordinary Feed under ADR-0004 with the Elections Topic.
- **Attachment by Alias** (ADR-0005). A finance report attaches to a Candidate only when the filer name on the finance page equals, character for character after trimming, the Candidate's legal name, name on ballot, or one of the owner-declared Aliases. Anything else is an unmatched report: recorded, listed on the Race page for its period, and logged. No normalisation, no nickname stripping.
- **Figures are copied, then verified** (note on ADR-0001). The build downloads a finance report once, reads the four totals from the cover sheet, and stores them unverified. They render only after the owner lists the document id under `verified` in the hand-kept file. A report the extractor cannot read (scanned image, changed form) is stored as a Filing with no Figure and logged.
- **Hand-kept file** `data/elections.yaml`, read by the build, never written: per Candidate, Aliases; a flat `verified` list of document ids. Missing file means no Aliases and nothing verified.
- **Item rules.** Notices become Items dated by the city's date beside them. Finance reports become Items titled from the Filing label and filer name, dated by the finance page's filing-date heading. Ballot applications and treasurer appointments do not become Items (no Publisher date). Voting-site PDFs are notices.
- **Names.** The site prints names exactly as the city does and never derives one from a filename. A table row with no name is rendered as "candidate name not yet posted" with its treasurer link and creates no Candidate.
- **No incumbent label.** Officeholder reports carry the office the city filed them under; the reader draws their own conclusion.
- **Freeze.** Nothing is deleted after election day. Results are out of scope until the county Source is reachable.

### Fetching

- Pages come through the existing headless fetcher. The city's document store answers only real browser navigations, roughly 25 seconds each, so the fetcher gains a download mode that navigates to a document URL and captures the bytes and the `Content-Disposition` filename. Adapters call it only for document ids absent from the previous data file.
- The `Content-Disposition` filename is stored on the Filing for the owner's benefit and is never parsed for names or offices.

### Site

- Elections Topic page gains a list of Elections at the top.
- `/{lang}/elections/2026-general/`, `/{lang}/elections/2026-general/mayor/`, `/{lang}/elections/2026-general/mayor/jd-gonzalez/`. Race slugs are fixed per adapter; Candidate slugs derive from the name on ballot, lowercase, ASCII, hyphenated, with a numeric suffix on collision.
- Race page table: one row per Candidate; columns for name on ballot, treasurer, ballot application, then one column group per finance filing period the city has a heading for, in date order, each showing the four Figures or "not posted" or "awaiting review". Question Races render the question title and the ordinance link.
- Candidate page: names, Race, treasurer, Filings as a labelled list with links and last-seen-live dates, Figures under each finance Filing, and the neutrality sentence.
- Election page: calendar (the city's dated list, as text), notices, voting-site links, forum schedule, outside links grouped by their Publisher, Races.
- All labels, headings, and the neutrality sentence in both languages in `src/i18n/strings.ts`. Names, city titles, and filenames are never translated.
- Directory gains two Source entries (city elections pages, campaign finance reports) with their cadence.

## Testing Decisions

- Same seam: the whole build against recorded fixtures. Fixtures to record: the two election pages, the two candidate sub-pages, the finance page, and two finance report PDFs (one readable July 2026 officeholder report, one deliberately unreadable stub).
- Scenarios through the seam: first build creates two Elections with the expected Races and Candidate counts (16 general, 3 special, plus one unnamed row); a treasurer-only row creates no Candidate and renders as not yet posted; a finance report attaches only via exact legal name, name on ballot, or Alias, and an unmatched one appears on the Race page and in the log; a Figure renders as awaiting review until its id is in the verified list, then renders with all four totals; a second unchanged build fetches no documents and adds no Items; notices and finance reports appear in the Elections RSS with the city's dates and applications do not; Spanish and English Race pages show the same names and numbers; the hand-kept file missing means nothing verified and no failure.
- The Figure extractor is tested only through the build, against the recorded PDFs.

## Out of Scope

- Anything not on the city's election or finance pages: candidate websites, social media, news, endorsements, incumbents' voting records, photos, statements (ADR-0003).
- Itemised contributions, expenditures, donors, or addresses from finance schedules. Totals only.
- Automatic name matching of any kind (ADR-0004, ADR-0005).
- Any label the city does not print: incumbent, frontrunner, party.
- Election results, until Webb County is reachable (phase two).
- County, ISD, state, and federal races this cycle.
- Embedding videos; links only.
- Candidate forms for filers (state PDFs).
- Archiving PDFs (ADR-0001).

## Further Notes

- **No 2026 candidate finance reports exist yet.** The 30-day reports are due around October 5, 2026 and the 8-day reports around October 26. Build the finance adapter and extractor against the July 2026 officeholder reports; the compare table will fill in October.
- **The finance page has data-entry quirks**: a broken `http://` href for one January 2026 report, a District 6 header cell that says View, and treasurer filenames that say "MCJ P2" while the page says Position 1. None of them are read by the adapter; they are noted so nobody "fixes" the parser to guess.
- **Forum buttons currently have no href.** The adapter records forum entries with a date and no link and fills the link when the city adds one.
- **Cost.** Sixteen general plus three special applications and treasurer appointments are links only; no download. Finance PDFs are downloaded once each. First live build after a filing deadline may take fifteen to twenty minutes; the twice-daily schedule absorbs it.
- **Owner's recurring job around each deadline:** run the build, read the log, add Aliases for unmatched reports, open each new PDF, check four numbers, add its id to `verified`, commit.
