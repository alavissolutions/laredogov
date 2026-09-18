# Recorded fixtures

Every file here is a real response captured once from the live Source through the production fetcher (one polite request per page), checked in, and refreshed only when a Source changes shape. Tests never touch the network: `fetcher.ts` maps each Source's URLs to these files, and a URL with no fixture fails the test.

Refresh with `npm run capture -- <source>` (see `scripts/capture-fixtures.ts`). Pages marked "by hand" below were captured with a one-off script the same way.

| Path | Source and URL | Captured | Notes |
|---|---|---|---|
| `laredo-utilities/feed.xml` | `https://laredoutilities.com/feed/` | 2026-09-16 | WordPress RSS, one item |
| `legistar/bodies.json` | `https://webapi.legistar.com/v1/cityoflaredo/bodies` | 2026-09-16 | 66 Bodies |
| `legistar/events.json` | `/events` for the adapter's window when `now` is 2026-09-16 (2026-07-01 to 2027-10-01) | 2026-09-16 | 56 events; no cancellations in this window |
| `legistar/events-2024.json` | `/events` for the adapter's window when `now` is 2024-01-10 (2023-11-01 to 2025-02-01) | 2026-09-16 | 90 events; includes Council 2024-01-16 with comment "Cancelled", the real form of a cancellation |
| `legistar/insite/{1548,1622,1623,1334,1625}.html` | InSite `MeetingDetail.aspx` pages for those events | 2026-09-16 | by hand; 1548 shows agenda, packet, minutes, video links; 1334 agenda only; others none |
| `city-newsroom/newsroom.html` | `https://www.cityoflaredo.com/government/newsroom` | 2026-09-16 | headless Chromium; 6 items; department filter select enumerated from here |
| `city-newsroom/newsroom-dept-{13-fire,23-police,14-health,28-airport}.html` | `/government/newsroom/-seldept-{id}-41` | 2026-09-16 | by hand; the tax hearing notices appear under every department, which is why Airport is fetched as a control |
| `city-newsroom/newsroom-archive.html` | `/government/newsroom/-arch-1-41` | 2026-09-16 | by hand; 20 older items, used where a test needs Items older than 90 days |
| `city-newsroom/newsroom-archive-dept-13-fire.html` | `/government/newsroom/-arch-1-41/-seldept-13-41` | 2026-09-16 | by hand; Fire-tagged items including the May 2026 boil-water notices |
| `city-newsroom/news-{554,530}.html` | item detail pages | 2026-09-16 | by hand; confirm the detail page does not expose the department (not used by the adapter) |
| `city-calendar/month-2026-{09,10}.html` | `/government/city-calendar/-curm-{9,10}/-cury-2026` | 2026-09-16 | headless Chromium month grids |
| `city-calendar/event-{3320,3360,3304}.html` | `/Home/Components/Calendar/Event/{id}/17` | 2026-09-16 | by hand; 3320 is a P&Z Committee Meeting, 3360 a timed run, 3304 an all-day cleanup. Other detail pages answer 404 in tests and the adapter falls back to the grid |
| `city-bids/bids.html` | `https://www.cityoflaredo.com/services/bids-rfp-s` | 2026-09-16 | headless Chromium; the city listed no open bids that day, so every table row is empty or "N/A" |
| `city-elections/general-2026.html` | `https://www.cityoflaredo.com/departments/2026-general-elections` | 2026-09-17 | headless Chromium; calendar, notices, voting-site PDFs, sub-page and ordinance links |
| `city-elections/special-2026.html` | `https://www.cityoflaredo.com/departments/elections-2026/2026-special-elections` | 2026-09-17 | headless Chromium; District 8 special election page |
| `city-elections/general-2026-candidates.html` | `https://www.cityoflaredo.com/departments/elections/2026-candidates-information` | 2026-09-17 | headless Chromium; one accordion table per Race, forum buttons without hrefs |
| `city-elections/special-2026-candidates.html` | `https://www.cityoflaredo.com/departments/elections-2026/2026-special-election-candidates-information` | 2026-09-17 | headless Chromium; District 8 table whose first row has blank Name cells |
| `city-finance/campaign-finance-reports.html` | `https://www.cityoflaredo.com/departments/city-secretary-s-office/campaign-finance-reports` | 2026-09-17 | headless Chromium; every filer since 2015 by filing date; all July 2026 officeholder reports are scanned image PDFs |
| `city-finance/synthetic-cover-sheet.pdf` | none: written by `npm run make:pdf-fixtures` | 2026-09-18 | **not a capture.** A text-layer FORM C/OH cover sheet with invented totals ($24,310.75 contributions, $18,672.40 expenditures, $31,208.06 maintained, $0.00 loans), written the plain way: literal strings, deflated, length stated. Stands in for document 23838. Boxes 17 and 19, the unitemized subtotals, are filled in so the reader is held to boxes 18 and 20 |
| `city-finance/synthetic-cover-sheet-kerned.pdf` | none: written by `npm run make:pdf-fixtures` | 2026-09-18 | **not a capture.** The same form written the awkward way a real writer does: kerned `TJ` arrays instead of spaces, every third label in hexadecimal, amounts broken at their commas, no compression, and an indirect `/Length`. Different invented totals ($9,004.20, $3,115.88, $12,660.55, $2,500.00). Stands in for document 23812 |
| `city-finance/synthetic-amended.pdf` | none: written by `npm run make:pdf-fixtures` | 2026-09-18 | **not a capture.** Two cover sheets, an amendment behind an original whose total contributions box was left blank. It has to come back unreadable: reading the blank box from the second sheet would publish a set of totals nobody filed. Stands in for document 22178 |
| `city-finance/synthetic-scanned.pdf` | none: written by `npm run make:pdf-fixtures` | 2026-09-18 | **not a capture.** One image, no font, no text layer: the shape of every report the city has actually posted. Every document URL but the three above answers with this one |

The four PDFs above are written rather than captured for two reasons. Every campaign finance report the city has posted for the 2026 cycle is a scan from a Toshiba copier (producer `SECnvtToPDF V1.0`, zero `/Font` objects, one image per page, 1.3 MB to 20 MB), so the readable report this ticket needs does not exist in the city's filings; and this project does not keep a copy of a Publisher's document (ADR-0001), let alone commit a megabyte of one.

Everything inside them is fictitious: the filers are Pat Q. Example-Filer, Robin T. Notareal-Person and Sam V. Placeholder, at 000 Example Street, Nowhere, TX, and the totals are nobody's. The names on the site come from the city's own finance page, never from a document, so which real document id a fixture stands in for is only which URL the fixture fetcher answers. Those invented totals reach a real candidate's name only in a test's temporary directory, and in a local `npm run build:fixtures` development build if the owner lists one of those ids in `data/elections.yaml`; never on the published site, which shows a total only after the owner has verified it against the real PDF. The layout follows the real FORM C/OH closely enough to exercise what the reader has to get right and no closer: the wording of the six totals boxes is verbatim because that is what the reader matches on, and the rest, including the box numbering, is approximate.

The Wayback Machine holds only redirects for the bids page, so no capture with real bid rows exists yet. Refresh `city-bids/bids.html` when the city posts a bid and extend the bids test then.

One test (issue 07) derives a "before minutes were published" state from `legistar/events.json` by nulling the minutes and media fields of the July 27 Council record in memory; it is built inside the test where it is used. That and the four written PDFs above are the only fixtures here that are not a Source's own bytes.
