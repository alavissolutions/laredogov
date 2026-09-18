import { sortValue } from '../dates.js';
import type { DataFile, DocumentKind } from '../domain.js';
import { PATHS } from './context.js';
import { postedDate } from './items.js';

/** One Item in the client-side search index. Keys are short because the file ships to every reader. */
export interface SearchIndexEntry {
  /** Title, in the Publisher's language. Empty for stream lines, which the page renders from `k`, `b`, and `md`. */
  t: string;
  /** Item date (ISO). */
  d: string;
  /** Publisher ID. */
  p: string;
  /** Topic. */
  o: string;
  /** Official URL. */
  u: string;
  /** Stream lines only: Meeting ID, document kind, Body name, and Meeting date. */
  m?: string;
  k?: DocumentKind;
  b?: string;
  md?: string;
  /** Pages of this site: the language-independent path, which the page prefixes with the reader's language. */
  s?: string;
  /** A second name the entry answers to, searched but not shown: a Candidate's other name. */
  a?: string;
}

/**
 * Every Item ever recorded, not only the 90-day window, language-neutral, plus the pages this site
 * makes of its own records: a Candidate is findable by either of the two names the city printed
 * (user story 6), which no Item carries.
 */
export function searchIndex(data: DataFile): SearchIndexEntry[] {
  const meetings = new Map(data.meetings.map((m) => [m.id, m]));
  const items = [...data.items]
    .sort((a, b) => sortValue(postedDate(b)) - sortValue(postedDate(a)))
    .map((i) => {
      const meeting = i.stream ? meetings.get(i.stream.meetingId) : undefined;
      return {
        t: i.stream ? '' : i.title,
        d: i.date,
        p: i.publisher,
        o: i.topic,
        u: i.url,
        ...(i.stream ? { m: i.stream.meetingId, k: i.stream.kind, b: meeting?.bodyName ?? '', md: meeting?.date ?? i.date } : {}),
      };
    });
  return [...items, ...candidateEntries(data)];
}

/** One entry per Candidate page, dated by its election day and linking to the page, not the city. */
function candidateEntries(data: DataFile): SearchIndexEntry[] {
  const elections = new Map(data.elections.map((e) => [e.id, e]));
  const races = new Map(data.races.map((r) => [r.id, r]));
  const entries: SearchIndexEntry[] = [];
  for (const candidate of data.candidates) {
    const election = elections.get(candidate.electionId);
    const race = races.get(candidate.raceId);
    if (!election || !race) continue;
    const shown = candidate.ballotName || candidate.name;
    entries.push({
      t: shown,
      d: election.date,
      p: candidate.publisher,
      o: 'elections',
      // Where the city posted this person; the reader opens the site's page from `s`.
      u: election.url,
      s: PATHS.candidate(election.slug, race.slug, candidate.slug),
      ...(candidate.name && candidate.name !== shown ? { a: candidate.name } : {}),
    });
  }
  return entries;
}
