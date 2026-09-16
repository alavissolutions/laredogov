# 04: Headless fetcher and the Akamai check from the Actions runner

**What to build:** The production fetcher can retrieve pages from the City of Laredo site, which returns 403 to anything that is not a real browser. A headless Chromium mode is added to the fetcher for Sources that declare they need it. A separate workflow step fetches the City Newsroom once from the GitHub Actions runner and fails loudly if blocked, so a block shows up in the log rather than as a silently empty site. The answer to "does Akamai let the runner through" is recorded in the research doc.

**Blocked by:** 03 (Scheduled build and deploy on GitHub Pages)

**Status:** ready-for-human

- [x] Fetcher supports a headless mode using the installed Playwright Chromium with a desktop user agent; adapters opt in per Source
- [x] Workflow step fetches the Newsroom once and fails the job with a clear message on 403 or a challenge page
- [ ] Result from the runner recorded in the research doc, with the date
- [ ] If blocked: Newsroom, Calendar, and Bids tickets are marked wontfix-for-now with a comment pointing to the email-ingest phase, and the owner is told

## Comments

2026-09-16: Headless mode is `src/fetcher/browser.ts`; adapters opt in with `fetchMode: 'browser'`. Finding: Akamai only lets the full Chromium build through, with a desktop UA whose major version matches the browser (recorded in the research doc). `npm run check:akamai` is the `akamai-check` job in the workflow. The runner result cannot be recorded until the first Actions run; the owner runs the workflow once and writes the outcome (date, status) into `docs/research/laredo-public-sources.md`. If blocked, mark issues 10, 11, and 12 wontfix-for-now pointing at the email-ingest phase.
