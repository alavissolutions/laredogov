import { describe, expect, it } from 'vitest';
import { allDirectoryEntries } from '../src/directory/entries.js';
import { laredoUtilities, FEED_URL } from '../src/sources/laredo-utilities.js';
import { legistar } from '../src/sources/legistar.js';
import { FIXTURE_NOW, FIXTURE_NOW_2024, legistar2024Fixtures, legistarFixtures, utilitiesFixtures } from './fixtures/fetcher.js';
import { daysAfter, Site } from './helpers.js';

describe('08: the Directory of Sources and Lookups', () => {
  it('renders every declared entry grouped by Publisher, with City of Laredo, Webb County, and Webb CAD first', async () => {
    const site = await Site.create();
    await site.build({ fixtures: utilitiesFixtures, now: FIXTURE_NOW, sources: [laredoUtilities] });
    const $ = await site.page('/en/directory/');
    const entries = allDirectoryEntries();
    expect(entries.length).toBeGreaterThan(30);
    expect($('.entries > li')).toHaveLength(entries.length);
    for (const entry of entries) expect($(`li[id="${entry.id}"]`), entry.id).toHaveLength(1);
    const publishers = $('main h2').map((_, e) => $(e).text()).get();
    expect(publishers.slice(0, 3)).toEqual(['City of Laredo', 'Webb County', 'Webb County Appraisal District']);

    const cad = $('#cad-property-search');
    expect(cad.find('h3').text()).toBe('Property appraisal search');
    expect(cad.find('dl').text()).toContain('Search with');
    expect(cad.find('dl').text()).toContain('Property address, owner name, or property ID (account number)');
    expect(cad.find('.kind').text()).toMatch(/^Lookup/);
    expect(cad.find('a[href="https://propaccess.webbcad.org/clientdb/?cid=1"]')).toHaveLength(1);
    expect(cad.text()).toContain('Entry last verified Sep 16, 2026');

    const tax = $('#county-tax');
    expect(tax.find('dl').text()).toContain('account number');
    expect(tax.find('a[href="https://webb.go2gov.net/"]')).toHaveLength(1);

    expect($('#laredo-utilities .kind').text()).toMatch(/^Feed/);
    expect($('#commissioners-court .kind').text()).toMatch(/^Not ingested/);
    expect($('#fire .warning').text()).toContain('only on Facebook');
    expect($('#txdot-laredo .warning').text()).toContain('only on X');
    expect($('#county-newsflash').length).toBe(1);
  });

  it('descriptions exist in Spanish', async () => {
    const site = await Site.create();
    await site.build({ fixtures: utilitiesFixtures, now: FIXTURE_NOW, sources: [laredoUtilities] });
    const $ = await site.page('/es/directory/');
    expect($('#cad-property-search h3').text()).toBe('Consulta de avalúo de propiedad');
    expect($('#cad-property-search dl').text()).toContain('Busque con');
    expect($('#fire .warning').text()).toContain('solo publica esto en Facebook');
    expect($('main h2').first().text()).toBe('Ciudad de Laredo');
  });
});

