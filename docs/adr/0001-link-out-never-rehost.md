---
status: accepted
---
# Link out to Publishers; never rehost their documents

The site is an index, not an archive. Every Item stores title, date, Topic, and the Publisher's own URL, and the site sends the reader there. We do not download, store, or serve agendas, PDFs, videos, or police and fire material ourselves.

## Considered options

- **Archive**: mirror documents and make them full-text searchable. Rejected: hosting cost on a zero budget, unclear reuse terms on several portals (Municode, NEOGOV, open-data license is a bare disclaimer), and rehosting police material risks putting names and addresses of private people on a site we control.
- **Index** (chosen): links only. Loses content if a Publisher deletes it, which we accept.

## Consequences

Full-text search across documents is out of scope. Broken links are expected over time and the site should say when an Item was last seen live.

## Note added 2026-09-17: copied totals are not rehosting

The Elections section stores four totals copied from the cover sheet of each campaign finance report (contributions, expenditures, contributions maintained, outstanding loans) as Figures beside the link to the report. The PDF itself is downloaded once to read them and is not kept or served. Because a wrong number on a Candidate page is a fairness problem, an extracted Figure is published only after the owner verifies it against the PDF and lists the document id in `data/elections.yaml`. Itemised contributors, expenditures, and addresses are never copied.
