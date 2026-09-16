# 13: Title search across all time

**What to build:** A search page where a resident types a few words and sees matching Items from everything the site has ever recorded, not just the 90-day window, each linking to the Publisher. Search runs in the browser from a small index the build writes; no server.

**Blocked by:** 02 (Bilingual interface)

**Status:** resolved

- [x] Build writes a search index of Item title, date, Topic, Publisher, and link for every Item in the data file
- [x] Search page works without a server, in both languages, and degrades to a plain list of recent Items without JavaScript
- [x] Results show Item date, Publisher, Topic, and link
- [x] Test through the seam: an Item older than 90 days is absent from the home page but present in the index

## Comments

2026-09-16: Done. Index at `/search-index.json`; the page's inline script is first-party and the `<noscript>` block lists the 50 most recent Items.
