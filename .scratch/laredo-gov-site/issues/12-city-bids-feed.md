# 12: City Bids Feed

**What to build:** New city bid and RFP postings appear under New, filed under Jobs and Bids, each linking to the city's bids page entry. The adapter reads the bids page through the headless fetcher.

**Blocked by:** 04 (Headless fetcher and the Akamai check), 05 (Topics, Topic pages, and per-Topic RSS)

**Status:** resolved

- [x] Adapter yields Items with title, posting date, and official link
- [x] Items filed under Jobs and Bids and present in its RSS
- [x] Test through the seam: recorded bids fixture yields the expected Items; a second unchanged build adds none

## Comments

2026-09-16: Done as far as the Source allows. The page shows no posting date, so the Item date is first-seen (said in the Directory description). On the capture date the city listed no open bids and the Wayback Machine has no usable snapshot, so the row parser is exercised only against empty and "N/A" rows; refresh the fixture and extend the test when a bid is posted.
