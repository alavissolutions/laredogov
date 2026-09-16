# Laredo Gov: one place for what Laredo-area governments publish

Status: ready-for-agent
Date: 2026-09-16
Vocabulary: `/CONTEXT.md`. Decisions: `/docs/adr/0001` to `0004`. Source facts and probe results: `/docs/research/laredo-public-sources.md`.

## Problem Statement

I live in Laredo, Texas. The city, the county, the appraisal district, and their departments publish agendas, minutes, press releases, notices, events, tax information, and public-safety announcements for free, but across a dozen websites with different layouts, some of which only post on Facebook. To know what is happening this week I have to remember every site, navigate each one, and still miss things. Most residents never bother.

## Solution

One website that checks every government Source twice a day and shows, in a single place, what is coming up and what was just posted, filed under plain-language Topics, with a link to the official document. Where a government only offers a search tool (property records, tax bills), or blocks automated access, the site tells you exactly where to go and what you need. The site is static, free to run, bilingual, and open source, so anyone can take it over or copy it for another town.

## User Stories

### Finding what's happening

1. As a Laredo resident, I want a home page that shows Meetings and Events in the next 14 days, so that I know what I can attend this week.
2. As a Laredo resident, I want the same page to show Items posted in the last 90 days, newest first, so that I catch notices I would otherwise miss.
3. As a Laredo resident, I want each Item to show its Publisher, its date, and its Topic, so that I can tell at a glance who said it and what it's about.
4. As a Laredo resident, I want every Item to link to the Publisher's own page, so that I read the official version and not a copy.
5. As a Laredo resident, I want to open a Topic and see only its Items, so that I can follow just Public Safety or just Taxes and Property.
6. As a Laredo resident, I want to search Item titles across everything the site has ever recorded, so that I can find "the boil-water notice from last spring."
7. As a Laredo resident, I want the Coming up panel to say when a Meeting has been cancelled, so that I do not show up to an empty room.

### Meetings

8. As a Laredo resident, I want a page for each City Council Meeting showing its date, time, and Body, so that I can plan to attend or watch.
9. As a Laredo resident, I want the Meeting page to show the agenda as soon as it is posted, so that I know what will be discussed before the Meeting.
10. As a Laredo resident, I want the Meeting page to show the agenda packet, minutes, and video as each becomes available, so that I can follow up after the Meeting without hunting.
11. As a Laredo resident, I want the New panel to show a line when an agenda, minutes, or video attaches to a Meeting, so that I learn about it without revisiting the Meeting page.
12. As a Laredo resident, I want Meetings for every Body, not only City Council, so that Planning and Zoning or the Ethics Commission are as visible as council.
13. As a Laredo resident, I want City Council shown first by default among Bodies, so that the most consequential Meetings are not buried under sixty boards.
14. As a Laredo resident, I want to filter Meetings by Body, so that I can follow just the board that affects me.

### Directory

15. As a homeowner, I want a Directory entry for the appraisal district's property search that says what I can find and what I need to search with, so that I can look up my appraisal without guessing.
16. As a homeowner, I want a Directory entry for tax bill search and payment, so that I know where to pay and what account number to use.
17. As a Laredo resident, I want the Directory to list every known Source and Lookup grouped by Publisher, so that I have one map of where the government puts things.
18. As a Laredo resident, I want each Directory entry to say how often it updates and when the site last verified the entry, so that I can judge whether the description is still accurate.
19. As a Laredo resident, I want the Directory to say plainly when a Publisher posts only on Facebook or X, so that I know to look there and understand why the site cannot show it.
20. As a Laredo resident, I want the Directory to include Webb County entries even though the site cannot ingest them yet, so that county information is one click away instead of absent.
21. As a Laredo resident, I want each Feed in the Directory to show when it was last checked and when it last produced a new Item, so that I know whether what I'm seeing is current.
22. As a Laredo resident, I want a visible warning on any Source the site has not been able to reach in 7 days, so that I do not mistake a broken Source for a quiet one.

### Subscribing

23. As a Laredo resident, I want an RSS feed per Topic, so that I can follow one Topic in my feed reader.
24. As a Laredo resident, I want a single RSS feed of everything, so that I can follow the whole site in one subscription.
25. As a Laredo resident, I want RSS entries to link to the Publisher's page and carry the Publisher's date, so that my reader shows them in the right order and sends me to the source.

### Language

