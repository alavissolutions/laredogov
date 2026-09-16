import { sortValue } from '../dates.js';
import type { DataFile, DocumentKind } from '../domain.js';
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
}

/** Every Item ever recorded, not only the 90-day window, language-neutral. */
export function searchIndex(data: DataFile): SearchIndexEntry[] {
  const meetings = new Map(data.meetings.map((m) => [m.id, m]));
  return [...data.items]
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
}
