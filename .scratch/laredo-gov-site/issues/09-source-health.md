# 09: Source health and failure resilience

**What to build:** Each Feed's Directory entry shows when it was last checked and when it last produced a new Item, and carries a visible warning when the site has not reached it in 7 days. A Source that throws during ingest is recorded (last error, last attempt) and the rest of the build proceeds unchanged.

**Blocked by:** 08 (The Directory of Sources and Lookups)

**Status:** resolved

- [x] Data file records per Source: last checked, last success, last new Item, last error
- [x] A throwing adapter does not fail the build; its health is updated and other Sources ingest normally
- [x] Directory shows last checked and last new Item for each Feed
- [x] A Feed unreachable for 7 or more days shows a warning in both languages
- [x] Test through the seam: one fixture Source fails, the build succeeds, the Directory shows the warning once the clock passes 7 days

## Comments

2026-09-16: Done. Health also records `firstChecked` so a Feed that has never succeeded warns after 7 days too.
