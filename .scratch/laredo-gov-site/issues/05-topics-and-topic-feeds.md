# 05: Topics, Topic pages, and per-Topic RSS

**What to build:** A resident can open any of the nine Topics and see only its Items, and subscribe to that Topic in a feed reader. Every Source adapter declares its Topic rule; the build refuses an Item with no Topic or an unknown Topic. Topic pages and one RSS feed per Topic are rendered in both languages.

**Blocked by:** 02 (Bilingual interface)

**Status:** resolved

- [x] The nine Topics from the glossary are the only Topics; Topic names come from the strings file
- [x] Each adapter declares a Topic rule; the build fails on an Item with a missing or unknown Topic
- [x] Topic pages list that Topic's Items from the 90-day window, newest first
- [x] One RSS feed per Topic plus the existing everything feed
- [x] Test through the seam: utilities Items appear only on News and Notices and in its RSS

## Comments

2026-09-16: Done. `TOPICS` in `src/domain.ts`; `validateData` refuses an unknown Topic before the data file is written; nine Topic pages and feeds per language.
