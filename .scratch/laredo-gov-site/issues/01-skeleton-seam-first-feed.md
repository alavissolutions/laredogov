# 01: Project skeleton, the build seam, and the first Feed

**What to build:** Running the build against recorded fixtures produces a working site whose home page lists the Laredo Utilities notices under New, newest first, each linking to the utility's own page, with an "everything" RSS feed alongside. This ticket lays down everything later slices build on: the TypeScript project, MIT license, README, the build command with an injected fetcher and output directory, the committed data file (Items with title, Publisher's date, official URL, Topic, Publisher, Source, first-seen, last-seen-live; per-Source health slots), the Source adapter contract, the site layout with the "unofficial, links to official sources" notice, and the first test through the seam.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `build` takes a fetcher and an output directory; the production fetcher does plain HTTP with a user agent naming the project and a contact address, one request per page, no retry loops
- [x] Laredo Utilities RSS adapter yields Items filed under News and Notices
- [x] A second build with an unchanged fixture adds no duplicate Items and updates last-seen-live
- [x] Home page shows the New panel (last 90 days, newest first) with Publisher, date, Topic, and link per Item
- [x] An "everything" RSS feed is written using the Publisher's date and official URL
- [x] Layout is mobile-first with no horizontal scroll, proper headings and link text, no third-party scripts, cookies, or analytics
- [x] Test through the seam: empty data plus utilities fixture yields the expected data file, home page, and RSS
- [x] README explains how to run the build locally against fixtures; MIT license present

## Comments

2026-09-16: Done. `src/build.ts` is the seam (`build({ fetcher, outDir, dataFile, now })`); `test/01-skeleton-first-feed.test.ts` covers the first build, the rebuild, the RSS, and the layout. Phone-width check with headless Chromium: no horizontal scroll at 375px.
