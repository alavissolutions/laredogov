# 01: Election page from the city's general election page

**What to build:** A resident opens the Elections Topic, sees the 2026 General Election listed, and opens an Election page in English or Spanish showing the city's calendar (filing deadlines, registration deadline, early voting, election day, ballot-by-mail dates), the election notices, the early voting and election day site links, and the outside links grouped by their Publisher (Webb County, Texas Secretary of State). Election notices and voting-site PDFs appear in the New panel and the Elections RSS dated by the city's own date. The Directory lists the city election pages Source with its cadence. This ticket introduces the Election record and its section of the data file.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Fixture recorded for the general election page through the headless fetcher
- [x] Election page renders at the spec's URL in both languages with calendar, notices, voting sites, and outside links
- [x] Notices appear in the Elections Topic page and RSS with the city's dates; a second unchanged build adds none
- [x] Elections Topic page lists the Election at the top
- [x] Directory entry in both languages
- [x] Forum schedule entries render with a date and no link when the city has no href

## Comments

**2026-09-17, implementer:** Built as `src/sources/city-elections.ts` plus `src/render/elections.ts`; the
Election record, `DataFile.elections`, and `Item.election` are new. Notes on the two judgement calls the
ticket left open:

- **Dating the voting-site PDFs.** The city prints a date beside every notice but none beside the Early
  Voting Sites and Election Day Sites buttons, and the ticket asks for both in the New panel "dated by the
  city's own date". The city's own document links carry a `<ticks>` cache-buster that is a .NET timestamp of
  when its CMS published the document: for the early-voting list it reads 2026-09-02, and the city's own
  filename for that document is `EV Sites 090226.pdf`. Identity still drops the ticks (issue 02); they are
  read only as a publish stamp, and a voting-site link without usable ticks stays a link and becomes no Item.
- **The forum schedule** lives on the candidates sub-page under the city's own FORUMS heading, not on the
  election page, so this adapter reads both pages. Issue 02 extends the same fetch with the Race tables.

Also added: `texas-sos` as a Publisher (the outside links group needs a name for it) and
`CAMPAIGN_FINANCE_URL` in `test/fixtures/fetcher.ts`, which issue 05 should move onto its adapter.
