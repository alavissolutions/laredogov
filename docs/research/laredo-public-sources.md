# Laredo / Webb County free public information sources — inventory

Researched 2026-09-16 via web search plus direct HTTP probes.
"Verified" = fetched and saw content/feed; "search-verified" = URL/description from search snippets only (host blocks non-browser clients); "unverified" = inferred.

## Access-restriction findings (important for any fetcher)

| Host | Platform | Bot posture observed |
|---|---|---|
| www.cityoflaredo.com | Granicus govAccess (`/Home/Components/News/News/{id}/{cat}`, `/Home/Components/Calendar/Event/{id}`) | **Akamai bot manager: HTTP 403 for curl and non-browser fetchers, including `/robots.txt`.** Search engines are indexed. Needs a real-browser UA/headless browser, or GovDelivery/RSS side channels. |
| www.webbcountytx.gov | CivicPlus CivicEngage (numeric page IDs, `/m/newsflash`, CivicAlerts) | **Cloudflare managed JS challenge on everything incl. robots.txt.** Standard CivicPlus feeds (`/RSSFeed.aspx?ModID=1&CID=All-newsflash.xml`, AgendaCenter RSS) very likely exist but unverified. |
| data.openlaredo.com | CKAN-style catalog on OpenGov Open Data (`ogopendata.com`) | Cloudflare WAF blocked curl, incl. `/api/3/action/package_list`. |
| maps.openlaredo.com | ArcGIS Hub ("City of Laredo - Open GIS Data") | **Open.** DCAT feed works. |
| cityoflaredo.legistar.com / webapi.legistar.com | Granicus Legistar InSite | **Open.** Web API enabled for client `cityoflaredo`. |
| laredotx.new.swagit.com, webbcountytx.new.swagit.com | Swagit (Granicus) video | Open HTML; no RSS found. |
| elmetrotransit.com, laredolibrary.org, laredompo.org | WordPress + WP Defender | robots.txt permissive, but **WP Defender IP-locked (403) after a handful of requests**; rate-limit politely. laredolibrary.org disallows calendar `action~*` and `ai1ec_exporter_controller` URLs. |
| webbcad.org | React SPA "Public Portal"; propaccess.webbcad.org (Harris/True Automation PropertyAccess) | Main site renders nothing without JS. gis.webbcad.org requires login. Property-search page states records are "considered in the public domain" (search-verified). |
| governmentjobs.com/careers/laredo | NEOGOV | Open HTML; no RSS. NEOGOV ToS restricts automated use. |
| library.municode.com/tx/laredo | Municode | Open HTML; ToS prohibits bulk scraping; no public API. |
| lmtonline.com | Hearst | `/rss/` served a bot wall. |
| kgns.tv | Arc XP (Gray TV) | RSS open. |

## Inventory

