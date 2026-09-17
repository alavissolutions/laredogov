---
status: accepted
---
# Finance reports attach to Candidates only by exact name or owner-declared Alias

The city's candidate tables and its campaign finance page spell the same person differently ("Gilberto Gonzalez" and "Gilbert Gonzalez", "Victor Daniel Trevino" and "Dr. Victor D. Treviño"). ADR-0004 forbids fuzzy cross-Source merging, and this feature is the first place the site must join records across two Sources. A finance report attaches to a Candidate only when the filer name equals, character for character after trimming, the Candidate's legal name, name on ballot, or an Alias the owner has declared in the hand-kept file `data/elections.yaml`. Anything else stays an unmatched report, shown on the Race page under the city's own spelling and listed in the run log for the owner to declare.

## Considered options

- **Normalised matching** (strip accents, titles, suffixes, nicknames): rejected. It fails quietly, and with two Cigarroas and two Trevinos on one ballot a quiet failure puts one candidate's money on another's page.
- **Not attaching**: rejected. The comparison table is the point of the feature.
- **Declared Aliases** (chosen): matching is a lookup the page can explain and the owner can audit in git.

## Consequences

The owner has a small recurring job after each filing deadline. Nothing the city posts is hidden while the owner is behind: unmatched reports still render, just not under a Candidate.