describe('09: Source health and failure resilience', () => {
  const failing = { ...utilitiesFixtures, ...legistarFixtures, [FEED_URL]: { throws: 'ECONNRESET: socket hang up' } };
  const sources = [legistar, laredoUtilities];

  it('a throwing Source does not fail the build; its error is recorded and the other Source ingests normally', async () => {
    const site = await Site.create();
    const { data, report } = await site.build({ fixtures: failing, now: FIXTURE_NOW, sources });
    expect(report.failed).toEqual(['laredo-utilities']);
    expect(data.sources['laredo-utilities']).toMatchObject({
      lastChecked: FIXTURE_NOW.toISOString(),
      lastError: { at: FIXTURE_NOW.toISOString(), message: 'ECONNRESET: socket hang up' },
    });
    expect(data.sources['laredo-utilities']!.lastSuccess).toBeUndefined();
    expect(data.sources['legistar']!.lastSuccess).toBe(FIXTURE_NOW.toISOString());
    expect(data.meetings.length).toBeGreaterThan(40);
    expect(await site.exists('/en/')).toBe(true);
  });

  it('the Directory shows last checked and last new Item, and warns once a Feed has been unreachable for 7 days', async () => {
    const site = await Site.create();
    await site.build({ fixtures: { ...utilitiesFixtures, ...legistarFixtures }, now: FIXTURE_NOW, sources });
    let $ = await site.page('/en/directory/');
    expect($('#laredo-utilities .health').text()).toContain('Last checked Sep 16, 2026');
    expect($('#laredo-utilities .health').text()).toContain('Last new Item Sep 16, 2026');
    expect($('#laredo-utilities .warning')).toHaveLength(0);

    await site.build({ fixtures: failing, now: daysAfter(FIXTURE_NOW, 3), sources });
    $ = await site.page('/en/directory/');
    expect($('#laredo-utilities .health').text()).toContain('Last checked Sep 19, 2026');
    expect($('#laredo-utilities .warning')).toHaveLength(0);

    await site.build({ fixtures: failing, now: daysAfter(FIXTURE_NOW, 7), sources });
    $ = await site.page('/en/directory/');
    expect($('#laredo-utilities .warning').text()).toContain('has not been able to reach this Source since Sep 16, 2026');
    expect($('#legistar .warning')).toHaveLength(0);
    const es = await site.page('/es/directory/');
    expect(es('#laredo-utilities .warning').text()).toContain('Aviso: Este sitio no ha podido acceder a esta Fuente desde el 16 sep 2026');

    const home = await site.page('/en/');
    expect(home('section[aria-labelledby="new"]').text()).toContain('36-INCH WATER LINE');
  });

  it('an Item that drops off its Source list is marked after 7 days; Items still listed never are', async () => {
    const site = await Site.create();
    await site.build({ fixtures: { ...utilitiesFixtures, ...legistarFixtures }, now: FIXTURE_NOW, sources });
    // The utilities feed now answers with no items: the notice is no longer listed, though the Source is fine.
    const emptied = { ...legistarFixtures, [FEED_URL]: '<?xml version="1.0"?><rss version="2.0"><channel><title>x</title></channel></rss>' };
    await site.build({ fixtures: emptied, now: daysAfter(FIXTURE_NOW, 3), sources });
    let home = await site.page('/en/');
    expect(home('.items .stale')).toHaveLength(0);

    await site.build({ fixtures: emptied, now: daysAfter(FIXTURE_NOW, 8), sources });
    home = await site.page('/en/');
    const utilities = home('section[aria-labelledby="new"] .items > li').filter((_, e) => home(e).find('.title').text().includes('36-INCH'));
    expect(utilities.find('.stale').text()).toBe('Not seen on the Publisher’s list since Sep 16, 2026; the link may have moved.');
    const streamLines = home('section[aria-labelledby="new"] .items > li').filter((_, e) => /posted|available/.test(home(e).find('.title').text()));
    expect(streamLines.length).toBeGreaterThan(5);
    expect(streamLines.find('.stale')).toHaveLength(0);
  });

  it('a second build where one Source has new Items leaves the other Source untouched', async () => {
    const site = await Site.create();
    const first = await site.build({ fixtures: { ...utilitiesFixtures, ...legistar2024Fixtures }, now: FIXTURE_NOW_2024, sources });
    const utilitiesBefore = first.data.items.filter((i) => i.source === 'laredo-utilities');
    expect(utilitiesBefore).toHaveLength(1);

    // Two years on, Legistar has a whole new window of Meetings; the utilities feed is unchanged.
    const second = await site.build({ fixtures: { ...utilitiesFixtures, ...legistarFixtures }, now: FIXTURE_NOW, sources });
    expect(second.report.newItems).toBeGreaterThan(40);
    expect(second.data.items.filter((i) => i.source === 'laredo-utilities')).toHaveLength(1);
    expect(second.data.items.find((i) => i.source === 'laredo-utilities')).toMatchObject({ firstSeen: FIXTURE_NOW_2024.toISOString(), lastSeenLive: FIXTURE_NOW.toISOString() });
    expect(second.data.sources['laredo-utilities']!.lastNewItem).toBe(FIXTURE_NOW_2024.toISOString());
    expect(second.data.sources['legistar']!.lastNewItem).toBe(FIXTURE_NOW.toISOString());
    expect(second.data.meetings.some((m) => m.id === '969')).toBe(true);
  });
});