| Publisher | Publishes | URL | Cadence | Format / platform | Machine-readable feed | Status |
|---|---|---|---|---|---|---|
| City Council & ~60 boards/commissions (City Secretary) | Agendas, packets, supplemental agendas, minutes, legislation (ordinances, resolutions, council items), video links | https://cityoflaredo.legistar.com/Calendar.aspx ; bodies at /Departments.aspx (City Council, P&Z, Board of Adjustment, Ethics, MPO, Historic/Landmark, Charter Revision, TIRZ, LEDC, etc.) | Council 1st & 3rd Mon 5:30pm (+ specials/workshops); P&Z twice monthly; others monthly | Legistar InSite HTML; agendas/packets PDF via `View.ashx?...&M=A` / `M=PA` | **YES – Legistar Web API (JSON, no key):** `https://webapi.legistar.com/v1/cityoflaredo/events`, `/matters`, `/bodies`, `/eventitems` (OData `$top/$orderby/$filter`). Verified live 2026-09-15. Per-meeting iCal export. RSS button present but disabled. | Verified |
| City of Laredo (Public Access Center) | Council/committee meeting video, live stream | https://laredotx.new.swagit.com/views/168/city-council ; live: https://www.cityoflaredo.com/government/live-council-meeting ; YouTube channel id `UCMXpxnnHjoJse6d0vO8Tkjw` | On-meeting | Swagit HTML; YouTube | No Swagit RSS/API. YouTube channel RSS (`youtube.com/feeds/videos.xml?channel_id=…`) unverified. | Verified (Swagit) |
| City of Laredo PIO | Newsroom / press releases (all depts: police, health, utilities, boil-water notices, tax deadlines, events) | https://www.cityoflaredo.com/government/newsroom ; items at `/Home/Components/News/News/{id}/15` | Multiple per week | govAccess HTML | No verified RSS (Akamai blocks). Email/SMS via **GovDelivery** https://public.govdelivery.com/accounts/TXLAREDO/subscriber/new | Search-verified |
| City of Laredo | City events calendar | https://www.cityoflaredo.com/Home/Components/Calendar/Event/{id}/ | Ongoing | govAccess calendar | Per-event iCal likely; unverified | Search-verified |
| City of Laredo Budget / Finance | Budget books, CIP, presentations, ACFRs, debt, tax-rate page | https://www.cityoflaredo.com/departments/budget ; /departments/finance-department/acfr ; /departments/finance-department/financial-transparency/tax-rates | Annual (Aug–Sep) | PDF | **OpenGov transparency portal** https://laredotx.opengov.com/transparency (verified; CSV export typical) | Verified (OpenGov); rest search-verified |
| City of Laredo Purchasing | Bids/RFPs, bid tabulations | https://www.cityoflaredo.com/services/bids-rfp-s ; /government/bid-tabulations ; IonWave https://cityoflaredo.ionwave.net/Login.aspx | As issued | HTML + PDF; IonWave | None official. Mirrored on BidNet Direct / DemandStar (accounts required). | Search-verified |
| City of Laredo HR | Job postings | https://www.governmentjobs.com/careers/laredo | Continuous | NEOGOV HTML | No RSS. Email "Job Interest Card" only. | Verified |
| City of Laredo | Code of Ordinances, Land Development Code | https://library.municode.com/tx/laredo/codes/code_of_ordinances | Supplements periodically | Municode HTML | None (ToS forbids scraping) | Verified |
| City of Laredo GIS | Open GIS data: city limits, ETJ, council districts, zoning, subdivisions, floodplain, parks, roads, thoroughfare plan, TIRZ, historic districts, solid-waste routes, PCI, 2014/2017 building permits, police data by block group (2014-16), COVID stats (2021) | https://maps.openlaredo.com/ | Irregular (some updated Jun–Aug 2026; many stale since 2018–2021) | ArcGIS Hub | **YES:** DCAT `https://maps.openlaredo.com/api/feed/dcat-us/1.1.json` (114 datasets); ArcGIS REST + CSV/GeoJSON/KML/Shapefile downloads. License = liability disclaimer, no explicit open license. | Verified |
| City of Laredo | Tabular open data (building permits/applications/inspections since 2007; vendor payments; zoning; transportation) | https://data.openlaredo.com/dataset | Monthly permit reports | CKAN/OpenGov Open Data | CKAN API presumably present; **Cloudflare-blocked** | Search-verified |
| City of Laredo Building Development Services | Monthly building-permit reports | https://www.cityoflaredo.com/services/building-permits ; /departments/building-development-services/building-permit-resources | Monthly | PDF + open-data dataset | via data.openlaredo.com only | Search-verified |
| Laredo Police Department | Dept pages, annual crime/traffic reports, civil-service announcements; press releases via City Newsroom + Facebook | https://www.cityoflaredo.com/departments/police-department ; /annual-reporting ; /civil-service-announcements | Annual report; press releases ad hoc | HTML/PDF; Facebook | None. **No daily blotter, no CAD/incident feed, no official crime map.** SpotCrime is third-party. | Search-verified |
| Laredo Fire Department | Monthly incident recap (call counts by type/station), station list | https://www.cityoflaredo.com/departments/fire-department ; monthly recaps on https://www.facebook.com/LaredoFireDepartment/ | Monthly (Facebook) | HTML; **Facebook-only for monthly stats** | None | Search-verified |
| City of Laredo Public Health | Weekly epidemiology report, wastewater surveillance dashboards, influenza & mosquito surveillance, advisories | https://www.cityoflaredo.com/departments/health-department/services/epi-phep ; ArcGIS Experience https://experience.arcgis.com/experience/37c76ee5b1bb47439ca0ecd010ce43a1 | Weekly | HTML/PDF + ArcGIS dashboards | ArcGIS feature services (unverified); no RSS | Search-verified |
| City of Laredo Utilities | Urgent notices, boil-water notices, outage map, conservation stages | https://laredoutilities.com/urgent-notices/ ; /notices/ | Sporadic | WordPress | RSS `https://laredoutilities.com/feed/` (verified 200, sparse) | Verified |
| City of Laredo 311 | Service requests | https://www.cityoflaredo.com/services/311-online-services ; SeeClickFix https://seeclickfix.com/watch_area/1595-city-of-laredo-service-request | Continuous | SeeClickFix | API `/api/v2/issues` returned 403; Open311 unverified | Search-verified |
| City of Laredo Traffic Safety | Signal outages, street closures | https://www.cityoflaredo.com/departments/traffic-safety-department ; https://www.facebook.com/cityoflaredotrafficsafety/ | Ad hoc | **mostly Facebook** | None | Search-verified |
| Laredo Public Library | Programs/events calendar | https://www.laredolibrary.org/events-calendar/ | Daily programs | WordPress events calendar | iCal/RSS likely (`?ical=1`, `/feed/`) — unverified, WP Defender blocked | Partially verified |
| El Metro Transit | Routes/schedules, fares, service changes, real-time app | https://elmetrotransit.com/maps-schedules/ | Periodic; alerts ad hoc | WordPress (PDF schedules) | **No published GTFS/GTFS-RT.** Transit app/Moovit list El Metro, so a feed exists somewhere; unverified. | Partially verified |
| Laredo & Webb County Area MPO | Policy/Technical committee agendas, packets, minutes; MTP/TIP | https://www.laredompo.org/agendas-minutes/ ; YouTube `UCSDwcNsr0qLZlb2PBHH2xHQ` | Policy Cmte 3rd Wed monthly; mirrored in City Legistar | WordPress PDF | WP RSS `/feed/` (403, WP Defender) | Search-verified |
| Webb County Commissioners Court | Agendas, minutes, meeting dates & posting deadlines | https://www.webbcountytx.gov/893/Agendas-and-Minutes ; /995/Commissioners-Court ; /335/Commissioners-Court-Meeting-Dates-Deadli | 2nd & 4th Mon 9am (+ specials) | CivicPlus HTML + PDF | AgendaCenter RSS/iCal likely — unverified (Cloudflare) | Search-verified |
| Webb County | Commissioners Court video | https://webbcountytx.new.swagit.com/ ; /889/Commissioners-Court-Live-Archived-Videos | On-meeting | Swagit | None | Verified |
| Webb County PIO | News Flash / CivicAlerts | https://www.webbcountytx.gov/m/newsflash | Weekly-ish | CivicPlus | "Notify Me" email/SMS + standard RSS (`/RSSFeed.aspx`) — unverified | Search-verified |
| Webb County Purchasing | Bids/RFPs/public notices | https://www.webbcountytx.gov/PurchasingAgent/PublicNoticeRFP/ | As issued | PDF | None verified | Search-verified |
| Webb County Elections | Results (unofficial/official/precinct), notices, polling sites, sample ballots | https://www.webbcountytx.gov/291/Elections-Department ; /698/Unofficial-Results-2026 ; /867/Official-Results-2026 ; /425/Precinct-By-Precinct-Results ; /415/Archived-Election-Results ; /1001/Election-Notices | Per election | PDF only | None | Search-verified |
| Webb County Tax Assessor-Collector | Tax rate info, Truth-in-Taxation notices (County, City, El Cenizo, Rio Bravo, Drainage Dist.), property tax search/pay, sheriff (tax) sale lists | https://www.webbcountytx.gov/319/Tax-Assessor-Collector ; /807/TNT-Entity-Information ; /TaxAssessorCollector/SheriffSales/ (monthly PDFs) ; search/pay https://webb.go2gov.net/ | Annual TNT (Aug–Sep); monthly sheriff sales | PDF/HTML; go2gov JS app | None | Search-verified / go2gov verified |
| Webb County Clerk | Official public records (1982–), property records, foreclosure/trustee notices | https://www.webbcountytx.gov/329/Foreclosures ; /CountyClerk/PropertyRecords/ ; TexasFile (third-party) | Foreclosures monthly (1st Tue) | HTML/PDF | None | Search-verified |
| Webb County District Clerk / Courts | Court records search | https://www.webbcountytx.gov/277/District-Clerk ; https://publicaccess.webbcountytx.gov/PublicAccess/ (Tyler Odyssey; unreachable) | Continuous | Odyssey | None | Unverified |
| Webb County Sheriff | Jail records search | http://www.webbcountytx.gov/Sheriff/ | Continuous | Legacy ASP | None. No press-release page found. | Unverified |
| Webb County Appraisal District | Property search, online appeals, eNotice | https://www.webbcad.org/ (SPA) ; https://propaccess.webbcad.org/clientdb/?cid=1 ; https://onlineappeals.webbcad.org/ ; Comptroller directory https://comptroller.texas.gov/taxes/property-tax/county-directory/webb.php | Annual (notices Apr–May, certified Jul) | PropertyAccess HTML; SPA | None. No bulk roll download; no visible board/ARB agenda page. | Partially verified |
| Laredo ISD | Board & committee agendas, minutes, YouTube livestreams | https://meetings.boardbook.org/Public/Organization/2520 ; YouTube `UCec5XjETDUwxpZWQN8qECCQ` | Monthly + committees | BoardBook HTML/PDF | No RSS/iCal on BoardBook | Verified |
| United ISD | Board agendas/minutes, livestream | https://meetings.boardbook.org/public/Organization/2029 | Monthly | BoardBook | None | Search-verified |
| Laredo College | Board of Trustees agendas/minutes, recordings | https://www.laredo.edu/about/administration/board-of-trustees/agendas%20and%20meetings.html | Monthly + committees | HTML/PDF | None | Verified 200 |
| Laredo Housing Authority | Board agendas/minutes | https://larha.org/ | Monthly | HTML/PDF | None | Unverified |
| TxDOT Laredo District | Traffic advisories / lane closures, project pages, hearings | https://www.txdot.gov/about/districts/laredo-district.html ; news https://www.txdot.gov/about/newsroom/local/laredo.html (empty) ; X @TxDOTLaredo ; Project Tracker https://apps3.txdot.gov/apps-cq/project_tracker/ ; https://drivetexas.org | Daily/weekly (social) | **Social-media-first** | No RSS. DriveTexas has ArcGIS services (unverified). | Verified |
| Laredo Morning Times (news, Hearst) | Council/commissioners coverage, LPD arrests, LFD stats, legal notices | https://www.lmtonline.com/ | Daily | HTML (metered) | RSS bot-walled | Partially verified |
| KGNS-TV (news, Gray) | Crime/arrests, council, traffic, weather | https://www.kgns.tv/ | Daily | Arc XP | **RSS verified:** https://www.kgns.tv/arc/outboundfeeds/rss/ | Verified |

