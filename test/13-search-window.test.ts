import { describe, expect, it } from 'vitest';
import { cityNewsroom } from '../src/sources/city-newsroom.js';
import { laredoUtilities } from '../src/sources/laredo-utilities.js';
import { FIXTURE_NOW, newsroomArchiveFixtures, utilitiesFixtures } from './fixtures/fetcher.js';
import { newPanelTitles, Site } from './helpers.js';

describe('13: title search across all time', () => {
  it('an Item older than 90 days is absent from the home page but present in the search index', async () => {
    const site = await Site.create();
    await site.build({ fixtures: newsroomArchiveFixtures, now: FIXTURE_NOW, sources: [cityNewsroom] });
    const home = await site.page('/en/');
    const title = 'Spring Lawn Contest';
    expect(newPanelTitles(home)).not.toContain(title);
    const index = JSON.parse(await site.file('/search-index.json')) as { t: string; d: string; p: string; o: string; u: string }[];
    const old = index.find((e) => e.t === title)!;
    expect(old).toMatchObject({ d: '2026-03-31', p: 'city-of-laredo', o: 'news-and-notices', u: 'https://www.cityoflaredo.com/Home/Components/News/News/504/15' });
  });

  it('the search page works in both languages and lists recent Items without JavaScript', async () => {
    const site = await Site.create();
    await site.build({ fixtures: utilitiesFixtures, now: FIXTURE_NOW, sources: [laredoUtilities] });
    const en = await site.page('/en/search/');
    expect(en('form[role="search"] input#q')).toHaveLength(1);
    expect(en('script:not([src])').text()).toContain('/search-index.json');
    expect(en('noscript').text()).toContain('36-INCH WATER LINE');
    const es = await site.page('/es/search/');
    expect(es('h1').text()).toBe('Buscar');
    expect(es('label[for="q"]').text()).toBe('Palabras del título');
  });
});

describe('the 90-day window boundary', () => {
  it('includes an Item 90 days old and drops it on day 91, while the index keeps it', async () => {
    const site = await Site.create();
    const at = (day: string) => new Date(`${day}T18:00:00Z`);
    await site.build({ fixtures: utilitiesFixtures, now: at('2026-12-15'), sources: [laredoUtilities] });
    expect(newPanelTitles(await site.page('/en/'))).toHaveLength(1);
    await site.build({ fixtures: utilitiesFixtures, now: at('2026-12-16'), sources: [laredoUtilities] });
    expect(newPanelTitles(await site.page('/en/'))).toHaveLength(0);
    expect(await site.file('/en/feed.xml')).not.toContain('36-INCH');
    expect(await site.file('/search-index.json')).toContain('36-INCH');
  });
});
