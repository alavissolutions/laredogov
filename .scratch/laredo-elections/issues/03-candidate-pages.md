# 03: Candidate pages

**What to build:** From a Race table a resident opens one Candidate and sees their legal name and name on ballot as the city printed them, their Race, their treasurer, every Filing under a plain label (treasurer appointment, ballot application) with its link and last-seen-live date, and the fixed neutrality sentence: everything shown is copied from City of Laredo filings and the site adds no opinion, incumbent label, or outside material. Both languages. Candidate pages are findable in search by either name.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] One page per Candidate at the spec's URL; slugs derive from name on ballot, ASCII, hyphenated, numeric suffix on collision
- [ ] Filing labels and the neutrality sentence live in the strings file in both languages; names and city titles are never translated
- [ ] Search index returns the Candidate page for the legal name and the name on ballot
- [ ] Spanish and English pages show identical names and links
