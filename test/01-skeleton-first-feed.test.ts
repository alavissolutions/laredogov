import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { laredoUtilities } from '../src/sources/laredo-utilities.js';
import { FIXTURE_NOW, utilitiesFixtures } from './fixtures/fetcher.js';
import { daysAfter, newPanelTitles, Site } from './helpers.js';

const only = [laredoUtilities];

describe('01: skeleton, seam, and the first Feed (Laredo Utilities)', () => {
  it('first-ever build from empty data records the utilities notice and lists it under New with a link to the utility', async () => {
    const site = await Site.create();
    const { data, report } = await site.build({ fixtures: utilitiesFixtures, now: FIXTURE_NOW, sources: only });

    expect(report.failed).toEqual([]);
    expect(data.items).toHaveLength(1);
    const item = data.items[0]!;
    expect(item).toMatchObject({
      title: 'UTILITIES UPDATE | 36-INCH WATER LINE TIE-IN',
      url: 'https://laredoutilities.com/36-inch-water-main-connection/',
      topic: 'news-and-notices',
      publisher: 'laredo-utilities',
      source: 'laredo-utilities',
      firstSeen: FIXTURE_NOW.toISOString(),
      lastSeenLive: FIXTURE_NOW.toISOString(),
    });
    expect(item.date).toBe('2026-09-16T05:25:36.000Z');
    expect(data.sources['laredo-utilities']).toMatchObject({ lastChecked: FIXTURE_NOW.toISOString(), lastSuccess: FIXTURE_NOW.toISOString(), lastNewItem: FIXTURE_NOW.toISOString() });

    const saved = await site.data();
    expect(saved.items).toHaveLength(1);

    const $ = await site.page('/en/');
    expect(newPanelTitles($)).toEqual(['UTILITIES UPDATE | 36-INCH WATER LINE TIE-IN']);
    const li = $('section[aria-labelledby="new"] .items > li').first();
    expect(li.find('a.title').attr('href')).toBe('https://laredoutilities.com/36-inch-water-main-connection/');
    expect(li.find('.publisher').text()).toBe('City of Laredo Utilities');
    expect(li.find('time').attr('datetime')).toBe('2026-09-16T05:25:36.000Z');
    expect(li.find('a.topic').text()).toBe('News and Notices');
    expect(li.find('a.topic').attr('href')).toBe('/en/topics/news-and-notices/');
  });

  it('writes an everything RSS feed using the Publisher date and official URL', async () => {
    const site = await Site.create();
    await site.build({ fixtures: utilitiesFixtures, now: FIXTURE_NOW, sources: only });
    const rss = await site.file('/en/feed.xml');
    expect(rss).toContain('<link>https://laredoutilities.com/36-inch-water-main-connection/</link>');
    expect(rss).toContain('<pubDate>Wed, 16 Sep 2026 05:25:36 GMT</pubDate>');
    expect(rss).toContain('<title>UTILITIES UPDATE | 36-INCH WATER LINE TIE-IN</title>');
    expect(rss).toContain('href="https://example.test/en/feed.xml" rel="self"');
  });

  it('a second build with an unchanged fixture adds no duplicate and updates last-seen-live only', async () => {
    const site = await Site.create();
    await site.build({ fixtures: utilitiesFixtures, now: FIXTURE_NOW, sources: only });
    const later = daysAfter(FIXTURE_NOW, 1);
    const { data, report } = await site.build({ fixtures: utilitiesFixtures, now: later, sources: only });

    expect(report.newItems).toBe(0);
    expect(data.items).toHaveLength(1);
    expect(data.items[0]!.firstSeen).toBe(FIXTURE_NOW.toISOString());
    expect(data.items[0]!.lastSeenLive).toBe(later.toISOString());
    expect(data.sources['laredo-utilities']!.lastNewItem).toBe(FIXTURE_NOW.toISOString());
  });

  it('the layout is mobile-first, has proper headings, the unofficial notice, and no third-party scripts or cookies', async () => {
    const site = await Site.create();
    await site.build({ fixtures: utilitiesFixtures, now: FIXTURE_NOW, sources: only });
    const html = await site.file('/en/');
    const $ = await site.page('/en/');
    expect($('meta[name="viewport"]').attr('content')).toContain('width=device-width');
    expect($('h1')).toHaveLength(1);
    expect($('h2').map((_, e) => $(e).text()).get()).toEqual(expect.arrayContaining(['Coming up', 'New']));
    expect($('main').text()).not.toContain('undefined');
    expect(html).toMatch(/unofficial site/i);
    expect($('script[src]')).toHaveLength(0);
    expect(html).not.toMatch(/googletagmanager|google-analytics|gtag\(|plausible|matomo|document\.cookie|<iframe/i);
    expect($('a.skip').attr('href')).toBe('#main');
    const css = await site.file('/style.css');
    expect(css).toContain('overflow-wrap:anywhere');
    expect(css).toContain('max-width');
  });

  it('README explains running the build against fixtures and the MIT license is present', async () => {
    const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
    expect(readme).toContain('npm run build:fixtures');
    const license = await readFile(new URL('../LICENSE', import.meta.url), 'utf8');
    expect(license).toContain('MIT License');
  });
});
