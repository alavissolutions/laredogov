# 10: City Newsroom Feed with department-to-Topic mapping

**What to build:** City press releases and notices appear under New, filed by the department the city posted them under: Police and Fire to Public Safety, Health to Health, everything else to News and Notices. The adapter reads the Newsroom list through the headless fetcher, and the department mapping is stored with the adapter after enumerating the Newsroom's department filter once.

**Blocked by:** 04 (Headless fetcher and the Akamai check), 05 (Topics, Topic pages, and per-Topic RSS)

**Status:** resolved

- [x] Adapter reads title, Publisher's date, and link from the Newsroom list, plus department where the page exposes it
- [x] Department IDs enumerated once and recorded with the adapter, with the Topic each maps to
- [x] Items with an unmapped department fall back to News and Notices
- [x] Items filed under Public Safety show why ("posted by the city under Fire Department") on the Item
- [x] Test through the seam: recorded Newsroom fixture yields the tax hearing notice under News and Notices and a Fire item under Public Safety

## Comments

2026-09-16: Done, with one wrinkle recorded in the research doc: the city tags city-wide notices to every department, so the adapter also fetches the Airport list as a control and files anything present there under News and Notices. The test's Fire Item is a real May 2026 boil-water notice from the archive list, because the current list holds no Fire-only Item.
