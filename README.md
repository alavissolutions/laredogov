# Laredo Gov

One place for what Laredo-area governments publish. A static site, rebuilt twice a day from the official Sources, that shows what is coming up and what was just posted, filed under plain-language Topics, with a link to the official document. Unofficial, free to run, bilingual, MIT licensed.

Vocabulary is in [`CONTEXT.md`](CONTEXT.md), decisions in [`docs/adr/`](docs/adr/), source facts in [`docs/research/laredo-public-sources.md`](docs/research/laredo-public-sources.md), and the spec in `.scratch/laredo-gov-site/spec.md`.

## How it works

Two stages, one data file (ADR-0002):

1. **Ingest** reads every Feed through a Source adapter and updates `data/laredo.json`, the committed system of record: every Item and Meeting ever seen plus per-Source health.
2. **Render** reads that file and writes the static site, one RSS feed per Topic plus one for everything, and a search index, in English under `/en/` and Spanish under `/es/`.

Nothing runs between builds. GitHub Actions runs the build on a cron, commits the data file, and deploys the output to GitHub Pages (`.github/workflows/build.yml`).

## Run it locally

Requires Node 22.

```sh
npm ci
npm run build:fixtures     # builds from recorded fixtures into ./site, never touches the network
npx serve site             # or any static file server; open /en/
```

`npm run build:fixtures` uses the recorded responses under `test/fixtures/` and writes its data file to `site-data/fixtures.json` so the committed `data/laredo.json` stays untouched. Use it for development.

A live build reads the real Sources (one polite request per page, project user agent, headless Chromium for the city site):

```sh
npx playwright install chromium   # once
npm run build                     # writes ./site and updates data/laredo.json
```

Environment: `SITE_URL` (absolute URL used in RSS), `BASE_PATH` (e.g. `/laredogov` for a project Pages site), `SITE_DOMAIN` (writes `CNAME`), `OUT_DIR`, `DATA_FILE`.

`npm run check:akamai` fetches the City Newsroom once through headless Chromium and exits non-zero if the city's Akamai bot manager blocks this machine.

## Tests

```sh
npm run typecheck
npm test
```

There is one seam: the build, with the fetcher swapped. Every test runs the whole build (ingest then render) against recorded fixtures into a temporary directory and asserts on what a resident or the owner sees: the data file, the HTML, the RSS, the search index. No adapter or renderer is tested in isolation.

Fixtures are real captures from the live Sources; see `test/fixtures/README.md` for what each one is and how to refresh it (`npm run capture -- <source>`).

## Adding a Source

Write one adapter in `src/sources/` that implements `SourceAdapter` (declares its Publisher, fetch mode, Topic rule, and Directory entry, and returns Items from a fetcher), add its strings to `src/i18n/strings.ts` in both languages, register it in `src/sources/index.ts`, and record one fixture. Directory-only Sources and Lookups go in `src/directory/entries.ts`.

## Layout

```
src/
  build.ts          the seam: build({ fetcher, outDir, dataFile, now })
  ingest.ts         runs adapters, records health, merges Items and Meetings, adds stream lines
  domain.ts         Item, Meeting, Body, Topic, Publisher, DataFile
  fetcher/          http, headless browser, fixture fetchers behind one interface
  sources/          one adapter per Feed
  directory/        Directory-only entries
  i18n/strings.ts   every interface string, English and Spanish
  render/           pages, RSS, search index, CSS
data/laredo.json    the system of record, committed by the scheduled job
test/               seam tests and recorded fixtures
```

## Status

Live at https://insidelaredo.com/ from https://github.com/alavissolutions/laredogov, rebuilt twice a day. The domain is set through the `SITE_DOMAIN` and `SITE_URL` repository variables and GitHub Pages' custom-domain setting; DNS is on Cloudflare. Before launch the owner still has to send the Webb County access request (issue 15) and review the Spanish strings (issue 16). Webb County and other hosts that block datacenter IPs are Directory-only until then.
