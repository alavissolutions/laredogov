import type { CheerioAPI } from 'cheerio';
import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { cityElections, GENERAL_CANDIDATES_URL } from '../src/sources/city-elections.js';
import { electionFixtures, FIXTURE_NOW } from './fixtures/fetcher.js';
import { fixtureRoot } from './fixtures/paths.js';
import { daysAfter, Site } from './helpers.js';

const ELECTION = 'city-elections:2026-general';

describe('Elections 02: Race pages with the comparison table', () => {
  it('records the city ballot order: six office Races, sixteen named Candidates, and their Filings', async () => {
    const site = await Site.create();
    const { data } = await site.build({ fixtures: electionFixtures, now: FIXTURE_NOW, sources: [cityElections] });

    const offices = data.races.filter((r) => r.kind === 'office');
    expect(offices.map((r) => r.slug)).toEqual(['mayor', 'district-1', 'district-2', 'district-3', 'district-6', 'municipal-court-judge-position-1']);
    // The city's own accordion headings, never translated or re-cased.
    expect(offices.map((r) => r.title)).toEqual(['Mayor', 'District 1', 'District 2', 'District 3', 'District 6', 'Municipal Court Judge - Position 1']);
    expect(offices.every((r) => r.electionId === ELECTION)).toBe(true);
    expect(offices[0]!.id).toBe(`${ELECTION}:mayor`);

    expect(data.candidates).toHaveLength(16);
    const inRace = (slug: string) =>
      data.candidates.filter((c) => c.raceId === `${ELECTION}:${slug}`).sort((a, b) => a.order - b.order);
    // Ballot order, and the legal names exactly as the city prints them.
    expect(inRace('mayor').map((c) => c.name)).toEqual([
      'Victor Daniel Trevino',
      'Jose David Gonzalez',
      'Jorge Alberto Garza',
      'Alfonso I. Casso',
      'Alyssa Cristine Cigarroa',
    ]);
    expect(inRace('district-1').map((c) => c.ballotName)).toEqual(['Lupe De Leon Jr', 'Gilbert Gonzalez']);
    expect(inRace('municipal-court-judge-position-1').map((c) => c.ballotName)).toEqual(['Nathan Henry Chu', 'Rudy Morales III']);

    // Candidate identity is the Election, the Race, and the legal name the city printed.
    const gonzalez = inRace('mayor')[1]!;
    expect(gonzalez.id).toBe(`${ELECTION}:mayor:jose-david-gonzalez`);
    expect(gonzalez.slug).toBe('jd-gonzalez');
    expect(gonzalez.ballotName).toBe('JD Gonzalez');
    expect(gonzalez.treasurer).toBe('Sonia Villarreal');
    expect(gonzalez.firstSeen).toBe(FIXTURE_NOW.toISOString());

    // The kind of each Filing comes from the table column and the city's anchor title.
    const filings = gonzalez.filings.map((id) => data.filings.find((f) => f.id === id)!);
    expect(filings.map((f) => f.kind)).toEqual(['treasurer-appointment', 'ballot-application']);
    expect(filings[0]).toMatchObject({
      id: 'city-elections:filing:23926',
      documentId: '23926',
      url: 'https://www.cityoflaredo.com/home/showpublisheddocument/23926/639203242118170000',
      candidateId: gonzalez.id,
      raceId: `${ELECTION}:mayor`,
      office: 'Mayor',
      label: 'Campaign Treasurer Application',
    });
    expect(filings[1]).toMatchObject({ documentId: '23928', kind: 'ballot-application', label: 'Application for a Place on the Ballot' });
    // One Filing per document the city links in the six tables: a treasurer appointment and an
    // application for each of the sixteen Candidates.
    expect(data.filings).toHaveLength(32);
  });

  it('renders a Race page in both languages with the city table in ballot order', async () => {
    const site = await Site.create();
    await site.build({ fixtures: electionFixtures, now: FIXTURE_NOW, sources: [cityElections] });

    for (const lang of ['en', 'es'] as const) {
      const $ = await site.page(`/${lang}/elections/2026-general/mayor/`);
      expect($('h1').text()).toBe('Mayor');
      // The Election the Race belongs to is one link away.
      expect($(`main a[href="/${lang}/elections/2026-general/"]`).length).toBeGreaterThan(0);

      const rows = $('table.race-table tbody tr');
      expect(rows.length).toBe(5);
      expect(rows.map((_, tr) => $(tr).find('th').first().text()).get()).toEqual([
        'Victor D. Trevino',
        'JD Gonzalez',
        'Jorge A. Garza',
        'Poncho Casso',
        'Alyssa Cigarroa',
      ]);
      // The treasurer cell is the city's own link text: the treasurer it named.
      const gonzalez = rows.eq(1);
      const treasurer = gonzalez.find('td.treasurer a');
      // The visible text is the treasurer's name; the link says which document it opens as well,
      // because a candidate who appointed themselves is named twice in the same row (issue 03).
      expect(treasurer.contents().first().text()).toBe('Sonia Villarreal');
      expect(treasurer.attr('href')).toBe('https://www.cityoflaredo.com/home/showpublisheddocument/23926/639203242118170000');
      expect(gonzalez.find('td.application a').attr('href')).toBe('https://www.cityoflaredo.com/home/showpublisheddocument/23928/639203245618530000');
      // Every link has its own accessible name, so "View" never stands alone out of context.
      const names = $('table.race-table a').map((_, a) => $(a).text()).get();
      expect(new Set(names).size).toBe(names.length);

      // The table scrolls inside its own container on a phone rather than widening the page.
      expect($('table.race-table').parent().hasClass('table-scroll')).toBe(true);
      // Column headings and the neutrality sentence are interface text and are translated.
      const headings = $('table.race-table thead th').map((_, th) => $(th).text()).get();
      expect(headings[0]).toBe(lang === 'es' ? 'Nombre en la boleta' : 'Name on ballot');
      expect($('.neutrality').text().length).toBeGreaterThan(20);
    }

    const style = await site.file('/style.css');
    // Positioned so the visually hidden caption inside it is clipped with the table rather than
    // pushing the whole page sideways on a phone.
    expect(style).toContain('.table-scroll{position:relative;overflow-x:auto');
    // The table keeps a floor wider than a phone, so it overflows into the scrolling container
    // instead of squeezing the city's names into one letter per line.
    expect(style).toContain('.race-table{border-collapse:collapse;min-width:34rem');

    // The same people, the same city documents, and the same numbers in both languages. The links
    // into this site's own Candidate pages differ only by the reader's language tree (issue 03).
    const cityLinks = ($: CheerioAPI) =>
      $('table.race-table a')
        .map((_, a) => $(a).attr('href')!)
        .get()
        .filter((url) => url.startsWith('http'));
    const es = await site.page('/es/elections/2026-general/mayor/');
    const en = await site.page('/en/elections/2026-general/mayor/');
    expect(cityLinks(es)).toEqual(cityLinks(en));
    expect(cityLinks(en)).toHaveLength(10);
    const own = ($: CheerioAPI, lang: string) =>
      $('table.race-table tbody th a')
        .map((_, a) => $(a).attr('href')!)
        .get()
        .every((url) => url.startsWith(`/${lang}/elections/`));
    expect(own(es, 'es')).toBe(true);
    expect(own(en, 'en')).toBe(true);
  });

  it('opens every Race from the Election page, in the city ballot order', async () => {
    const site = await Site.create();
    await site.build({ fixtures: electionFixtures, now: FIXTURE_NOW, sources: [cityElections] });

    const $ = await site.page('/en/elections/2026-general/');
    const races = $('.races-list a');
    expect(races.map((_, a) => $(a).attr('href')).get()).toEqual([
      '/en/elections/2026-general/mayor/',
      '/en/elections/2026-general/district-1/',
      '/en/elections/2026-general/district-2/',
      '/en/elections/2026-general/district-3/',
      '/en/elections/2026-general/district-6/',
      '/en/elections/2026-general/municipal-court-judge-position-1/',
      '/en/elections/2026-general/pediatric-hospital-services/',
    ]);
    expect(races.first().text()).toBe('Mayor');
    // Every Race page is written, in both languages.
    for (const lang of ['en', 'es'] as const) {
      for (const slug of ['mayor', 'district-1', 'district-2', 'district-3', 'district-6', 'municipal-court-judge-position-1']) {
        expect(await site.exists(`/${lang}/elections/2026-general/${slug}/`)).toBe(true);
      }
    }
  });

  it('shows the non-binding question as a Race with the city ordinance linked', async () => {
    const site = await Site.create();
    const { data } = await site.build({ fixtures: electionFixtures, now: FIXTURE_NOW, sources: [cityElections] });

    const question = data.races.find((r) => r.kind === 'question')!;
    expect(question.id).toBe(`${ELECTION}:pediatric-hospital-services`);
    // The city's own sub-label on the button it links the resolution from.
    expect(question.title).toBe('Non-Binding Election-Pediatric Hospital Services');
    expect(question.question).toEqual({
      label: 'Election Ordinance',
      url: 'https://www.cityoflaredo.com/home/showdocument?id=24357&t=639237901400846155',
    });
    expect(data.candidates.filter((c) => c.raceId === question.id)).toHaveLength(0);

    for (const lang of ['en', 'es'] as const) {
      const $ = await site.page(`/${lang}/elections/2026-general/pediatric-hospital-services/`);
      expect($('h1').text()).toBe('Non-Binding Election-Pediatric Hospital Services');
      const link = $('main .link-list a');
      expect(link.attr('href')).toBe('https://www.cityoflaredo.com/home/showdocument?id=24357&t=639237901400846155');
      expect(link.text()).toContain('Election Ordinance');
      // A question has no candidates, so there is no comparison table to show, and the page does
      // not describe itself as being about candidates.
      expect($('table.race-table').length).toBe(0);
      const description = $('meta[name="description"]').attr('content')!;
      expect(description).not.toMatch(lang === 'es' ? /candidato/ : /candidate/);
      expect(description).toMatch(lang === 'es' ? /^Una pregunta/ : /^A question/);
    }
  });

  it('files no Item for a ballot application or a treasurer appointment, and keeps one id per city document', async () => {
    const site = await Site.create();
    const { data } = await site.build({ fixtures: electionFixtures, now: FIXTURE_NOW, sources: [cityElections] });

    // The city prints no date beside these, so they are Filings and nothing else (CONTEXT.md).
    const filingUrls = new Set(data.filings.map((f) => f.url));
    expect(data.items.filter((i) => filingUrls.has(i.url))).toHaveLength(0);
    expect(data.items.filter((i) => i.source === 'city-elections')).toHaveLength(5);

    // The same document written the city's other way, with no cache-busting ticks, is one Filing.
    const candidates = await readFile(`${fixtureRoot}/city-elections/general-2026-candidates.html`, 'utf8');
    const rewritten = candidates.replace(
      '/home/showpublisheddocument/23928/639203245618530000',
      '/home/showdocument?id=23928&amp;t=639203245618530001',
    );
    expect(rewritten).not.toBe(candidates);
    const again = await site.build({
      fixtures: { ...electionFixtures, [GENERAL_CANDIDATES_URL]: rewritten },
      now: daysAfter(FIXTURE_NOW, 1),
      sources: [cityElections],
    });
    expect(again.report.newItems).toBe(0);
    expect(again.data.filings).toHaveLength(32);
    expect(again.data.candidates).toHaveLength(16);
    expect(again.data.races).toHaveLength(7);
    const filing = again.data.filings.find((f) => f.documentId === '23928')!;
    expect(filing.id).toBe('city-elections:filing:23928');
    expect(filing.firstSeen).toBe(FIXTURE_NOW.toISOString());
    expect(filing.url).toBe('https://www.cityoflaredo.com/home/showdocument?id=23928&t=639203245618530001');
  });

  it('shows a row the city has not named as not yet posted, and names nobody', async () => {
    // The city does exactly this on its special election page: a row with only a treasurer
    // appointment, whose filename names a person the page does not. This is the recorded general
    // page with one row's two name cells emptied the same way.
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

    // Nobody is named: no Candidate is created, and the treasurer is not turned into one.
    expect(data.candidates).toHaveLength(15);
    expect(data.candidates.some((c) => /Casso/.test(`${c.name} ${c.ballotName}`))).toBe(false);
    const mayor = data.races.find((r) => r.id === `${ELECTION}:mayor`)!;
    expect(mayor.unnamedRows).toHaveLength(1);
    expect(mayor.unnamedRows[0]!.treasurer).toBe('Alfonso I. "Poncho" Casso');
    // The documents the city did post on that row are still Filings, so nothing is hidden.
    expect(mayor.unnamedRows[0]!.filings).toEqual(['city-elections:filing:24063', 'city-elections:filing:24065']);
    expect(data.filings.find((f) => f.id === 'city-elections:filing:24063')!.candidateId).toBeUndefined();

    const $ = await site.page('/en/elections/2026-general/mayor/');
    const rows = $('table.race-table tbody tr');
    expect(rows.length).toBe(5);
    // Still in the city's ballot order, fourth as the city printed it.
    expect(rows.eq(3).hasClass('unnamed')).toBe(true);
    expect(rows.eq(3).find('th').text()).toBe('Candidate name not yet posted');
    expect(rows.eq(3).find('td.treasurer a').contents().first().text()).toBe('Alfonso I. "Poncho" Casso');
    expect(rows.eq(3).find('td.application a').attr('href')).toBe('https://www.cityoflaredo.com/home/showpublisheddocument/24065/639214600658800000');
    expect($('main').text()).not.toContain('Poncho Casso,');
    const es = await site.page('/es/elections/2026-general/mayor/');
    expect(es('table.race-table tbody tr').eq(3).find('th').text()).toBe('Nombre del candidato aún no publicado');
  });

  it('reads the candidates sub-page once, counts what it found, and leaves out a link the city mis-titles', async () => {
    const site = await Site.create();
    const log: string[] = [];
    const { requests } = await site.build({ fixtures: electionFixtures, now: FIXTURE_NOW, sources: [cityElections], log });
    expect(requests.filter((r) => r.url === GENERAL_CANDIDATES_URL)).toHaveLength(1);
    expect(log).toContain('city-elections: 7 Races (6 offices, 1 question), 16 Candidates, 0 rows the city has not named, 32 Filings');

    // A Filing's kind comes from the column and the city's own anchor title. A link the city titles
    // as something else is not filed as a guess, and the owner is told (the filename is never read).
    const candidates = await readFile(`${fixtureRoot}/city-elections/general-2026-candidates.html`, 'utf8');
    const retitled = candidates.replace(
      '<a href="/home/showpublisheddocument/23928/639203245618530000" target="_blank" rel="noopener" title="Application for a Place on the Ballot">',
      '<a href="/home/showpublisheddocument/23928/639203245618530000" target="_blank" rel="noopener" title="Candidate Photo">',
    );
    expect(retitled).not.toBe(candidates);

    const other = await Site.create();
    const otherLog: string[] = [];
    const { data } = await other.build({
      fixtures: { ...electionFixtures, [GENERAL_CANDIDATES_URL]: retitled },
      now: FIXTURE_NOW,
      sources: [cityElections],
      log: otherLog,
    });
    expect(data.filings.some((f) => f.documentId === '23928')).toBe(false);
    expect(data.filings).toHaveLength(31);
    expect(otherLog.some((l) => /1 link\(s\) in the candidate tables are not titled as the column/.test(l))).toBe(true);
  });

  it('keeps one Filing when the city links one document from two rows, and tells the owner', async () => {
    // The city's own data entry: District 1's second application link pointed at the mayoral
    // candidate's document. Identity is the document id, so that is one Filing, not two.
    const candidates = await readFile(`${fixtureRoot}/city-elections/general-2026-candidates.html`, 'utf8');
    const twice = candidates.replace('/home/showpublisheddocument/24067/639214606441070000', '/home/showpublisheddocument/23928/639203245618530000');
    expect(twice).not.toBe(candidates);

    const site = await Site.create();
    const log: string[] = [];
    const { data } = await site.build({ fixtures: { ...electionFixtures, [GENERAL_CANDIDATES_URL]: twice }, now: FIXTURE_NOW, sources: [cityElections], log });

    expect(new Set(data.filings.map((f) => f.id)).size).toBe(data.filings.length);
    expect(data.filings).toHaveLength(31);
    expect(data.filings.filter((f) => f.documentId === '23928')).toHaveLength(1);
    expect(log.some((l) => /document 23928 is linked twice in District 1/.test(l))).toBe(true);
  });

  it('names a Candidate the city named in only one of its two name cells, and says which is blank', async () => {
    const candidates = await readFile(`${fixtureRoot}/city-elections/general-2026-candidates.html`, 'utf8');
    const ballotOnly = candidates.replace('<td>Jorge Alberto Garza<br>', '<td>&nbsp;<br>');
    expect(ballotOnly).not.toBe(candidates);

    const site = await Site.create();
    const log: string[] = [];
    const { data } = await site.build({
      fixtures: { ...electionFixtures, [GENERAL_CANDIDATES_URL]: ballotOnly },
      now: FIXTURE_NOW,
      sources: [cityElections],
      log,
    });

    // The city named this person, so the site names them too, under the name the city printed.
    expect(data.candidates).toHaveLength(16);
    const garza = data.candidates.find((c) => c.slug === 'jorge-a-garza')!;
    expect(garza.name).toBe('Jorge A. Garza');
    expect(garza.ballotName).toBe('Jorge A. Garza');
    expect(data.races.find((r) => r.slug === 'mayor')!.unnamedRows).toHaveLength(0);
    expect(log.some((l) => /"Jorge A. Garza" in Mayor has no legal name/.test(l))).toBe(true);

    const $ = await site.page('/en/elections/2026-general/mayor/');
    expect($('table.race-table tbody tr').eq(2).find('th').text()).toBe('Jorge A. Garza');
  });
});
