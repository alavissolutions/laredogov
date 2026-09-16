# 08: The Directory of Sources and Lookups

**What to build:** A Directory page lists every known Source and Lookup grouped by Publisher, with a plain-language paragraph on what is there, what you search with for a Lookup, how often it updates, and a last-verified date. Every Publisher in the research doc is present, including all of Webb County and Webb CAD as Directory-only entries. Publishers that post only on Facebook or X are listed with that stated. Directory entries are data declared alongside adapters (for Feeds) or in a Lookups list (for everything else), in both languages.

**Blocked by:** 02 (Bilingual interface)

**Status:** resolved

- [x] Every Source and Lookup from the research doc has an entry with Publisher, description, cadence, last-verified date, and link
- [x] Feeds the site ingests are marked as such; Directory-only entries say the site links but does not ingest
- [x] Facebook-only Publishers carry a visible "posts only on Facebook" or "on X" note
- [x] Grouped by Publisher, with City of Laredo, Webb County, and Webb CAD first
- [x] Descriptions exist in both languages via the strings file
- [x] Test through the seam: the Directory renders every declared entry and the Webb CAD property search entry says what to search with

## Comments

2026-09-16: Done. 37 entries: 5 Feeds from the adapters plus 32 Directory-only entries in `src/directory/entries.ts`.
