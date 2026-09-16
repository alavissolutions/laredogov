---
status: accepted
---
# Topic and identity are decided per Source; no classification, no cross-Source merging

Every Source declares which Topic its Items get. A Source may declare a mapping from the Publisher's own categories or departments to Topics (the City Newsroom maps Fire and Police to Public Safety, Health to Health, everything else to News and Notices). Nothing inspects titles or text to guess a Topic. Each document type for a Publisher has exactly one designated Source (Legistar for every Meeting; the city calendar only for non-Meeting Events), so the same document is never ingested twice and there is no duplicate-merging logic.

## Why

Deterministic rules can be explained on the page ("filed under Public Safety because the city posted it under Fire Department") and never misfile a boil-water notice as Public Safety because it mentions "emergency." Cross-Source merging is fuzzy matching that fails quietly; picking one Source per document type up front removes the problem instead of solving it.

## Consequences

Adding a new Source means writing its Topic rule. A document that only exists in a non-designated Source is not ingested until the designation changes.

The one place a Source must recognise another Source's document type is the city calendar, which lists board and commission meetings beside Events. Its exclusion rule is declared, not learned (added 2026-09-16): a calendar entry is a Body's Meeting when its title names a Body from the Legistar bodies list (letters-only comparison, prefix allowed for names of twelve letters or more), when a Meeting of that Body is already recorded for that day, or when the city's own subtitle on the entry says committee, board, commission, or council meeting. Skipped entries are counted in the run log. This is exclusion by the Publisher's own labels, not fuzzy merging: nothing is matched across Sources to combine records.
