import { access } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { loadHandKept } from '../src/elections/hand-kept.js';
import { cityElections } from '../src/sources/city-elections.js';
import { CAMPAIGN_FINANCE_URL, cityFinance } from '../src/sources/city-finance.js';
import { electionFixtures, financeFixtures, FIXTURE_NOW } from './fixtures/fetcher.js';
import { daysAfter, Site } from './helpers.js';

const ELECTION = 'city-elections:2026-general';
const fixtures = { ...electionFixtures, ...financeFixtures };

describe('Elections 05: campaign finance reports attached by Alias', () => {
  it('records every report the city posted, with the period and the office the city filed it under', async () => {
    const site = await Site.create();
    const { data } = await site.build({ fixtures, now: FIXTURE_NOW, sources: [cityElections, cityFinance] });

    // No hand-kept file here: a missing one means no Aliases, and the build leaves none behind.
    await expect(access(site.handKeptFile)).rejects.toThrow();

    const reports = data.filings.filter((f) => f.kind === 'finance-report');
    // One Filing per document the city links on its finance page, back to 2015.
    expect(reports).toHaveLength(504);
    expect(reports.every((f) => f.source === 'city-finance' && f.publisher === 'city-of-laredo')).toBe(true);

    // The sitting District 1 council member's July 2026 report: the city's own spelling of the
    // name, its own heading for the filing period, and the office it filed the report under.
    const gonzalez = reports.find((f) => f.documentId === '23838')!;
    expect(gonzalez).toMatchObject({
      id: 'city-finance:filing:23838',
      kind: 'finance-report',
      filerName: 'Gilbert Gonzalez',
      office: 'District 1',
      label: 'Campaign Finance Report',
      period: { label: 'July 15, 2026', date: '2026-07-15' },
      url: 'https://www.cityoflaredo.com/home/showpublisheddocument/23838/639197320934130000',
    });
  });

  it('attaches a report only when the city spells the name exactly as it spelled the Candidate', async () => {
    const site = await Site.create();
    const { data } = await site.build({ fixtures, now: FIXTURE_NOW, sources: [cityElections, cityFinance] });
    const report = (documentId: string) => data.filings.find((f) => f.documentId === documentId)!;

    // The city spells the District 1 candidate "Gilbert Gonzalez" on its finance page and on the
    // ballot line of its candidate table, so his reports attach with no Alias declared at all.
    const district1 = data.candidates.find((c) => c.id === `${ELECTION}:district-1:gilberto-gonzalez`)!;
    expect(district1.ballotName).toBe('Gilbert Gonzalez');
    expect(report('23838').attachedTo).toEqual([district1.id]);
    // And an older report the city posted under his legal name attaches to the same Candidate.
    expect(report('3176')).toMatchObject({ filerName: 'Gilberto Gonzalez', attachedTo: [district1.id] });

    // A sitting officeholder running for another office: the city filed Alyssa Cigarroa's report
    // under District 8, and it attaches to her Mayor Candidate under the office the city used.
    const mayor = data.candidates.find((c) => c.id === `${ELECTION}:mayor:alyssa-cristine-cigarroa`)!;
    expect(report('23812')).toMatchObject({ office: 'District 8', attachedTo: [mayor.id] });

    // The city writes the mayor "Dr. Victor D. Treviño" on its finance page and "Victor Daniel
    // Trevino" in its candidate table. Nothing is normalised (ADR-0005), so it stays unattached
    // until the owner declares that spelling.
    expect(report('23842')).toMatchObject({ filerName: 'Dr. Victor D. Treviño', office: 'Mayor' });
    expect(report('23842').attachedTo).toBeUndefined();
  });

  it('attaches a report the owner declared an Alias for, and reads the hand-kept file without writing it', async () => {
    const site = await Site.create();
    const mayor = `${ELECTION}:mayor:victor-daniel-trevino`;
    // The owner's file: one spelling the city uses on its finance page, declared under a Candidate.
    await site.writeHandKept(`# the owner's file, never written by the build (ADR-0005)
aliases:
  ${mayor}:
    - Dr. Victor D. Treviño
verified:
  - 23842
`);
    const log: string[] = [];
    const { data } = await site.build({ fixtures, now: FIXTURE_NOW, sources: [cityElections, cityFinance], log });

    const trevino = data.filings.find((f) => f.documentId === '23842')!;
    expect(trevino.attachedTo).toEqual([mayor]);
    // Every year the city posted under that spelling follows the same declaration.
    expect(data.filings.filter((f) => f.attachedTo?.includes(mayor)).length).toBeGreaterThan(1);
    // The owner is told the file was read, so a file the build cannot see is obvious in the log.
    expect(log.join('\n')).toContain('city-finance: 1 Candidate with a declared Alias, 1 verified document id');
    // The build never writes the owner's file.
    expect(await site.handKept()).toContain('- Dr. Victor D. Treviño');
  });

  it('files reports the city posted since the election opened as Items, and older ones without one', async () => {
    const site = await Site.create();
    const log: string[] = [];
    const { data } = await site.build({ fixtures, now: FIXTURE_NOW, sources: [cityElections, cityFinance], log });

    // The city's own calendar for the 2026 general election opens on November 3, 2025, so the two
    // 2026 filing deadlines are this election's news and the decade before it is the record.
    const items = data.items.filter((i) => i.source === 'city-finance');
    expect(items).toHaveLength(21);
    expect(items.every((i) => i.topic === 'elections' && i.publisher === 'city-of-laredo')).toBe(true);
    expect(new Set(items.map((i) => i.date))).toEqual(new Set(['2026-07-15', '2026-01-15']));

    const gonzalez = items.find((i) => i.id === 'city-finance:doc:23838')!;
    expect(gonzalez).toMatchObject({
      // Titled from the city's own words for the link and its own spelling of the filer's name.
      title: 'Campaign Finance Report: Gilbert Gonzalez',
      // Dated by the city's filing-deadline heading, not by when the site saw it.
      date: '2026-07-15',
      url: 'https://www.cityoflaredo.com/home/showpublisheddocument/23838/639197320934130000',
    });

    // A report from before this election is still a Filing; it is simply not news.
    expect(data.filings.some((f) => f.documentId === '20943' && f.period?.date === '2025-07-15')).toBe(true);
    expect(data.items.some((i) => i.id === 'city-finance:doc:20943')).toBe(false);

    // The Elections RSS carries it with the city's own date.
    const rss = await site.file('/en/topics/elections/feed.xml');
    expect(rss).toContain('<title>Campaign Finance Report: Gilbert Gonzalez</title>');
    expect(rss).toContain(new Date('2026-07-15T00:00:00-05:00').toUTCString());
    expect(rss).not.toContain('2025-07-15');

    expect(log.join('\n')).toContain('city-finance: 504 finance reports over 38 filing periods');

    // A second build re-reads the page, adds nothing, and asks for it once.
    const again = await site.build({ fixtures, now: daysAfter(FIXTURE_NOW, 1), sources: [cityElections, cityFinance] });
    expect(again.report.newItems).toBe(0);
    expect(again.requests.filter((r) => r.url === CAMPAIGN_FINANCE_URL)).toHaveLength(1);
  });

  it('gives the Race table a column per filing period, in date order, in both languages', async () => {
    const site = await Site.create();
    await site.build({ fixtures, now: FIXTURE_NOW, sources: [cityElections, cityFinance] });

    for (const lang of ['en', 'es'] as const) {
      const $ = await site.page(`/${lang}/elections/2026-general/district-1/`);
      // One column per filing period the city has a heading for since this election opened.
      const periods = $('table.race-table thead th.finance');
      expect(periods.map((_, th) => $(th).find('time').attr('datetime')).get()).toEqual(['2026-01-15', '2026-07-15']);
      // The heading says what the column is as well as which deadline, and reads as two words.
      expect(periods.eq(1).text()).toBe(
        `${lang === 'es' ? 'Informe de finanzas de campaña 15 jul 2026' : 'Campaign finance report Jul 15, 2026'}`,
      );

      const rows = $('table.race-table tbody tr');
      expect(rows.eq(0).find('th').text()).toBe('Lupe De Leon Jr');
      // The city has posted no report under a name this candidate is listed by, and the cell says
      // exactly that: a report the city posted under a spelling nobody has declared is not "not
      // posted", it is under the table with the city's own spelling (ADR-0005).
      expect(rows.eq(0).find('td.finance').map((_, td) => $(td).find('a').length).get()).toEqual([0, 0]);
      expect(rows.eq(0).find('td.finance').eq(1).text()).toContain(lang === 'es' ? 'Ningún informe bajo este nombre' : 'No report under this name');

      // The sitting District 1 member's own reports, each under the deadline the city filed it under.
      const gonzalez = rows.eq(1);
      expect(gonzalez.find('th').text()).toBe('Gilbert Gonzalez');
      expect(gonzalez.find('td.finance a').map((_, a) => $(a).attr('href')).get()).toEqual([
        'https://www.cityoflaredo.com/home/showpublisheddocument/22178/639040911917700000',
        'https://www.cityoflaredo.com/home/showpublisheddocument/23838/639197320934130000',
      ]);
      expect(gonzalez.find('td.finance a').first().text()).toContain(lang === 'es' ? 'Informe presentado' : 'Report filed');
      // Nothing on the page calls anyone an incumbent (spec: no label the city does not print).
      expect($('main').text().toLowerCase()).not.toContain('incumbent');
      expect($('main').text().toLowerCase()).not.toContain('titular');
    }

    // The city listed Alyssa Cigarroa under January 15, 2026 with a link that opens nothing, so her
    // row reads as not posted for that period and carries her July report.
    const mayor = await site.page('/en/elections/2026-general/mayor/');
    const cigarroa = mayor('table.race-table tbody tr').filter((_, tr) => mayor(tr).find('th').text() === 'Alyssa Cigarroa');
    expect(cigarroa.find('td.finance').eq(0).find('a').length).toBe(0);
    expect(cigarroa.find('td.finance').eq(1).find('a').attr('href')).toBe(
      'https://www.cityoflaredo.com/home/showpublisheddocument/23812/639197300666370000',
    );
  });

  it('shows a report that matches no Candidate under the Race table and names it in the run log', async () => {
    const site = await Site.create();
    const log: string[] = [];
    await site.build({ fixtures, now: FIXTURE_NOW, sources: [cityElections, cityFinance], log });

    // The owner is told, with the city's own spelling, office and deadline, what to declare.
    expect(log).toContain(
      'city-finance: no Candidate answers to "Dr. Victor D. Treviño" (Mayor, July 15, 2026); declare it as an Alias to attach it',
    );
    // A name the city listed with a link that opens nothing is called out as well.
    expect(log.join('\n')).toContain('"Alyssa Cigarroa" (District 8, January 15, 2026)');

    // Nothing the city published is hidden by this site's bookkeeping: the unattached reports for
    // the periods the table shows are listed under it, as the city spells them, with their links.
    const $ = await site.page('/en/elections/2026-general/mayor/');
    const unmatched = $('.unmatched-reports li');
    expect(unmatched.length).toBe(18);
    const trevino = unmatched.filter((_, li) => $(li).text().includes('Dr. Victor D. Treviño')).first();
    expect(trevino.find('a').attr('href')).toBe('https://www.cityoflaredo.com/home/showpublisheddocument/23842/639197964593700000');
    expect(trevino.text()).toContain('Mayor');
    expect(unmatched.text()).toContain('Ricardo "Rick" Garza');

    // Once the owner declares the spelling, every report the city posted under it moves out of the
    // list and onto the Candidate: the city spells him the same way under both 2026 deadlines.
    await site.writeHandKept(`aliases:\n  ${ELECTION}:mayor:victor-daniel-trevino:\n    - Dr. Victor D. Treviño\n`);
    await site.build({ fixtures, now: daysAfter(FIXTURE_NOW, 1), sources: [cityElections, cityFinance] });
    const after = await site.page('/en/elections/2026-general/mayor/');
    expect(after('.unmatched-reports li').length).toBe(16);
    expect(after('.unmatched-reports').text()).not.toContain('Treviño');
  });

  it('lists a Candidate\u2019s finance reports with the period and the office the city filed them under', async () => {
    const site = await Site.create();
    await site.build({ fixtures, now: FIXTURE_NOW, sources: [cityElections, cityFinance] });

    for (const lang of ['en', 'es'] as const) {
      const $ = await site.page(`/${lang}/elections/2026-general/district-1/gilbert-gonzalez/`);
      const reports = $('.filings li.finance-report');
      // Every report the city has posted under a name this candidate answers to, newest first.
      expect(reports.length).toBe(14);
      expect(reports.eq(0).find('a').attr('href')).toBe('https://www.cityoflaredo.com/home/showpublisheddocument/23838/639197320934130000');
      expect(reports.eq(0).find('time.period').attr('datetime')).toBe('2026-07-15');
      // Filed as an officeholder: the office the city filed it under, in the city's words.
      expect(reports.eq(0).find('.note').text()).toContain('District 1');
      expect(reports.eq(0).text()).toContain(lang === 'es' ? 'Informe de finanzas de campaña' : 'Campaign finance report');
      expect(reports.eq(13).find('time.period').attr('datetime')).toBe('2021-07-15');
      // Under January 15, 2023 the city wrote the office inside the link ("District 1 - Gilbert
      // Gonzalez"), so the name comes out of it and the office is still the city's own word.
      const jan2023 = reports.filter((_, li) => $(li).find('time.period').attr('datetime') === '2023-01-15');
      expect(jan2023.find('a').attr('href')).toBe('https://www.cityoflaredo.com/home/showpublisheddocument/3200/638156115172300000');
      expect(jan2023.find('.note').text()).toBe('District 1');
      // A report filed as an officeholder carries the office, and no label of this site's own: the
      // only mention of "incumbent" on the page is the sentence promising not to use one.
      expect(reports.text().toLowerCase()).not.toContain(lang === 'es' ? 'titular' : 'incumbent');
      expect($('.neutrality').text().toLowerCase()).toContain(lang === 'es' ? 'titular' : 'incumbent');
      // The treasurer appointment and the ballot application the city put in its table are still
      // first: this list is everything the city posted under the name, in one place.
      expect($('.filings li').length).toBe(16);
    }

    // A candidate the city has posted no finance report for says so rather than showing a gap.
    const chu = await site.page('/en/elections/2026-general/municipal-court-judge-position-1/nathan-henry-chu/');
    expect(chu('.filings li.finance-report').length).toBe(0);
    expect(chu('.finance-reports-empty').text()).toContain('no campaign finance report');
  });

  it('attaches one report to the same person in two Elections', async () => {
    const site = await Site.create();
    // What the city election Source leaves behind once a person has filed in two Elections: two
    // Candidates, because a Candidate is an Election, a Race, and a name (CONTEXT.md).
    const stamp = FIXTURE_NOW.toISOString();
    const stamps = { firstSeen: stamp, lastSeenLive: stamp, publisher: 'city-of-laredo' as const, source: 'city-elections' };
    const elections = ['2026-general', '2026-special'].map((slug) => ({
      id: `city-elections:${slug}`,
      slug,
      title: `CITY OF LAREDO ${slug}`,
      date: slug === '2026-general' ? '2026-11-03' : '2026-12-05',
      url: `https://www.cityoflaredo.com/departments/${slug}`,
      calendar: [{ date: '2025-11-03', label: 'Monday, November 03, 2025', description: 'Deadline to post candidate requirements on website' }],
      links: [],
      forums: [],
      ...stamps,
    }));
    const races = elections.map((election) => ({
      id: `${election.id}:district-8`,
      electionId: election.id,
      slug: 'district-8',
      title: 'District 8',
      kind: 'office' as const,
      order: 0,
      unnamedRows: [],
      ...stamps,
    }));
    const candidates = races.map((race) => ({
      id: `${race.id}:alyssa-cigarroa`,
      raceId: race.id,
      electionId: race.electionId,
      slug: 'alyssa-cigarroa',
      name: 'Alyssa Cigarroa',
      ballotName: 'Alyssa Cigarroa',
      order: 0,
      filings: [],
      ...stamps,
    }));
    await site.writeData({ version: 1, items: [], meetings: [], bodies: [], elections, races, candidates, filings: [], sources: {} });

    const { data } = await site.build({ fixtures: financeFixtures, now: FIXTURE_NOW, sources: [cityFinance] });

    // One document is one Filing wherever it belongs, and it belongs to both Candidates.
    const report = data.filings.filter((f) => f.documentId === '23812');
    expect(report).toHaveLength(1);
    expect(report[0]!.attachedTo).toEqual(candidates.map((c) => c.id));
    for (const slug of ['2026-general', '2026-special']) {
      const $ = await site.page(`/en/elections/${slug}/district-8/alyssa-cigarroa/`);
      expect($('.filings li.finance-report a').first().attr('href')).toBe(
        'https://www.cityoflaredo.com/home/showpublisheddocument/23812/639197300666370000',
      );
    }
  });

  it('lists the campaign finance Source in the Directory in both languages', async () => {
    const site = await Site.create();
    await site.build({ fixtures, now: FIXTURE_NOW, sources: [cityElections, cityFinance] });

    const en = await site.page('/en/directory/');
    const entry = en('#city-finance');
    expect(entry.find('h3').text()).toBe('Campaign finance reports');
    expect(entry.find('.kind').text()).toMatch(/^Feed/);
    expect(entry.find(`a[href="${CAMPAIGN_FINANCE_URL}"]`)).toHaveLength(1);
    expect(entry.text()).toContain('filed with the City Secretary since 2015');
    // What the reader is told about how this site files it: one Item per report, dated by the
    // city's own deadline, and attachment only by an exact name or a declared spelling.
    expect(entry.text()).toContain('January 15 and July 15');
    expect(entry.text()).toContain('only when the name matches exactly');

    const es = await site.page('/es/directory/');
    expect(es('#city-finance h3').text()).toBe('Informes de finanzas de campaña');
    expect(es('#city-finance').text()).toContain('15 de enero y el 15 de julio');
  });

  it('fails only the finance Source when the owner\u2019s file cannot be read, and publishes the rest', async () => {
    const site = await Site.create();
    await site.writeHandKept('aliases:\n  - Dr. Victor D. Treviño\n');
    const log: string[] = [];
    const { data, report } = await site.build({ fixtures, now: FIXTURE_NOW, sources: [cityElections, cityFinance], log });

    expect(report.failed).toEqual(['city-finance']);
    expect(log.join('\n')).toContain('city-finance: FAILED');
    expect(log.join('\n')).toContain('line 2: a list item outside');
    // The election pages still published, and the Race pages still show the city's tables: both
    // Elections, sixteen Candidates in the general and three in the special.
    expect(data.candidates.length).toBe(19);
    expect(data.elections).toHaveLength(2);
    expect(data.filings.every((f) => f.kind !== 'finance-report')).toBe(true);
    const $ = await site.page('/en/elections/2026-general/district-1/');
    expect($('table.race-table tbody tr').length).toBe(2);
    expect($('table.race-table thead th.finance').length).toBe(0);
  });

  it('reads the committed hand-kept file and tells the owner about an Alias declared under nobody', async () => {
    // The file that ships with the repo has to parse, or the live build fails every run.
    const shipped = await loadHandKept('data/elections.yaml');
    expect(shipped.aliases.size).toBe(0);
    expect(shipped.verified.size).toBe(0);

    const site = await Site.create();
    await site.writeHandKept('aliases:\n  city-elections:2026-general:mayor:nobody-at-all:\n    - Dr. Victor D. Treviño\n');
    const log: string[] = [];
    const { data } = await site.build({ fixtures, now: FIXTURE_NOW, sources: [cityElections, cityFinance], log });

    expect(log.join('\n')).toContain('"city-elections:2026-general:mayor:nobody-at-all"');
    expect(log.join('\n')).toContain('is no Candidate, so its Alias attaches nothing');
    expect(data.filings.find((f) => f.documentId === '23842')!.attachedTo).toBeUndefined();
  });
});
