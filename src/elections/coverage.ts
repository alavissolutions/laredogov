/**
 * When this site's coverage of an Election begins (spec: .scratch/laredo-elections/spec.md, issue 05).
 *
 * The Publisher's campaign finance page carries every report filed with it since 2015, and its own
 * election page carries a dated calendar for the Election that starts with the first thing the
 * Publisher had to do for it. That first calendar day is where this site's coverage of an Election
 * opens: what the Publisher posted on or after it belongs to this election cycle, and what it
 * posted before is the record behind it. The line decides two things, and only these two:
 *
 * - which filing deadlines a Race table has a column for, so the comparison is this cycle's
 *   comparison rather than a column per deadline since 2015;
 * - which reports become Items, so a first build does not announce a decade of filings as news
 *   (spec: Item rules).
 *
 * Nothing is hidden by it: a report from before the line is still a Filing and still shows on the
 * Candidate page of anyone it attaches to, which is how a sitting officeholder's history is as full
 * as a challenger's (user story 7).
 */
import type { Election } from '../domain.js';

/** The first day on the Publisher's own calendar for one Election, if it has posted one. */
export function coverageStart(election: Election): string | undefined {
  return election.calendar.map((entry) => entry.date).sort()[0];
}

/** The day the earliest Election this site covers opens on. */
export function earliestCoverageStart(elections: readonly Election[]): string | undefined {
  return elections.flatMap((election) => coverageStart(election) ?? []).sort()[0];
}