26. As a Spanish-speaking resident, I want the site's navigation, labels, Topic names, and Directory descriptions in Spanish, so that I can use the site comfortably.
27. As a Spanish-speaking resident, I want to switch language and keep my place on the same page, so that switching does not lose what I was looking at.
28. As any resident, I want Item titles left in the language the Publisher used, so that the site never mistranslates an official notice.

### Trust and access

29. As a Laredo resident, I want the site to say clearly that it is unofficial and links to official sources, so that I know its standing.
30. As a Laredo resident, I want the site to work on my phone with no horizontal scrolling, so that I can check it anywhere.
31. As a resident using a screen reader, I want pages with proper headings, labels, and link text, so that I can navigate them.
32. As a privacy-conscious resident, I want no trackers, cookies, or analytics, so that reading public information does not mean being watched.
33. As a Laredo resident, I want the site to show an Item's last-seen-live date when a link is broken, so that a dead link tells me something rather than nothing.

### Owner and maintainer

34. As the owner, I want the whole site to rebuild from a scheduled job on free hosting, so that it costs nothing and needs no server.
35. As the owner, I want every ingested Item recorded in a committed data file, so that the history lives in git and nothing depends on a database.
36. As the owner, I want a failed Source to be recorded rather than to fail the whole build, so that one redesigned website does not take the site down.
37. As the owner, I want adding a new Source to mean writing one adapter and one Topic rule, so that expanding coverage is a small, repeatable job.
38. As the owner, I want the fetcher to identify the project and a contact address in its user agent and to make one polite request per page, so that Publishers have no reason to block it.
39. As the owner, I want the build to verify at the start that the city site answers from the scheduler's IP, so that I learn about a block from the log, not from a silent empty site.
40. As the owner, I want Spanish interface strings in one reviewable file, so that I can check them before launch.
41. As the owner, I want the project under an MIT license with a README that explains how to run it, so that I can hand it off or someone can fork it for another city.
42. As a future contributor, I want a glossary and decision records in the repo, so that I understand why things are shaped the way they are before I "fix" them.
43. As the owner, I want a way to run the build locally against recorded fixtures instead of live sites, so that I can develop and test without hammering Publishers.

## Implementation Decisions

### Shape

- **Two stages, one data file.** Stage one, *ingest*, reads every Feed and updates a committed data file of Items and Meetings. Stage two, *render*, reads that file and writes the static site, RSS feeds, and search index. Nothing runs between builds (ADR-0002).
- **The data file is the system of record.** It holds every Item and Meeting ever ingested plus per-Source health (last checked, last success, last new Item, last error). Render shows a 90-day window; search and RSS draw from the same file.
- **Link only.** An Item stores title, the Publisher's date, the official URL, Topic, Publisher, Source, first-seen date, and last-seen-live date. No document bodies are stored (ADR-0001).
- **Source adapters.** Each Source is an adapter with the same contract: given a fetcher, return Items (and, for Meeting Sources, Meetings with attached documents). Each adapter declares its Publisher, its Topic rule, its cadence, and its Directory description. Adding a Source means adding one adapter.
- **Fetcher is injected.** Adapters receive a fetcher rather than calling the network. The production fetcher uses plain HTTP where it works and headless Chromium for the city's Akamai-fronted pages. The test fetcher serves recorded fixtures. This is the one seam (see Testing Decisions).
- **Topic by rule, never by guessing** (ADR-0004). The Newsroom adapter maps department to Topic: Police and Fire to Public Safety, Health to Health, otherwise News and Notices. Department IDs are enumerated from the newsroom's filter once and stored with the adapter.
- **One Source per document type per Publisher** (ADR-0004). Legistar owns every Meeting. The city calendar adapter ignores entries that are a Body's Meeting. No duplicate merging exists.
- **Meeting identity** is the Legistar event ID. Documents (agenda, packet, minutes, video) attach to the Meeting; a new attachment produces a stream line in the New panel referencing the Meeting.
- **Cancelled Meetings** stay in the data file and render with a cancelled state.
- **Video** comes from the Legistar event's video field when present, otherwise the Meeting links the Swagit archive page for that Body. The YouTube channel ID from the survey is wrong and is not used.

### Sources at launch