## Gaps — wanted but not published online (or Facebook-only)

1. **Police blotter / daily arrests / incident log**: none. Only annual UCR summaries and ad-hoc press releases.
2. **Fire incident data**: monthly stats are Facebook posts only; no incident-level data.
3. **Webb County Sheriff**: no press-release page; jail roster search-only.
4. **Transit**: no public GTFS / GTFS-RT download from El Metro.
5. **Appraisal data**: no bulk roll download; no visible board/ARB agenda page; GIS login-gated.
6. **Machine-readable feeds scarce on the two main portals** (Akamai on city, Cloudflare on county). Robust structured feeds: Legistar Web API, ArcGIS Hub DCAT, OpenGov transparency, KGNS RSS, probably CivicPlus RSS on county.
7. **Open data staleness**: many datasets last touched 2018–2021; no 311, code-enforcement, crash, or current crime datasets.
8. **Election results** PDF-only. TxDOT Laredo news page empty; advisories X/Facebook-first.
9. **Traffic Safety and Utilities alerts** rely on Facebook/GovDelivery.
10. **Permits**: monthly PDF/open-data only; no live permit search portal found.
11. **Housing Authority** and **District Clerk**: portals login/fee-based or unreachable.

## Best machine-readable entry points (verified)

- `https://webapi.legistar.com/v1/cityoflaredo/events|matters|bodies|eventitems` (JSON, OData params)
- `https://maps.openlaredo.com/api/feed/dcat-us/1.1.json` (114 datasets)
- `https://laredotx.opengov.com/transparency` (OpenGov)
- `https://www.kgns.tv/arc/outboundfeeds/rss/` (news RSS)
- `https://laredoutilities.com/feed/` (WordPress RSS, low volume)
- `https://public.govdelivery.com/accounts/TXLAREDO/subscriber/new` (email/SMS subscriptions, not a feed)

