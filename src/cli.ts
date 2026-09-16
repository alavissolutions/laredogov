import path from 'node:path';
import { build } from './build.js';
import { BrowserSession } from './fetcher/browser.js';
import { productionFetcher } from './fetcher/production.js';
import { NEWSROOM_URL } from './sources/city-newsroom.js';

const [command = 'build', ...rest] = process.argv.slice(2);
const flags = new Set(rest);

async function main(): Promise<void> {
  if (command === 'build') {
    // `--fixtures` is the development build (README): it borrows the test suite's recorded responses on purpose.
    const useFixtures = flags.has('--fixtures');
    const fetcher = useFixtures ? (await import('../test/fixtures/fetcher.js')).allFixturesFetcher() : productionFetcher();
    const now = useFixtures ? (await import('../test/fixtures/fetcher.js')).FIXTURE_NOW : new Date();
    try {
      const { report } = await build({
        fetcher,
        now,
        outDir: process.env.OUT_DIR ?? path.resolve('site'),
        dataFile: process.env.DATA_FILE ?? path.resolve(useFixtures ? 'site-data/fixtures.json' : 'data/laredo.json'),
        siteUrl: process.env.SITE_URL,
        basePath: process.env.BASE_PATH ?? '',
        domain: process.env.SITE_DOMAIN,
      });
      if (report.failed.length) console.log(`::warning::Sources failed this run: ${report.failed.join(', ')}`);
    } finally {
      await fetcher.close();
    }
    return;
  }
  if (command === 'check-akamai') {
    await checkAkamai();
    return;
  }
  console.error(`Unknown command ${command}. Use: build [--fixtures] | check-akamai`);
  process.exit(2);
}

/** Fetches the City Newsroom once through headless Chromium and fails loudly if Akamai blocks this machine (user story 39). */
async function checkAkamai(): Promise<void> {
  const session = new BrowserSession();
  try {
    const res = await session.fetch(NEWSROOM_URL);
    const looksLikeList = res.body.includes('news_widget') && res.body.includes('list-main');
    const challenge = /Access Denied|Reference #\d|akamai/i.test(res.body) && !looksLikeList;
    if (res.status !== 200 || challenge || !looksLikeList) {
      console.error(`::error::Akamai check FAILED: ${NEWSROOM_URL} answered HTTP ${res.status}${challenge ? ' with a block page' : ''}; newsroom list ${looksLikeList ? 'present' : 'absent'}. City Newsroom, Calendar, and Bids will be empty from this runner. See docs/research/laredo-public-sources.md.`);
      process.exit(1);
    }
    console.log(`Akamai check passed: ${NEWSROOM_URL} answered HTTP 200 with the newsroom list.`);
  } finally {
    await session.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