Feeds: Legistar Web API for every city Body; City Newsroom; City Calendar (non-Meeting Events only); City Bids page; Laredo Utilities RSS. Directory-only: everything under Webb County, Webb CAD, city budget and OpenGov, open GIS data, permits, health epidemiology, library calendar, El Metro, MPO, LISD, UISD, Laredo College, housing authority, TxDOT Laredo, NEOGOV jobs, Municode. Facebook-only Publishers get entries stating that (ADR-0003).

### Site

- Home: Coming up (next 14 days of Meetings and Events) and New (last 90 days of Items).
- Meeting pages, Topic pages, Directory page, search page, about page.
- RSS: one per Topic plus one for everything, using the Publisher's date.
- Search: client-side over Item titles for all time, from a small generated index.
- Bilingual: every interface string lives in one strings file with English and Spanish; language is a URL prefix so a switch keeps the current page. Spanish is machine-drafted and owner-reviewed.
- No analytics, no cookies, no third-party scripts.
- Accessible, mobile-first, no horizontal scroll.

### Platform

TypeScript on Node. GitHub Pages for hosting, GitHub Actions cron twice daily for the job, which commits the data file (keeping the schedule alive). Custom domain, MIT license. Fetcher user agent names the project and a contact address; one request per page; no retry loops.

### Phase two (agreed, not in this spec)

Webb County and other datacenter-blocked hosts: owner requests feed access or an allowlist; failing a reply within a month, add an email-ingest Feed that reads a dedicated mailbox subscribed to CivicPlus "Notify Me" and GovDelivery. The city moves to the same approach if Akamai starts blocking the scheduler.

## Testing Decisions

- **One seam: the build, with the fetcher swapped.** Tests run the full build (ingest then render) against a fixture fetcher that serves recorded responses from the real Sources, into a temporary output directory, then assert on the outputs: the data file, the rendered HTML, the RSS files, and the search index. No adapter, renderer, or Topic rule is tested in isolation.
- **A good test** describes what a resident or the owner sees: "after ingesting the recorded newsroom page, the New panel lists the tax hearing notice under Taxes and Property with a link to the city's page." It never asserts on internal function calls, intermediate structures, or the order of adapter execution.
- **Fixtures are real.** Each Source has one recorded response captured once from the live site (through the production fetcher, politely), checked in, and refreshed only when the Source changes shape. Tests never touch the network.
- **Scenarios to cover through the seam:** first-ever build from empty data; a second build where one Source has new Items and the rest are unchanged; a Source that fails to fetch (health recorded, build succeeds, warning rendered after 7 days); a Meeting gaining minutes between builds (stream line appears); a cancelled Meeting; a calendar entry that is a Body's Meeting (skipped); newsroom department mapping to Topics; the 90-day window boundary; RSS per Topic and for everything; Spanish and English rendering of the same page; search index containing Items older than 90 days.
- **Prior art:** none in the repo. This is the first code.
- **Live smoke check, outside the test suite:** a separate job step fetches the newsroom once from the Actions runner and fails loudly if blocked (user story 39).

## Out of Scope

- Ingesting property, tax, or appraisal data; Lookups are linked, never ingested.
- Individual police or fire incident reports (none are published) or any blotter.
- Local news media as Feeds (ADR-0003).
- Fetching anything from Facebook or X (ADR-0003).
- Legistar matters (ordinances, resolutions) as Items; they need their own model.
- Keyword or machine-learning classification of Items (ADR-0004).
- Cross-Source duplicate detection or merging (ADR-0004).
- Accounts, email digests, keyword alerts, push notifications.
- Council-district or neighborhood filtering.
- Translating Item content.
- Analytics.
- Any always-on server or database (ADR-0002).
- Webb County, library, and openlaredo data portal as Feeds (phase two).
- Full-text search over documents.

## Further Notes

- **Human actions before launch:** pick and buy the domain (avoid names implying city endorsement); send the county access request; review the Spanish strings file.
- **First build step is the Akamai check.** The headless pass in the probe came from a Hetzner IP; GitHub Actions runs on Azure and may be treated differently. If blocked, the city Newsroom, Calendar, and Bids drop to Directory-only and the email-ingest approach moves up.
- **Do not re-probe blocked hosts from datacenter IPs.** WP Defender on the library site deepens its lockout on repeat attempts.
- **Newsroom department IDs** are only partly known (13 is Fire); enumerate the filter's options during adapter work and store the mapping with the adapter.
- **Open GIS data** has a real machine-readable catalog but is not resident-facing; it stays a Directory entry.
