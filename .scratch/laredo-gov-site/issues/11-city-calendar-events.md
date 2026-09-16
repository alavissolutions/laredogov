# 11: City Calendar Events Feed

**What to build:** City Events such as clinics, festivals, and town halls appear under Coming up beside Meetings, filed under the Events Topic. The adapter reads the city's calendar month grid through the headless fetcher and follows each entry's detail link for date, time, place, and description. Any calendar entry that is a Body's Meeting is skipped, since Legistar owns Meetings.

**Blocked by:** 04 (Headless fetcher and the Akamai check), 06 (Legistar Meetings)

**Status:** resolved

- [x] Adapter yields Events with title, start date and time, place, and official link for the current and next month
- [x] Entries matching a known Body's Meeting (by Body name and date) are skipped and counted in the run log
- [x] Coming up panel interleaves Events and Meetings by date
- [x] Events are filed under the Events Topic and appear in its RSS
- [x] Test through the seam: fixture with one P&Z meeting entry and one health clinic yields one Event and no duplicate Meeting

## Comments

2026-09-16: Done. Skips by Body name (letters only, prefix allowed) and by the detail page's "Committee Meeting" subtitle; count is in the run log. Detail pages are fetched once per new entry.

2026-09-16, after review: the subtitle rule now matches only committee, board, commission, or council meetings so a "Town Hall Meeting" stays an Event; the exclusion rule is recorded in ADR-0004. Events also appear in New, ordered by when the site first saw them, so a resident hears about an Event as soon as the city posts it, not two weeks before it happens.
