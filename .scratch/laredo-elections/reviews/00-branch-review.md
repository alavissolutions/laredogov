# Branch review: feat/laredo-elections (after tickets 01 to 06)

Run 2026-09-18 by the coordinator with `/code-review feat/laredo-elections high` over the whole PR branch at 506ab2a
(82 tests green). Per-ticket reviews live beside this file; these are integration-level findings the fixtures do not
exercise. Each is to be fixed by a dispatched worker, who records the outcome under its heading.

## 1. Candidate identity keyed on whichever name the city printed (src/sources/city-elections.ts ~639)

Identity uses the legal name, else the ballot name. The general fixture has "Jorge A. Garza" in Mayor with no legal
name (id `…:mayor:jorge-a-garza`). When the city fills in his legal name, the next run yields a second Candidate with a
new id but the same slug; `mergeRecords` never removes the old one, so the Race table lists him twice, both pages write
to the same path (last wins), the search index carries two entries, and an Alias declared against the old id stops
attaching. Same effect for any legal-name typo the city fixes.

**Outcome:**

## 2. parseForumButton builds a date from unvalidated MM-DD-YY digits (src/sources/city-elections.ts ~543)

`fromCentral()` on an out-of-range day or month yields an Invalid Date and `Intl.DateTimeFormat.formatToParts` throws,
so the whole city-elections Source fails until the city fixes its typo. `src/dates.ts` already exports
`parseNumericDate()` with the round-trip guard; reuse it.

**Outcome:**

## 3. route.fetch() has no timeout (src/fetcher/browser.ts ~488)

The document request is capped by Playwright's 30 s default while the 45 s budget only covers the navigation. A slow
document aborts at 30 s, `download` returns status 0, `ensureOk` throws, and because `unreadableBy` is not set the
same document costs another 30 s every later run. Pass `{ timeout: timeoutMs }` to `route.fetch()`.

**Outcome:**

## 4. cityHref rewrites every *.cityoflaredo.com hostname to www (src/sources/city.ts ~854)

The city runs other hosts under its domain (click2gov.cityoflaredo.com appears in the bids fixture). Rewriting the
hostname sends readers to a 404. Only upgrade the protocol; leave the hostname alone, or map only the bare apex to www.

**Outcome:**

## 5. A Race heading with no letters or digits gets an empty slug (src/sources/city-elections.ts ~401)

The Election title guards this hazard; Races do not. An empty slug fails `validateData` inside `saveData`, outside the
per-Source failure path, and no page of the site publishes. Throw or skip-and-log when `nameSlug(title)` is empty, the
way `printedName()` does for candidate names.

**Outcome:**

## 6. download() re-navigates the referer page fetch() already visited (src/fetcher/browser.ts ~475)

`fetch()` never records the origin in `warmed`, so every scheduled run pays one redundant headless navigation of the
finance page plus its networkidle wait before the first PDF. Have `fetch()` add `origin(url)` to `warmed` after a
successful goto.

**Outcome:**

## 7. contentText glues adjacent shown strings without a separator (src/elections/figures.ts ~272)

Consecutive `Tj` strings on one row are joined with no space unless a TJ kern is present, and the `'` and `"` show-text
operators are neither a break nor a space, so a label written as several operators reads as one run
("TOTALPOLITICALCONTRIBUTIONS") and never matches; the Filing is stamped unreadable until READER_VERSION is bumped.
Insert a space between adjacent shown strings and treat `'`/`"` as row breaks like `T*`.

**Outcome:**

## 8. mergeRecords is O(n²) (src/ingest.ts ~774)

`records.indexOf(existing)` inside the loop is an O(n) scan per incoming record on top of the byId map already built.
city-finance returns ~600 Filings every run and the data file only grows. Build the map as id to index and replace in O(1).

**Outcome:**
