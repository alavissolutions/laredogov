import type { CheerioAPI } from 'cheerio';
import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { cityElections, GENERAL_CANDIDATES_URL } from '../src/sources/city-elections.js';
import { electionFixtures, FIXTURE_NOW } from './fixtures/fetcher.js';
import { fixtureRoot } from './fixtures/paths.js';
import { Site } from './helpers.js';

const GONZALEZ = '/elections/2026-general/mayor/jd-gonzalez/';

/** The page's own summary list, as a reader reads it: heading to value. */
function details($: CheerioAPI): Record<string, string> {
  const out: Record<string, string> = {};
  $('main dl dt').each((i, dt) => {
    out[$(dt).text()] = $('main dl dd').eq(i).text().trim();
  });
  return out;
}

describe('Elections 03: Candidate pages', () => {
  it('opens one Candidate from the Race table and shows the names the city printed', async () => {
    const site = await Site.create();
    await site.build({ fixtures: electionFixtures, now: FIXTURE_NOW, sources: [cityElections] });

    // Every name in the city's table is a way into that candidate's page, in ballot order.
    const race = await site.page('/en/elections/2026-general/mayor/');
    const names = race('table.race-table tbody th a');
    expect(names.map((_, a) => race(a).attr('href')).get()).toEqual([
      '/en/elections/2026-general/mayor/victor-d-trevino/',
      `/en${GONZALEZ}`,
      '/en/elections/2026-general/mayor/jorge-a-garza/',
      '/en/elections/2026-general/mayor/poncho-casso/',
      '/en/elections/2026-general/mayor/alyssa-cigarroa/',
    ]);
    expect(names.first().text()).toBe('Victor D. Trevino');

    // The city named the mayor as his own campaign treasurer, so his row now carries his name
    // twice: once into his page, once into the appointment. Each link still says what it opens.
    const trevino = race('table.race-table tbody tr').eq(0);
    expect(trevino.find('th a').text()).toBe('Victor D. Trevino');
    expect(trevino.find('td.treasurer a').contents().first().text()).toBe('Victor D. Trevino');
    const rowLinks = trevino.find('a').map((_, a) => race(a).text()).get();
    expect(new Set(rowLinks).size).toBe(rowLinks.length);

    const $ = await site.page(`/en${GONZALEZ}`);
    // The name on the ballot heads the page; both names the city printed are on it, as printed.
    expect($('h1').text()).toBe('JD Gonzalez');
    expect(details($)).toMatchObject({
      'Legal name': 'Jose David Gonzalez',
      'Name on ballot': 'JD Gonzalez',
      Race: 'Mayor',
      // The city's own heading for the election, in the city's own capitals.
      Election: 'CITY OF LAREDO 2026 GENERAL ELECTION',
      'Campaign treasurer': 'Sonia Villarreal',
    });
    // The Race and the Election are each one link away, and the city's own page is not claimed as ours.
    expect($('main a[href="/en/elections/2026-general/mayor/"]').length).toBeGreaterThan(0);
    expect($('main a[href="/en/elections/2026-general/"]').length).toBeGreaterThan(0);
  });

  it('lists every Filing the city posted under the name, with a plain label and the date it was last seen live', async () => {
    const site = await Site.create();
    await site.build({ fixtures: electionFixtures, now: FIXTURE_NOW, sources: [cityElections] });
    const $ = await site.page(`/en${GONZALEZ}`);

    const filings = $('ul.filings > li');
    expect(filings.length).toBe(2);
    // The site's own plain label, so a reader knows what the document is before opening it.
    expect(filings.eq(0).find('a').contents().first().text()).toBe('Campaign treasurer appointment');
    expect(filings.eq(0).find('a').attr('href')).toBe('https://www.cityoflaredo.com/home/showpublisheddocument/23926/639203242118170000');
    // The city's own words for the same document, so the reader can match it on the city's page.
    expect(filings.eq(0).find('.note').text()).toBe('Campaign Treasurer Application');
    expect(filings.eq(0).find('.meta').text()).toContain('Sep 16, 2026');
    expect(filings.eq(1).find('a').contents().first().text()).toBe('Application for a place on the ballot');
    expect(filings.eq(1).find('a').attr('href')).toBe('https://www.cityoflaredo.com/home/showpublisheddocument/23928/639203245618530000');
    expect(filings.eq(1).find('.note').text()).toBe('Application for a Place on the Ballot');

    // The city posts two documents of one kind often enough that the plain label alone would name
    // two links the same, so the city's own title for the document is inside the link.
    const linkNames = $('main a').map((_, a) => $(a).text()).get();
    expect(new Set(linkNames).size).toBe(linkNames.length);

    // The fixed sentence: what the page is and is not.
    const neutrality = $('main .neutrality').text();
    expect(neutrality).toContain('City of Laredo');
    expect(neutrality).toMatch(/incumbent/);
    expect(neutrality).toMatch(/opinion/);
    // Nothing the city did not post: no photo, no statement, no outside link.
    expect($('main img')).toHaveLength(0);
    const external = $('main a[href^="http"]').map((_, a) => $(a).attr('href')!).get();
    expect(external.every((url) => url.startsWith('https://www.cityoflaredo.com/'))).toBe(true);
  });

  it('says the same thing in Spanish, with the same names and the same links', async () => {
    const site = await Site.create();
    await site.build({ fixtures: electionFixtures, now: FIXTURE_NOW, sources: [cityElections] });
    const en = await site.page(`/en${GONZALEZ}`);
    const es = await site.page(`/es${GONZALEZ}`);

    // Names and the city's own document titles are never translated.
    expect(es('h1').text()).toBe(en('h1').text());
    // Every value but the election day, which is a date and is written in the reader's language.
    const values = ($: CheerioAPI) =>
      $('main dl dd')
        .filter((_, dd) => $(dd).find('time').length === 0)
        .map((_, dd) => $(dd).text().trim())
        .get();
    expect(values(es)).toEqual(values(en));
    expect(values(en)).toContain('Jose David Gonzalez');
    expect(es('main dl dd time').text()).not.toBe(en('main dl dd time').text());
    expect(es('ul.filings .note').map((_, n) => es(n).text()).get()).toEqual(en('ul.filings .note').map((_, n) => en(n).text()).get());
    const hrefs = ($: CheerioAPI) => $('main ul.filings a').map((_, a) => $(a).attr('href')).get();
    expect(hrefs(es)).toEqual(hrefs(en));

    // Labels, headings, and the neutrality sentence are interface text and are translated.
    expect(es('main dl dt').first().text()).toBe('Nombre legal');
    expect(es('ul.filings > li').eq(0).find('a').contents().first().text()).toBe('Nombramiento de tesorero de campaña');
    expect(es('ul.filings > li').eq(1).find('a').contents().first().text()).toBe('Solicitud de lugar en la boleta');
    expect(es('main .neutrality').text()).not.toBe(en('main .neutrality').text());
    expect(es('main .neutrality').text().length).toBeGreaterThan(20);
  });

  it('finds a Candidate page in search by the legal name and by the name on ballot', async () => {
    const site = await Site.create();
    await site.build({ fixtures: electionFixtures, now: FIXTURE_NOW, sources: [cityElections] });

    const index = JSON.parse(await site.file('/search-index.json')) as { t: string; a?: string; s?: string; o: string; p: string; d: string }[];
    const entries = index.filter((e) => e.s?.startsWith('/elections/'));
    // 16 general Candidates and 3 special (ticket 04); the unnamed District 8 row has no page.
    expect(entries).toHaveLength(19);
    const gonzalez = entries.find((e) => e.s === GONZALEZ)!;
    // The name on the ballot is what a reader sees; the legal name is matched on too.
    expect(gonzalez).toMatchObject({ t: 'JD Gonzalez', a: 'Jose David Gonzalez', o: 'elections', p: 'city-of-laredo', d: '2026-11-03' });

    // The search box folds a hit the way the page does: the shown name plus the name it also
    // answers to, accents stripped. Either name a resident types finds this page.
    const fold = (value: string) =>
      value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    const hit = (query: string) =>
      index.filter((e) => {
        const hay = fold(`${e.t} ${e.a ?? ''}`);
        return fold(query)
          .split(/\s+/)
          .every((word) => hay.includes(word));
      });
    expect(hit('jose david gonzalez').map((e) => e.s)).toEqual([GONZALEZ]);
    expect(hit('JD Gonzalez').map((e) => e.s)).toEqual([GONZALEZ]);
    // Three Treviños across the two Elections (ticket 04); all answer to the accented spelling.
    expect(hit('Treviño').map((e) => e.s)).toEqual([
      '/elections/2026-general/mayor/victor-d-trevino/',
      '/elections/2026-special/district-8/priscilla-gordiloca-trevino/',
      '/elections/2026-special/district-8/mario-trevino/',
    ]);

    // The page sends the reader to the site's own page, in their language, and says that the date
    // on a Candidate hit is election day rather than the day something was posted.
    const script = (await site.page('/es/search/'))('script:not([src])').text();
    expect(script).toContain('it.a');
    expect(script).toContain('"pageHref":"/es"');
    expect(script).toContain('Día de la elección {date}');
  });

  it('derives the slug from the name on ballot: ASCII, hyphenated, numbered when two would collide', async () => {
    // The city prints accents and, on a bad day, the same name on ballot twice in one race.
    const candidates = await readFile(`${fixtureRoot}/city-elections/general-2026-candidates.html`, 'utf8');
    const collision = candidates.replace('Jorge A. Garza', 'JD Gonzáléz');
    expect(collision).not.toBe(candidates);

    const site = await Site.create();
    const { data } = await site.build({
      fixtures: { ...electionFixtures, [GENERAL_CANDIDATES_URL]: collision },
      now: FIXTURE_NOW,
      sources: [cityElections],
    });

    const mayor = data.candidates.filter((c) => c.raceId === 'city-elections:2026-general:mayor').sort((a, b) => a.order - b.order);
    expect(mayor.map((c) => c.slug)).toEqual(['victor-d-trevino', 'jd-gonzalez', 'jd-gonzalez-2', 'poncho-casso', 'alyssa-cigarroa']);
    // Two people, two pages, and the accented name is printed as the city printed it.
    expect(await site.exists(`/en${GONZALEZ}`)).toBe(true);
    const second = await site.page('/en/elections/2026-general/mayor/jd-gonzalez-2/');
    expect(second('h1').text()).toBe('JD Gonzáléz');
    expect(second('main dl dd').first().text().trim()).toBe('Jorge Alberto Garza');
  });

  it('writes a page for every named Candidate in both languages, and none for a row the city has not named', async () => {
    const candidates = await readFile(`${fixtureRoot}/city-elections/general-2026-candidates.html`, 'utf8');
    const unnamed = candidates
      .replace('<td>Alfonso I. Casso</td>', '<td>&nbsp;</td>')
      .replace('<td style="text-align: center;">&nbsp;Poncho Casso</td>', '<td style="text-align: center;">&nbsp;</td>');
    expect(unnamed).not.toBe(candidates);

    const site = await Site.create();
    const { data } = await site.build({
      fixtures: { ...electionFixtures, [GENERAL_CANDIDATES_URL]: unnamed },
      now: FIXTURE_NOW,
      sources: [cityElections],
    });

    expect(data.candidates).toHaveLength(18); // 15 general after the blanked row, plus 3 special
    for (const lang of ['en', 'es'] as const) {
      for (const candidate of data.candidates) {
        const race = data.races.find((r) => r.id === candidate.raceId)!;
        const election = data.elections.find((e) => e.id === race.electionId)!;
        expect(await site.exists(`/${lang}/elections/${election.slug}/${race.slug}/${candidate.slug}/`)).toBe(true);
      }
      // Nobody is named on the row the city left blank, so there is no page and no link to one.
      expect(await site.exists(`/${lang}/elections/2026-general/mayor/poncho-casso/`)).toBe(false);
    }
    const $ = await site.page('/en/elections/2026-general/mayor/');
    expect($('table.race-table tbody tr').eq(3).find('th a')).toHaveLength(0);
    expect($('table.race-table tbody th a')).toHaveLength(4);
  });

  it('names nobody when the city fills a name cell with a placeholder, and keeps the Race page', async () => {
    // A dash in the name cells is data entry, not a name: it would slug to nothing, and a page with
    // no slug of its own would be written over the Race's own page.
    const candidates = await readFile(`${fixtureRoot}/city-elections/general-2026-candidates.html`, 'utf8');
    const dashes = candidates
      .replace('<td>Alfonso I. Casso</td>', '<td>-</td>')
      .replace('<td style="text-align: center;">&nbsp;Poncho Casso</td>', '<td style="text-align: center;">-</td>');
    expect(dashes).not.toBe(candidates);

    const site = await Site.create();
    const log: string[] = [];
    const { data } = await site.build({
      fixtures: { ...electionFixtures, [GENERAL_CANDIDATES_URL]: dashes },
      now: FIXTURE_NOW,
      sources: [cityElections],
      log,
    });

    expect(data.candidates).toHaveLength(18); // 15 general after the blanked row, plus 3 special
    expect(data.candidates.some((c) => c.slug === '')).toBe(false);
    expect(data.races.find((r) => r.slug === 'mayor')!.unnamedRows).toHaveLength(1);
    expect(log.some((l) => /name cell\(s\) hold a placeholder rather than a name/.test(l))).toBe(true);
    // The Race page is still the Race page, with the row shown as not yet posted.
    const $ = await site.page('/en/elections/2026-general/mayor/');
    expect($('h1').text()).toBe('Mayor');
    expect($('table.race-table tbody tr').eq(3).find('th').text()).toBe('Candidate name not yet posted');
  });

  it('heads the page with the legal name when the city leaves the name on ballot blank', async () => {
    const candidates = await readFile(`${fixtureRoot}/city-elections/general-2026-candidates.html`, 'utf8');
    const noBallotName = candidates.replace('<td style="text-align: center;">JD Gonzalez<br>', '<td style="text-align: center;">&nbsp;<br>');
    expect(noBallotName).not.toBe(candidates);

    const site = await Site.create();
    const { data } = await site.build({
      fixtures: { ...electionFixtures, [GENERAL_CANDIDATES_URL]: noBallotName },
      now: FIXTURE_NOW,
      sources: [cityElections],
    });

    // The city named this person, so the page is theirs; its slug comes from the name it did print.
    const gonzalez = data.candidates.find((c) => c.name === 'Jose David Gonzalez')!;
    expect(gonzalez.slug).toBe('jose-david-gonzalez');
    const $ = await site.page('/en/elections/2026-general/mayor/jose-david-gonzalez/');
    expect($('h1').text()).toBe('Jose David Gonzalez');
    expect(details($)['Name on ballot']).toBe('Not posted');
    expect($('ul.filings > li')).toHaveLength(2);
  });
});
