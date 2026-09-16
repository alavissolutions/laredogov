# 07: Meeting documents, video, and stream lines

**What to build:** A Meeting page fills in agenda, packet, minutes, and video as each appears, and the New panel shows a line ("Minutes posted: City Council, Sept 21") when one attaches between builds. Video comes from the Legistar event's video field when present, otherwise the Meeting links the Swagit archive page for that Body.

**Blocked by:** 06 (Legistar Meetings, the Coming up panel, and Meeting pages)

**Status:** resolved

- [x] Meeting page lists whichever of agenda, packet, minutes, and video exist, each linking to the Publisher's URL
- [x] A document attaching between two builds produces one stream Item under Meetings linking to the Meeting page, with the Publisher's date
- [x] Re-running with unchanged fixtures produces no new stream Items
- [x] Video falls back to the Swagit archive link when Legistar has no video URL
- [x] Test through the seam: build one (agenda only), build two (minutes and video added) yields two new stream lines and an updated Meeting page

## Comments

2026-09-16: Done. Stream lines are dated by Legistar's per-document publish stamps. The packet is only on the InSite page, fetched per meeting when the modified stamp changes or the meeting is within a week. The "agenda only" state for build one is derived in the test from the real record by nulling the minutes and media fields (documented in `test/fixtures/README.md`).
