import { load } from 'cheerio';
import { centralDate } from '../dates.js';
import { ensureOk } from '../fetcher/types.js';
import { CITY_SITE, collapse } from './city.js';
import type { NewItem, SourceAdapter } from './types.js';

export const BIDS_URL = `${CITY_SITE}/services/bids-rfp-s`;

export interface BidRow {
  description: string;
  dueDate?: string;
  link: string;
}

/**
 * The bids page is a hand-edited govAccess page: each department has a "Current Bid Opportunities" heading
 * followed by a table with Due Date, Opening, Description, Pre-Bid, and Addendum columns. Empty and "N/A"
 * rows mean no current bids.
 */
export function parseBidsPage(html: string): BidRow[] {
  const $ = load(html);
  const rows: BidRow[] = [];
  $('table').each((_, table) => {
    const headerCells = $(table).find('tr').first().find('th, td');
    const headers = headerCells.map((__, c) => collapse($(c).text()).toLowerCase()).get();
    const descIdx = headers.findIndex((h) => h.includes('description'));
    const dueIdx = headers.findIndex((h) => h.includes('due'));
    if (descIdx < 0) return;
    $(table)
      .find('tr')
      .slice(1)
      .each((__, tr) => {
        const cells = $(tr).find('td');
        const descCell = cells.eq(descIdx);
        const description = collapse(descCell.text());
        if (!description || /^n\/?a$/i.test(description)) return;
        const href = descCell.find('a[href]').first().attr('href') ?? $(tr).find('a[href]').first().attr('href');
        const due = dueIdx >= 0 ? collapse(cells.eq(dueIdx).text()) : '';
        rows.push({
          description,
          ...(due && !/^n\/?a$/i.test(due) ? { dueDate: due } : {}),
          link: href ? new URL(href, BIDS_URL).toString() : BIDS_URL,
        });
      });
  });
  return rows;
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

/** City bid and RFP postings, filed under Jobs and Bids. The page shows no posting date, so the date is first-seen. */
export const cityBids: SourceAdapter = {
  id: 'city-bids',
  publisher: 'city-of-laredo',
  topicRule: { topics: ['jobs-and-bids'], stringsKey: 'topicRule.city-bids' },
  directory: { url: BIDS_URL, stringsKey: 'dir.city-bids', lastVerified: '2026-09-16' },
  async run({ fetcher, previous, now, log }) {
    const rows = parseBidsPage(ensureOk(await fetcher.fetch(BIDS_URL, 'browser')).body);
    const previousItems = new Map(previous.items.filter((i) => i.source === 'city-bids').map((i) => [i.id, i]));
    const items: NewItem[] = rows.map((row) => {
      const id = `city-bids:${slug(row.description)}${row.dueDate ? `:${slug(row.dueDate)}` : ''}`;
      const seen = previousItems.get(id);
      return { id, title: row.description, date: seen?.date ?? centralDate(now), url: row.link, topic: 'jobs-and-bids' };
    });
    log(`city-bids: ${items.length} current bids`);
    return { items };
  },
};
