import { sortValue } from '../dates.js';
import type { DataFile } from '../domain.js';

export interface SearchIndexEntry {
  t: string;
  d: string;
  p: string;
  o: string;
  u: string;
  /** Meeting ID for stream lines, so the result can link to the Meeting page. */
  m?: string;
}

/** Every Item ever recorded, not only the 90-day window, keyed for a small client-side search. */
export function searchIndex(data: DataFile, streamTitle: (itemId: string) => string): SearchIndexEntry[] {
  return [...data.items]
    .sort((a, b) => sortValue(b.date) - sortValue(a.date))
    .map((i) => ({
      t: i.stream ? streamTitle(i.id) : i.title,
      d: i.date,
      p: i.publisher,
      o: i.topic,
      u: i.url,
      ...(i.stream ? { m: i.stream.meetingId } : {}),
    }));
}
