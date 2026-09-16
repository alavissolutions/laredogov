import { describe, expect, it } from 'vitest';
import { strings } from '../src/i18n/strings.js';
import { laredoUtilities } from '../src/sources/laredo-utilities.js';
import { FIXTURE_NOW, utilitiesFixtures } from './fixtures/fetcher.js';
import { newPanelTitles, Site } from './helpers.js';

describe('02: bilingual interface', () => {
  it('renders both language trees; the Spanish home page shows Spanish labels with the English Item title', async () => {
    const site = await Site.create();
    await site.build({ fixtures: utilitiesFixtures, now: FIXTURE_NOW, sources: [laredoUtilities] });

    const en = await site.page('/en/');
    const es = await site.page('/es/');
    expect(en('html').attr('lang')).toBe('en');
    expect(es('html').attr('lang')).toBe('es');
    expect(es('h2').map((_, e) => es(e).text()).get()).toEqual(expect.arrayContaining(['Próximamente', 'Nuevo']));
    expect(newPanelTitles(es)).toEqual(['UTILITIES UPDATE | 36-INCH WATER LINE TIE-IN']);
    expect(es('section[aria-labelledby="new"] .items > li .publisher').text()).toBe('Servicios Públicos de la Ciudad de Laredo');
    expect(es('section[aria-labelledby="new"] .items > li a.topic').text()).toBe('Noticias y Avisos');
    expect(es('body').text()).toContain('sitio no oficial');
  });

  it('the language switch keeps the current page', async () => {
    const site = await Site.create();
    await site.build({ fixtures: utilitiesFixtures, now: FIXTURE_NOW, sources: [laredoUtilities] });
    const en = await site.page('/en/topics/health/');
    expect(en('a.lang-switch').attr('href')).toBe('/es/topics/health/');
    expect(en('a.lang-switch').text()).toBe('Español');
    const es = await site.page('/es/topics/health/');
    expect(es('a.lang-switch').attr('href')).toBe('/en/topics/health/');
    expect(es('link[hreflang="en"]').attr('href')).toBe('/en/topics/health/');
  });

  it('the root page sends readers to English without JavaScript', async () => {
    const site = await Site.create();
    await site.build({ fixtures: utilitiesFixtures, now: FIXTURE_NOW, sources: [laredoUtilities] });
    const root = await site.file('/');
    expect(root).toContain('http-equiv="refresh" content="0; url=/en/"');
    expect(root).toContain('href="/es/"');
  });

  it('every string exists in both languages and none is empty', () => {
    const enKeys = Object.keys(strings.en).sort();
    const esKeys = Object.keys(strings.es).sort();
    expect(esKeys).toEqual(enKeys);
    for (const key of enKeys) {
      expect(strings.es[key as keyof typeof strings.es], key).not.toBe('');
      expect(strings.en[key as keyof typeof strings.en], key).not.toBe('');
    }
  });
});
