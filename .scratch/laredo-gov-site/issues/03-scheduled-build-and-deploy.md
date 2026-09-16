# 03: Scheduled build and deploy on GitHub Pages

**What to build:** Twice a day, without anyone touching it, the site rebuilds from live Sources and publishes. A GitHub Actions workflow runs the build on a cron, commits the updated data file so history lives in git and the schedule stays active, and deploys the output to GitHub Pages. A failed Source never fails the workflow.

**Blocked by:** 01 (Project skeleton, the build seam, and the first Feed)

**Status:** resolved

- [x] Workflow runs on cron twice daily (Central time morning and afternoon) and on manual dispatch
- [x] Data file changes are committed back by the workflow
- [x] Site deploys to GitHub Pages from the build output
- [x] Workflow succeeds when a Source fails; the failure is recorded in the data file's health slot and visible in the run log
- [x] Verified by one manual dispatch that publishes the utilities-only site

## Comments

2026-09-16: Workflow written at `.github/workflows/build.yml` (cron 12:00 and 20:00 UTC, manual dispatch, push to main). A failed Source is recorded in the data file and logged as a `::warning::`; the job goes on. Still to do by the owner: push the repo to GitHub, set Pages to "GitHub Actions" as the source, and run one manual dispatch; the last checkbox stays open until that run publishes the site. `data/laredo.json` was seeded by one live build on 2026-09-16.

2026-09-16: Repo pushed to https://github.com/alavissolutions/laredogov, Pages set to the Actions source, first run 35066915074 succeeded (all five Feeds ingested from the runner, data file committed back as 587daab, site at https://alavissolutions.github.io/laredogov/). The site now covers all Feeds rather than utilities only. `BASE_PATH` repo variable set to `/laredogov`; clear it when the custom domain lands.
