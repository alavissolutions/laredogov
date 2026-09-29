/**
 * Branch review of feat/laredo-elections, finding 8
 * (.scratch/laredo-elections/reviews/00-branch-review.md). Every Race, Candidate, Filing and Figure
 * is re-read whole on every run, and the data file only grows: the city's finance page alone hands
 * back some six hundred Filings a run, over a decade of filings. Merging them has to cost what the
 * run brings in, not what the file has accumulated, or a twice-daily build slows down for good.
 *
 * The cost is measured rather than the mechanism inspected, because the cost is the finding. The
 * numbers on this machine, 2026-09-18: a merge that rescans the stored records takes about ten
 * seconds at this size and one that does not takes under half a second.
 */
import { describe, expect, it } from 'vitest';
import { emptyData } from '../src/domain.js';
import type { Fetcher } from '../src/fetcher/types.js';
import { ingest } from '../src/ingest.js';
import type { NewRace, SourceAdapter } from '../src/sources/types.js';

/** Bigger than the data file will be for years, and small enough to merge in well under a second. */
const RECORDS = 200_000;

/** A Source that hands back the same records every run, which is what re-reading whole means. */
function sourceOf(races: readonly NewRace[]): SourceAdapter {
  return {
    id: 'bench-elections',
    publisher: 'city-of-laredo',
    topicRule: { topics: ['elections'], stringsKey: 'topicRule.city-elections' },
    directory: { url: 'https://example.test/', stringsKey: 'dir.city-elections', lastVerified: '2026-09-18' },
    run: async () => ({ items: [], races: [...races] }),
  };
}

const neverFetches: Fetcher = {
  fetch: async () => {
    throw new Error('this Source does not fetch');
  },
  download: async () => {
    throw new Error('this Source does not fetch');
  },
  close: async () => undefined,
};

describe('Branch review 8: merging records the Publisher re-posts', () => {
  it('costs what the run brings in rather than what the data file has accumulated', async () => {
    const races: NewRace[] = Array.from({ length: RECORDS }, (_, i) => ({
      id: `city-elections:2026-general:race-${i}`,
      electionId: 'city-elections:2026-general',
      slug: `race-${i}`,
      title: `Race ${i}`,
      kind: 'office',
      order: i,
      unnamedRows: [],
    }));
    const options = {
      fetcher: neverFetches,
      sources: [sourceOf(races)],
      now: new Date('2026-09-18T12:00:00Z'),
      handKeptFile: 'no-such-file.yaml',
      log: () => undefined,
    };

    const data = emptyData();
    await ingest(data, { ...options, now: new Date('2026-09-17T12:00:00Z') });
    expect(data.races).toHaveLength(RECORDS);
    const positions = data.races.map((r) => r.id);

    // The second run re-reads every one of them, which is the run this site does twice a day.
    const started = Date.now();
    await ingest(data, options);
    const took = Date.now() - started;

    // Nothing about the answer changed: every record is where it was, replaced in place, and only
    // first-seen survived the replacement.
    expect(data.races).toHaveLength(RECORDS);
    expect(data.races.map((r) => r.id)).toEqual(positions);
    expect(data.races[0]).toMatchObject({
      id: 'city-elections:2026-general:race-0',
      source: 'bench-elections',
      publisher: 'city-of-laredo',
      order: 0,
      firstSeen: '2026-09-17T12:00:00.000Z',
      lastSeenLive: '2026-09-18T12:00:00.000Z',
    });
    expect(data.races.at(-1)).toMatchObject({ id: `city-elections:2026-general:race-${RECORDS - 1}`, firstSeen: '2026-09-17T12:00:00.000Z' });
    expect(took).toBeLessThan(4_000);
  });
});
