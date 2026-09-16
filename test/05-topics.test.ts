import { describe, expect, it } from 'vitest';
import { TOPICS } from '../src/domain.js';
import { laredoUtilities } from '../src/sources/laredo-utilities.js';
import { FIXTURE_NOW, utilitiesFixtures } from './fixtures/fetcher.js';
import { Site } from './helpers.js';

describe('05: Topics, Topic pages, and per-Topic RSS', () => {
  it('utilities Items appear only on News and Notices and in its RSS; all nine Topics have pages and feeds in both languages', async () => {
    const site = await Site.create();
    await site.build({ fixtures: utilitiesFixtures, now: FIXTURE_NOW, sources: [laredoUtilities] });

    const news = await site.page('/en/topics/news-and-notices/');
    expect(news('.items > li .title').map((_, e) => news(e).text()).get()).toEqual(['UTILITIES UPDATE | 36-INCH WATER LINE TIE-IN']);
    expect(await site.file('/en/topics/news-and-notices/feed.xml')).toContain('36-INCH WATER LINE');

    for (const topic of TOPICS) {
      for (const lang of ['en', 'es']) {
        expect(await site.exists(`/${lang}/topics/${topic}/`), `${lang} ${topic} page`).toBe(true);
        expect(await site.exists(`/${lang}/topics/${topic}/feed.xml`), `${lang} ${topic} feed`).toBe(true);
      }
      if (topic === 'news-and-notices') continue;
      const page = await site.page(`/en/topics/${topic}/`);
      expect(page('.items > li'), topic).toHaveLength(0);
      expect(await site.file(`/en/topics/${topic}/feed.xml`)).not.toContain('36-INCH');
    }
    const health = await site.page('/es/topics/health/');
    expect(health('h1').text()).toBe('Salud');
    expect(await site.file('/es/topics/health/feed.xml')).toContain('<title>Laredo Gov: Salud</title>');
  });

  it('the build refuses an Item with an unknown Topic', async () => {
    const site = await Site.create();
    const broken = { ...laredoUtilities, id: 'broken', async run() { return { items: [{ id: 'broken:1', title: 'x', date: '2026-09-01', url: 'https://example.test/x', topic: 'weather' as never }] }; } };
    await expect(site.build({ fixtures: {}, now: FIXTURE_NOW, sources: [broken] })).rejects.toThrow(/no valid Topic/);
  });
});
