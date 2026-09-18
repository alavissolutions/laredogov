/**
 * Refresh the recorded fixtures under test/fixtures from the live Sources, politely:
 * one request per page through the production fetcher. Run only when a Source changes shape.
 *
 *   npm run capture -- [laredo-utilities|legistar|city-newsroom|city-calendar|city-bids|city-elections|city-finance ...]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { productionFetcher } from '../src/fetcher/production.js';
import { ensureOk, type FetchMode } from '../src/fetcher/types.js';
import { BIDS_URL } from '../src/sources/city-bids.js';
import { monthUrl } from '../src/sources/city-calendar.js';
import { GENERAL_CANDIDATES_URL, GENERAL_ELECTION_URL, SPECIAL_CANDIDATES_URL, SPECIAL_ELECTION_URL } from '../src/sources/city-elections.js';
import { CAMPAIGN_FINANCE_URL } from '../src/sources/city-finance.js';
import { CONTROL_DEPARTMENT, DEPARTMENT_TOPICS, departmentListUrl, NEWSROOM_URL } from '../src/sources/city-newsroom.js';
import { FEED_URL } from '../src/sources/laredo-utilities.js';
import { bodiesUrl, eventsUrl } from '../src/sources/legistar.js';
import { FIXTURE_NOW } from '../test/fixtures/fetcher.js';
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

/**
 * URLs come from the adapters so a refreshed fixture always matches what the adapter will ask for.
 * Tests pass FIXTURE_NOW as `now`, so the Legistar window and calendar months are the ones for that date;
 * bump FIXTURE_NOW in test/fixtures/fetcher.ts when refreshing, then update test expectations.
 */
const departmentNames: Record<string, string> = { '13': 'fire', '23': 'police', '14': 'health', [CONTROL_DEPARTMENT]: 'airport' };

try {
  if (all || wanted.has('laredo-utilities')) {
    await save('laredo-utilities/feed.xml', FEED_URL, 'http');
  }
  if (all || wanted.has('legistar')) {
    await save('legistar/bodies.json', bodiesUrl, 'http');
    await save('legistar/events.json', eventsUrl(FIXTURE_NOW), 'http');
    console.log('Legistar InSite meeting pages under legistar/insite/ are captured by hand per meeting; see README there.');
  }
  if (all || wanted.has('city-newsroom')) {
    await save('city-newsroom/newsroom.html', NEWSROOM_URL, 'browser');
    for (const dept of [...Object.keys(DEPARTMENT_TOPICS), CONTROL_DEPARTMENT]) {
      await save(`city-newsroom/newsroom-dept-${dept}-${departmentNames[dept] ?? dept}.html`, departmentListUrl(dept), 'browser');
    }
  }
  if (all || wanted.has('city-calendar')) {
    const [y, m] = [FIXTURE_NOW.getUTCFullYear(), FIXTURE_NOW.getUTCMonth() + 1];
    const next: [number, number] = m === 12 ? [y + 1, 1] : [y, m + 1];
    await save(`city-calendar/month-${y}-${String(m).padStart(2, '0')}.html`, monthUrl(y, m), 'browser');
    await save(`city-calendar/month-${next[0]}-${String(next[1]).padStart(2, '0')}.html`, monthUrl(...next), 'browser');
    console.log('Calendar detail pages under city-calendar/event-*.html are captured by hand; see README there.');
  }
  if (all || wanted.has('city-bids')) {
    await save('city-bids/bids.html', BIDS_URL, 'browser');
  }
  if (all || wanted.has('city-elections')) {
    await save('city-elections/general-2026.html', GENERAL_ELECTION_URL, 'browser');
    await save('city-elections/general-2026-candidates.html', GENERAL_CANDIDATES_URL, 'browser');
    await save('city-elections/special-2026.html', SPECIAL_ELECTION_URL, 'browser');
    await save('city-elections/special-2026-candidates.html', SPECIAL_CANDIDATES_URL, 'browser');
  }
  if (all || wanted.has('city-finance')) {
    await save('city-finance/campaign-finance-reports.html', CAMPAIGN_FINANCE_URL, 'browser');
  }
} finally {
  await fetcher.close();
}
