# 06: Legistar Meetings, the Coming up panel, and Meeting pages

**What to build:** The home page shows Meetings for the next 14 days under Coming up, and each Meeting has its own page with date, time, Body, and cancellation state. The Legistar adapter reads the city's Legistar Web API for every Body, yielding Meetings keyed by Legistar event ID and Bodies keyed by Legistar body ID. City Council is listed first; a Body filter narrows the list. Cancelled Meetings remain visible and say so.

**Blocked by:** 02 (Bilingual interface)

**Status:** resolved

- [x] Legistar adapter yields Meetings and Bodies from recorded API fixtures; Meetings are filed under the Meetings Topic
- [x] Coming up panel shows Meetings in the next 14 days, soonest first, City Council first among same-day Meetings
- [x] Meeting page shows date, time, Body, location if given, and a cancelled state
- [x] Bodies list with City Council first; filtering by Body shows only that Body's Meetings
- [x] A Body with no Meeting in the last 12 months is hidden from the filter but its Meetings are still ingested
- [x] Test through the seam: fixture with a future Council Meeting, a future P&Z Meeting, and a cancelled Meeting renders the expected panel and pages

## Comments

2026-09-16: Done. Cancellation is detected from `EventComment` (the real form is "Cancelled" with agenda status Closed); the test uses the real 2024 window that contains one. The Body filter is one static page per Body under `/meetings/body/<id>/`.
