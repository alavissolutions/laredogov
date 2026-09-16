import { XMLParser } from 'fast-xml-parser';
import { ensureOk } from '../fetcher/types.js';
import type { NewItem, SourceAdapter } from './types.js';

export const FEED_URL = 'https://laredoutilities.com/feed/';

interface RssItem {
  title?: string;
  link?: string;
  pubDate?: string;
  guid?: string | { '#text'?: string };
}

/** Laredo Utilities Department WordPress RSS: boil-water and urgent notices. Everything is News and Notices. */
export const laredoUtilities: SourceAdapter = {
  id: 'laredo-utilities',
  publisher: 'laredo-utilities',
  fetchMode: 'http',
  topicRule: { topics: ['news-and-notices'], stringsKey: 'topicRule.laredo-utilities' },
  directory: { url: 'https://laredoutilities.com/urgent-notices/', stringsKey: 'dir.laredo-utilities', lastVerified: '2026-09-16' },
  async run({ fetcher }) {
    const res = ensureOk(await fetcher.fetch(FEED_URL, 'http'));
    const parser = new XMLParser({ ignoreAttributes: false, cdataPropName: '__cdata', htmlEntities: true });
    const doc = parser.parse(res.body) as { rss?: { channel?: { item?: RssItem | RssItem[] } } };
    const raw = doc.rss?.channel?.item;
    const list: RssItem[] = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
    const items: NewItem[] = [];
    for (const entry of list) {
      const title = text(entry.title);
      const link = text(entry.link);
      const pub = entry.pubDate ? new Date(entry.pubDate) : undefined;
      if (!title || !link || !pub || Number.isNaN(pub.getTime())) continue;
      const guid = typeof entry.guid === 'string' ? entry.guid : entry.guid?.['#text'];
      items.push({
        id: `laredo-utilities:${guid ?? link}`,
        title,
        date: pub.toISOString(),
        url: link,
        topic: 'news-and-notices',
      });
    }
    return { items };
  },
};

function text(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object' && '__cdata' in value) return String((value as { __cdata: unknown }).__cdata).trim();
  if (value && typeof value === 'object' && '#text' in value) return String((value as { '#text': unknown })['#text']).trim();
  return '';
}