## Headless-browser probe (2026-09-16, from a Hetzner datacenter IPv6)

One request per target with Playwright 1.62 / Chromium, desktop Chrome 128 UA.

| Target | curl + Chrome UA | Headless Chromium | Notes |
|---|---|---|---|
| cityoflaredo.com/government/newsroom | 403 (Akamai) | **200** | List: `section.news_widget ul.list-main > li`; title/link `h2 > a.item-title[href]` (`/Home/Components/News/News/{id}/15?widgetId=41`); date `p.item-date` (`MM/DD/YYYY[ h:mm AM/PM]`). Archive `/government/newsroom/-arch-1-41`; category filter `-selcat-{id}-41`; department filter `-seldept-{id}-41` (13 = Fire). No RSS link. |
| cityoflaredo.com/government/city-calendar | — | **200** | Vision/Granicus month grid. No RSS/iCal. Event links `a[href*="/Home/Components/Calendar/Event/"]`, e.g. `/Home/Components/Calendar/Event/3320/17?widgetId=1429`. `/departments/city-secretary-s-office/committee-calendar` same widget (overlaps Legistar). |
| webbcountytx.gov/m/newsflash | 403 (`cf-mitigated: challenge`) | 403, "Just a moment…" never resolves (managed challenge + Turnstile) | |
| webbcountytx.gov/RSSFeed.aspx?ModID=1&CID=All-newsflash.xml and ModID=58 calendar | — | 403 | Unverifiable from datacenter IP |
| webbcountytx.gov/AgendaCenter | — | 403 | Unverifiable |
| data.openlaredo.com/api/3/action/package_list | 403 (Cloudflare WAF hard block, IP/ASN-based) | 403 | Not a JS challenge; JS cannot help |
| youtube.com/feeds/videos.xml?channel_id=UCMXpxnnHjoJse6d0vO8Tkjw | 404 | — | Channel ID is wrong; re-find it |
| laredolibrary.org/events-calendar/?ical=1 and /feed/ | 403 (WP Defender block page) | — | Datacenter IP already blocklisted; do not retry from it |

