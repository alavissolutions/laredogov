# City of Laredo 2026 election pages: inventory

Captured 2026-09-17 through the project's headless Chromium fetcher (plain HTTP and Playwright's request API get 403 from Akamai; only real page navigations pass, about 25 s per document). Raw HTML from the capture is not committed; fixtures get recorded during implementation.

## Pages

| Page | URL | Holds |
|---|---|---|
| General election | https://www.cityoflaredo.com/departments/2026-general-elections | Calendar, notices, voting-site PDFs, links to sub-pages, ordinances |
| Special election | https://www.cityoflaredo.com/departments/elections-2026/2026-special-elections | Same shape, District 8 only |
| General candidates | https://www.cityoflaredo.com/departments/elections/2026-candidates-information | Candidate tables per Race, ballot-order drawing video, forum schedule |
| Special candidates | https://www.cityoflaredo.com/departments/elections-2026/2026-special-election-candidates-information | District 8 table, forum placeholder |
| Campaign finance reports | https://www.cityoflaredo.com/departments/city-secretary-s-office/campaign-finance-reports | Every filer since 2015 by filing date |

Several nav aliases 302 to the two election pages; ignore them. All pages `lang="en"`, no Spanish, no translate widget.

## Elections and Races

- **General, Tuesday 2026-11-03**: Mayor (5 candidates); District 1 (2); District 2 (2); District 3 (3); District 6 (2); Municipal Court Judge Position 1 (2). Plus a non-binding question on pediatric hospital services (resolution 2026R221, doc 24357). Proclaiming ordinance 2026O144 (doc 24389). Early voting 2026-10-19 to 10-30; registration deadline 2026-10-05; ballot-by-mail application deadline 2026-10-23.
- **Special, Saturday 2026-12-05**: District 8 (3 named candidates plus one unnamed row with only a treasurer appointment). Filing window 2026-09-05 to 10-05; ballot-order drawing 2026-10-07; early voting 2026-11-23 to 12-01. Proclaiming resolution 2026R205 (doc 24383).

## CMS structure (CivicPlus/Vision)

- Content column `#ColumnUserControl1`; widgets `div[id^=widget_]`; accordions `.accordion_widget > .accordion-item > .accordion-heading + .accordion-content`; image-button lists `ul > li > a.button-link`.
- External links are wrapped: `https://www.cityoflaredo.com/?splash=<urlencoded>&____isexternal=true`.
- Documents: `/home/showpublisheddocument/<docId>[/<ticks>]` and `/home/showdocument?id=<docId>&t=<ticks>` are the same store. `docId` is the stable key; ticks are a cache-buster and sometimes absent. Every document probed is `application/pdf` with a `Content-Disposition` filename.

## Candidate tables

One accordion item per Race (ids `Mayor`, `District 1` ... `Municipal Court Judge`, `District8`), one table each, columns **Name | Name on Ballot | Campaign Treasurer | Application**. Treasurer cell links the treasurer appointment PDF (anchor title "Campaign Treasurer Application"); Application cell is a "View" link (anchor title "Application for a Place on the (Special Election) Ballot"). Each table ends with an empty **Write In Candidate | Contact Info. | Campaign Treasurer | Application** block. Rows are in ballot order. No photos, statements, or contact details anywhere.

Data-entry quirks, not to be corrected by parsers: the District 6 write-in header says "View" instead of "Application"; the special table's first row has blank Name cells (the treasurer filename names the person, which the site must not use); treasurer filenames for the judge race say "MCJ P2" while the page says Position 1.

## Finance page

Two accordion widgets, items titled by filing date (newest first, "July 15, 2026" back to "January 15, 2015"), sub-headings such as Current Office Holders, Candidates, district names, Special Purpose, and one link per filer per period. Names are unlinked when no report was posted. One January 2026 link has the broken href `http://`. No per-candidate grouping and no 2026 candidate pre-election reports as of the capture date; six 2026 candidates have July 2026 officeholder reports (Victor D. Treviño, Gilbert Gonzalez, Richie Rangel Jr., Melissa R. Cigarroa, Tyler King, Alyssa Cigarroa).

Name spellings differ from the candidate tables: "Gilbert Gonzalez" versus "Gilberto Gonzalez", "Dr. Victor D. Treviño" versus "Victor Daniel Trevino", "Ricardo "Richie" Rangel Jr." versus "Ricardo Rangel Jr.". This is why ADR-0005 uses declared Aliases.

## Filename patterns (from Content-Disposition; informational only, never parsed)

- Applications: `<OFFICE> <Full Name>.pdf`, OFFICE in Mayor, D1..D8, MCJ P1.
- Treasurer appointments: `<MMDDYY> CTA <Treasurer> for <Candidate> <OFFICE>.pdf`, sometimes with "Amended".
- Finance reports: `CFR <OFFICE> <Name> <MMDDYY><MMDDYY>.pdf` (period start and end).
- Notices: `<MMDDYY> Notice of ....pdf`; voting sites `EV Sites 090226.pdf`, `ED D8 Special Election.pdf`; district maps `D<n>ORDINANCE2022O022.pdf`.

## Other links on the pages

- Ballot-order drawing: YouTube embed `jO31Ua5EIeE` on the general candidates page; a notice PDF (doc 24541) for the special.
- Forums: six buttons with dates and no href on the general page (Mayor 10-06 7:30 pm; Judge 10-08 6:00 pm; D1 10-06 6:00 pm; D2 10-07 7:30 pm; D3 10-07 6:00 pm; D6 10-08 7:30 pm); one District 8 placeholder on the special page.
- Webb County: sample ballots, voter registration, elections office. Texas SOS: "Am I registered", important dates. openlaredo: precinct map PDF; ArcGIS: council district map.
- Candidate forms for filers (TEC and SOS PDFs) and district map ordinances: out of scope for residents.
- Contact: City Secretary Mario I. Maldonado, Jr., laredoelections@ci.laredo.tx.us, (956) 791-7308.
