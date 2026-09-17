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

The Wayback Machine holds only redirects for the bids page, so no capture with real bid rows exists yet. Refresh `city-bids/bids.html` when the city posts a bid and extend the bids test then.

One test (issue 07) derives a "before minutes were published" state from `legistar/events.json` by nulling the minutes and media fields of the July 27 Council record in memory; that is the only non-verbatim fixture and it is built inside the test where it is used.
| `city-elections/general-2026.html` | `https://www.cityoflaredo.com/departments/2026-general-elections` | 2026-09-17 | headless Chromium; calendar, notices, voting-site PDFs, sub-page and ordinance links |
| `city-elections/special-2026.html` | `https://www.cityoflaredo.com/departments/elections-2026/2026-special-elections` | 2026-09-17 | headless Chromium; District 8 special election page |
| `city-elections/general-2026-candidates.html` | `https://www.cityoflaredo.com/departments/elections/2026-candidates-information` | 2026-09-17 | headless Chromium; one accordion table per Race, forum buttons without hrefs |
| `city-elections/special-2026-candidates.html` | `https://www.cityoflaredo.com/departments/elections-2026/2026-special-election-candidates-information` | 2026-09-17 | headless Chromium; District 8 table whose first row has blank Name cells |
| `city-finance/campaign-finance-reports.html` | `https://www.cityoflaredo.com/departments/city-secretary-s-office/campaign-finance-reports` | 2026-09-17 | headless Chromium; every filer since 2015 by filing date; all July 2026 officeholder reports are scanned image PDFs |