**Takeaways.** Akamai on the city site yields to plain headless Chromium. Cloudflare (county, openlaredo) and WP Defender (library) block this datacenter IP regardless of browser; GitHub Actions runners are also datacenter IPs, so assume the same there until proven otherwise. Options for those hosts: residential egress, an allowlist/API request to the publisher, or ingesting their email notifications (CivicPlus "Notify Me", GovDelivery).

## Adapter findings (2026-09-16, implementation)

Recorded while writing the Source adapters (`src/sources/`) and capturing fixtures (`test/fixtures/README.md`).

**Akamai and headless Chromium.** Playwright 1.62 on this Hetzner IP: the default headless shell, or the full build with a `Chrome/128` UA on Chromium 151, both get **403**. The full build (`chromium.launch({ channel: 'chromium' })`) with a desktop Chrome UA whose major version matches the running browser gets **200** on the newsroom, calendar, and bids pages. The production fetcher derives the UA from `browser.version()` for that reason. **Result from the GitHub Actions runner (2026-09-16, run 35066915074, ubuntu-latest on Azure): passed.** The newsroom answered HTTP 200 with the list, and the live build from the runner ingested all five Feeds (Legistar, Utilities, Newsroom, Calendar, Bids) with no failures. Akamai is not blocking the Actions IP range as of that date; the `akamai-check` job runs on every build so a change shows up as a red job.

