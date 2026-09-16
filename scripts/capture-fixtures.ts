/**
 * Refresh the recorded fixtures under test/fixtures from the live Sources, politely:
 * one request per page through the production fetcher. Run only when a Source changes shape.
 *
 *   npm run capture -- [laredo-utilities|legistar|city-newsroom|city-calendar|city-bids ...]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { productionFetcher } from '../src/fetcher/production.js';
import { ensureOk, type FetchMode } from '../src/fetcher/types.js';
import { fixtureRoot } from '../test/fixtures/paths.js';

const fetcher = productionFetcher();
const wanted = new Set(process.argv.slice(2));
const all = wanted.size === 0;

async function save(relPath: string, url: string, mode: FetchMode): Promise<string> {
  const res = ensureOk(await fetcher.fetch(url, mode));
  const file = path.join(fixtureRoot, relPath);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, res.body);
  console.log(`${res.status} ${url} -> ${relPath} (${res.body.length} bytes)`);
  return res.body;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

try {
  if (all || wanted.has('laredo-utilities')) {
    await save('laredo-utilities/feed.xml', 'https://laredoutilities.com/feed/', 'http');
  }
  if (all || wanted.has('legistar')) {
    const since = new Date();
    since.setMonth(since.getMonth() - 2);
    await save('legistar/bodies.json', 'https://webapi.legistar.com/v1/cityoflaredo/bodies', 'http');
    await save(
      'legistar/events.json',
      `https://webapi.legistar.com/v1/cityoflaredo/events?$filter=EventDate ge datetime'${isoDate(since)}'&$orderby=EventDate`,
      'http',
    );
    console.log('Legistar InSite meeting pages under legistar/insite/ are captured by hand per meeting; see README there.');
  }
  if (all || wanted.has('city-newsroom')) {
    await save('city-newsroom/newsroom.html', 'https://www.cityoflaredo.com/government/newsroom', 'browser');
  }
  if (all || wanted.has('city-calendar')) {
    await save('city-calendar/month.html', 'https://www.cityoflaredo.com/government/city-calendar', 'browser');
    console.log('Calendar detail pages under city-calendar/event-*.html are captured by hand; see README there.');
  }
  if (all || wanted.has('city-bids')) {
    await save('city-bids/bids.html', 'https://www.cityoflaredo.com/services/bids-rfp-s', 'browser');
  }
} finally {
  await fetcher.close();
}