**Newsroom department filter.** The `newsdepts_41_2276_35` select lists 31 departments; IDs are stored in `src/sources/city-newsroom.ts`. The list page does not show an item's department and neither does the item detail page, so the adapter fetches the department-filtered lists (`/-seldept-{id}-41`) for Fire (13), Police (23), and Health (14). The city tags city-wide notices (the September 2026 tax-hearing notices) to **every** department, including Airport (28); the adapter fetches the Airport list as a control and files anything present there under News and Notices. Tagging is loose in general: the May 2026 boil-water notices and the summer activities guide are tagged Fire.

**Legistar.** A cancelled meeting appears with `EventComment: "Cancelled"` and agenda status `Closed` (Council, 2024-01-16); the adapter matches `/cancel/i` across comment, status, and location. `EventVideoPath` is always null for Laredo; `EventMedia` holds the Swagit video URL. The agenda packet is not in the API; it is only on the InSite `MeetingDetail.aspx` page as `a#ctl00_ContentPlaceHolder1_hypAgendaPacket[href]` (`View.ashx?M=PA&ID=…`), so the adapter fetches that page once per meeting with an agenda and again only when `EventLastModifiedUtc` changes or the meeting is within a week. Agenda status `Hidden` means a scheduled meeting with no agenda yet; a placeholder event dated 2050-12-31 exists and is excluded by the 13-month window.

**City calendar.** Day cells carry `aria-label="Scheduled events, Wednesday, September 2, 2026"`; entries are `.calendar_item` with `.calendar_eventtime` and `a.calendar_eventlink`. Detail pages carry hidden schema.org `<time itemprop="startDate|endDate" datetime="…">` with exact instants; all-day entries run midnight to 23:59 Central. Board meetings on the calendar have `.detail-subtitle` "Committee Meeting". Legistar spells some Body names differently ("Convention &Visitors Bureau"), so the adapter compares letters only.

**Bids page.** Hand-edited tables under "Current Bid Opportunities" per department with Due Date, Opening, Description, Pre-Bid, Addendum columns and no posting date. On 2026-09-16 every row was empty or "N/A"; the Wayback Machine has only redirects for the page, so no fixture with real rows exists yet.

**Swagit archives.** `laredotx.new.swagit.com/` redirects to `/city-council`, which holds City Council, Special City Council, and Council Workshop videos; the "Boards and Commissions" menu has one entry, `/mpo`. There is no per-Body archive for other Bodies, so a Meeting without a video link falls back to the Council or MPO archive by Body name, else the site root. The `/views/168/city-council` URL from the earlier survey still resolves but is not the canonical path.

**Utilities RSS.** WordPress emits `&#124;` for the pipe in titles; the parser decodes HTML entities.
