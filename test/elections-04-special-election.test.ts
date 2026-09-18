import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { parseNumericDate } from '../src/dates.js';
import { cityElections, SPECIAL_CANDIDATES_URL, SPECIAL_ELECTION_URL } from '../src/sources/city-elections.js';
import { electionFixtures, FIXTURE_NOW } from './fixtures/fetcher.js';
import { fixtureRoot } from './fixtures/paths.js';
import { daysAfter, newPanelTitles, Site } from './helpers.js';

const GENERAL = 'city-elections:2026-general';
const SPECIAL = 'city-elections:2026-special';
const DISTRICT_8 = `${SPECIAL}:district-8`;
const SPECIAL_PATH = '/elections/2026-special/';

describe('Elections 04: the special election through the same path', () => {
  it('records the December 5 special election as a second Election, from the same adapter', async () => {
    const site = await Site.create();
    const { data } = await site.build({ fixtures: electionFixtures, now: FIXTURE_NOW, sources: [cityElections] });

    expect(data.elections.map((e) => e.slug)).toEqual(['2026-general', '2026-special']);
    const special = data.elections.find((e) => e.id === SPECIAL)!;
    expect(special.date).toBe('2026-12-05');
    expect(special.publisher).toBe('city-of-laredo');
    expect(special.url).toBe(SPECIAL_ELECTION_URL);
    // The city's own heading, never translated or re-cased.
    expect(special.title).toBe('CITY OF LAREDO 2026 SPECIAL ELECTION');

    // The city's own calendar table, under its own "District 8" heading rather than a notices one.
    expect(special.calendar).toHaveLength(8);
    const byDate = Object.fromEntries(special.calendar.map((e) => [e.description, e.date]));
    expect(byDate['Last Day to File for Place on the Ballot for the District 8 Special Election by 5:00 p.m.']).toBe('2026-10-05');
    expect(byDate['First day of Early Voting!']).toBe('2026-11-23');
    expect(byDate['ELECTION DAY!']).toBe('2026-12-05');
    // The city has one cell per entry, so it writes its two-day holiday as both dates in that cell.
    // Read as one day the site would tell an early voter the wrong thing about the second.
    expect(special.calendar.find((e) => e.description === 'THANKSGIVING HOLIDAY!')).toEqual({
      date: '2026-11-26',
      endDate: '2026-11-27',
      label: 'Thursday, November 26, 2026 Friday, November 27, 2026',
      description: 'THANKSGIVING HOLIDAY!',
    });
    // Every other entry is the one day the city gave it.
    expect(special.calendar.filter((e) => e.endDate !== undefined)).toHaveLength(1);

    // The city has named a District 8 forum and not yet said when: no date, no link, just a button.
    // A forum with no date is not a schedule, so it is not shown as one (the owner is told below).
    expect(special.forums).toEqual([]);
    // Its own lists of where to vote, which are not the general election's.
    expect(special.links.filter((l) => l.kind === 'voting-site').map((l) => l.label)).toEqual(['Early Voting Sites', 'Election Day Sites']);
    expect(special.links.some((l) => l.url.includes('24387'))).toBe(true);
    // The city calls this election by resolution and puts no question on its ballot.
    expect(data.races.filter((r) => r.electionId === SPECIAL && r.kind === 'question')).toHaveLength(0);
  });

  it('records one Race, three named Candidates, and the treasurer-only row the city has not named', async () => {
    const site = await Site.create();
    const { data } = await site.build({ fixtures: electionFixtures, now: FIXTURE_NOW, sources: [cityElections] });

    const races = data.races.filter((r) => r.electionId === SPECIAL);
    expect(races).toHaveLength(1);
    const district8 = races[0]!;
    expect(district8.id).toBe(DISTRICT_8);
    expect(district8.slug).toBe('district-8');
    expect(district8.title).toBe('District 8');
    expect(district8.kind).toBe('office');

    // Three people the city named, in its own ballot order, under the names it printed.
    const candidates = data.candidates.filter((c) => c.raceId === DISTRICT_8).sort((a, b) => a.order - b.order);
    expect(candidates.map((c) => c.name)).toEqual(['Maria Irma Lopez', 'Priscilla Trevino', 'Mario Alberto Trevino']);
    expect(candidates.map((c) => c.ballotName)).toEqual(['Irma Morales Lopez', 'Priscilla "Gordiloca" Treviño', 'Mario Trevino']);
    expect(candidates.map((c) => c.treasurer)).toEqual(['Roxana Morales', 'Melissa Neira', 'Mahile M Moreno']);
    // The city prints this row first, so it keeps its place in the ballot order.
    expect(candidates.map((c) => c.order)).toEqual([1, 2, 3]);

    // The city's first row has a treasurer appointment and no name at all: that is nobody
    // (CONTEXT.md), so it is not a Candidate, and the treasurer is not turned into one.
    expect(district8.unnamedRows).toHaveLength(1);
    expect(district8.unnamedRows[0]).toEqual({
      order: 0,
      treasurer: 'Isabella Mendoza',
      filings: ['city-elections:filing:24247'],
    });
    // The treasurer the city named on that row is a treasurer, and is not turned into a Candidate.
    expect(data.candidates.some((c) => /Mendoza/.test(`${c.name} ${c.ballotName}`))).toBe(false);
    // What the city did post on that row is still a Filing, attached to no Candidate.
    const appointment = data.filings.find((f) => f.documentId === '24247')!;
    expect(appointment).toMatchObject({
      kind: 'treasurer-appointment',
      raceId: DISTRICT_8,
      electionId: SPECIAL,
      office: 'District 8',
      label: 'Campaign Treasurer Application',
    });
    expect(appointment.candidateId).toBeUndefined();

    // Seven documents: a treasurer appointment on all four rows and an application on the three
    // rows the city named.
    const filings = data.filings.filter((f) => f.electionId === SPECIAL);
    expect(filings).toHaveLength(7);
    expect(filings.filter((f) => f.kind === 'ballot-application')).toHaveLength(3);
  });

  it('renders the special election through the same pages as the general one', async () => {
    const site = await Site.create();
    await site.build({ fixtures: electionFixtures, now: FIXTURE_NOW, sources: [cityElections] });

    for (const lang of ['en', 'es'] as const) {
      const $ = await site.page(`/${lang}${SPECIAL_PATH}`);
      expect($('h1').text()).toBe('CITY OF LAREDO 2026 SPECIAL ELECTION');
      expect($('.election-calendar li').length).toBe(8);
      expect($(`.election-calendar time[datetime="2026-12-05"]`).length).toBeGreaterThan(0);
      // The two-day holiday shows both of its days; the separator is interface text and is translated.
      const holiday = $('.election-calendar li').filter((_, li) => /THANKSGIVING/.test($(li).text()));
      expect(holiday.find('time').map((_, e) => $(e).attr('datetime')).get()).toEqual(['2026-11-26', '2026-11-27']);
      expect(holiday.find('.through').text()).toBe(lang === 'es' ? 'hasta' : 'through');
      // Both ends sit in the one cell every other entry's single date sits in, so a two-day entry
      // stays beside its description instead of splitting the row into two columns.
      expect(holiday.find('.when time')).toHaveLength(2);
      expect($('.election-calendar .when')).toHaveLength(8);
      // Its own notices, newest first, in the city's own words.
      expect($('.election-notices .title').map((_, e) => $(e).text()).get()).toEqual([
        'Notice of Drawing for Order on Special Election Ballot',
        'Notice of Special Election for Other Political Subdivisions',
        'Notice of Deadline to file an Application for a Place on the Ballot for the District 8 Special Election',
      ]);
      // One Race, and it opens.
      const races = $('.races-list a');
      expect(races.map((_, a) => $(a).attr('href')).get()).toEqual([`/${lang}${SPECIAL_PATH}district-8/`]);
      expect(races.text()).toBe('District 8');

      const race = await site.page(`/${lang}${SPECIAL_PATH}district-8/`);
      const rows = race('table.race-table tbody tr');
      expect(rows.length).toBe(4);
      // The unnamed row keeps its place at the top of the city's ballot order and names nobody.
      expect(rows.eq(0).hasClass('unnamed')).toBe(true);
      expect(rows.eq(0).find('th').text()).toBe(lang === 'es' ? 'Nombre del candidato aún no publicado' : 'Candidate name not yet posted');
      expect(rows.eq(0).find('td.treasurer a').contents().first().text()).toBe('Isabella Mendoza');
      expect(rows.eq(0).find('td.application .empty').text()).toBe(lang === 'es' ? 'No publicado' : 'Not posted');
      expect(rows.map((_, tr) => race(tr).find('th').first().text()).get().slice(1)).toEqual([
        'Irma Morales Lopez',
        'Priscilla "Gordiloca" Treviño',
        'Mario Trevino',
      ]);
      // The treasurer the city named on that row is named only as the treasurer. The site never
      // borrows a treasurer's name for the candidate the city has not named (CONTEXT.md).
      // The treasurer link carries a visually hidden document label after the name (ticket 03), so
      // match on an element's own text nodes rather than on leaf elements.
      const ownText = (e: Parameters<typeof race>[0]) =>
        race(e)
          .contents()
          .filter((_, n) => n.type === 'text')
          .text();
      const mendoza = race('main *').filter((_, e) => /Isabella Mendoza/.test(ownText(e)));
      expect(mendoza.map((_, e) => race(e).closest('td,th').attr('class') ?? race(e).closest('td,th').prop('tagName')).get()).toEqual(['treasurer']);
    }

    // The same people and links in both languages.
    const hrefs = async (lang: string) => {
      const $ = await site.page(`/${lang}${SPECIAL_PATH}district-8/`);
      // Candidate name cells link to the site's own page in the reader's language (ticket 03);
      // strip that prefix so the same people and the same city documents compare equal.
      return $('table.race-table a')
        .map((_, a) => ($(a).attr('href') ?? '').replace(/^\/(en|es)\//, '/'))
        .get();
    };
    expect(await hrefs('es')).toEqual(await hrefs('en'));
  });

  it('records one day when the city writes the same date into a calendar cell twice', async () => {
    // A cell holding one date twice is one day, not a range: the end is kept only when it is later.
    const page = await readFile(`${fixtureRoot}/city-elections/special-2026.html`, 'utf8');
    const repeated = page.replace('Friday, November 27, 2026', 'Thursday, November 26, 2026');
    expect(repeated).not.toBe(page);

    const site = await Site.create();
    const { data } = await site.build({ fixtures: { ...electionFixtures, [SPECIAL_ELECTION_URL]: repeated }, now: FIXTURE_NOW, sources: [cityElections] });
    const holiday = data.elections.find((e) => e.id === SPECIAL)!.calendar.find((e) => e.description === 'THANKSGIVING HOLIDAY!')!;
    expect(holiday.date).toBe('2026-11-26');
    expect(holiday.endDate).toBeUndefined();
    const $ = await site.page(`/en${SPECIAL_PATH}`);
    expect($('.election-calendar li').filter((_, li) => /THANKSGIVING/.test($(li).text())).find('time')).toHaveLength(1);
  });

  it('lists both Elections on the Elections Topic page, upcoming first', async () => {
    const site = await Site.create();
    await site.build({ fixtures: electionFixtures, now: FIXTURE_NOW, sources: [cityElections] });

    for (const lang of ['en', 'es'] as const) {
      const topic = await site.page(`/${lang}/topics/elections/`);
      const links = topic('.elections-list a');
      // Both upcoming on the fixture date, so the soonest election day comes first.
      expect(links.map((_, a) => topic(a).attr('href')).get()).toEqual([`/${lang}/elections/2026-general/`, `/${lang}${SPECIAL_PATH}`]);
      expect(links.eq(1).text()).toBe('CITY OF LAREDO 2026 SPECIAL ELECTION');
    }

    // Once the general election has been held its page stays up (spec: Freeze) and moves below the
    // one still to come, so a reader meets the election they can still vote in first.
    await site.build({ fixtures: electionFixtures, now: new Date('2026-11-10T12:00:00Z'), sources: [cityElections] });
    const later = await site.page('/en/topics/elections/');
    expect(later('.elections-list a').map((_, a) => later(a).attr('href')).get()).toEqual(['/en/elections/2026-special/', '/en/elections/2026-general/']);
    expect(await site.exists('/en/elections/2026-general/mayor/')).toBe(true);
  });

  it('carries the special election notices into the Elections RSS with the city dates it writes as 10-07-26', async () => {
    const site = await Site.create();
    const { data } = await site.build({ fixtures: electionFixtures, now: FIXTURE_NOW, sources: [cityElections] });

    // The city writes these three dates `MM-DD-YY` where its general page writes them out.
    const items = data.items.filter((i) => i.election?.id === SPECIAL);
    expect(items.filter((i) => i.election?.kind === 'notice').map((i) => [i.id, i.date])).toEqual([
      ['city-elections:doc:24541', '2026-10-07'],
      ['city-elections:doc:24343', '2026-08-28'],
      ['city-elections:doc:24245', '2026-08-24'],
    ]);
    // The city prints no date beside its voting-site buttons; its document store stamps them.
    expect(items.filter((i) => i.election?.kind === 'voting-site').map((i) => [i.id, i.date])).toEqual([
      ['city-elections:doc:24387', '2026-09-01'],
      ['city-elections:doc:24385', '2026-09-01'],
    ]);
    expect(items.every((i) => i.topic === 'elections' && i.publisher === 'city-of-laredo')).toBe(true);

    const rss = await site.file('/en/topics/elections/feed.xml');
    expect(rss).toContain('<title>Notice of Special Election for Other Political Subdivisions</title>');
    expect(rss).toContain('<guid isPermaLink="false">city-elections:doc:24343</guid>');
    // The city's own date for the notice, not the day the site saw it.
    expect(rss).toContain(new Date('2026-08-28T00:00:00-05:00').toUTCString());
    expect(newPanelTitles(await site.page('/en/'))).toContain('Notice of Special Election for Other Political Subdivisions');

    // The city dates its drawing notice 10-07-26, three weeks ahead of the fixture date, so it is
    // not news yet and the New panel and the feed leave it out until its own date, as they do for
    // every other Item. The Election page's list of notices is the record and is not windowed, so
    // the notice is on the Election page from the day the city posts it.
    expect(rss).not.toContain('Notice of Drawing for Order on Special Election Ballot');

    // Both Elections post a list under the very same title for different weeks, so every place a
    // reader meets one out of context says which Election it belongs to, in the city's own words.
    const home = await site.page('/en/');
    const earlyVoting = home('section[aria-labelledby="new"] .items > li').filter((_, li) => home(li).find('.title').text() === 'Early Voting Sites');
    expect(earlyVoting).toHaveLength(2);
    // Newest first, so the general election's list (posted 2 September) sits above the special
    // election's (1 September) under the same title, which is exactly the pair a reader must be
    // able to tell apart.
    expect(earlyVoting.find('.election').map((_, a) => home(a).text()).get()).toEqual([
      'CITY OF LAREDO 2026 GENERAL ELECTION',
      'CITY OF LAREDO 2026 SPECIAL ELECTION',
    ]);
    expect(earlyVoting.find('.election').map((_, a) => home(a).attr('href')).get()).toEqual(['/en/elections/2026-general/', `/en${SPECIAL_PATH}`]);
    expect(rss).toContain('City of Laredo · Elections · CITY OF LAREDO 2026 SPECIAL ELECTION');
    expect(rss).toContain('City of Laredo · Elections · CITY OF LAREDO 2026 GENERAL ELECTION');
    // On the Election's own page every line would repeat its title, so the chip is left off there.
    const page = await site.page(`/en${SPECIAL_PATH}`);
    expect(page('.election-notices .election')).toHaveLength(0);

    // A second unchanged build adds nothing.
    const again = await site.build({ fixtures: electionFixtures, now: daysAfter(FIXTURE_NOW, 1), sources: [cityElections] });
    expect(again.report.newItems).toBe(0);
    expect(again.data.elections).toHaveLength(2);
    expect(again.data.candidates).toHaveLength(19);
    expect(again.data.filings).toHaveLength(39);

    // On the city's own date for it, the drawing notice is in the feed like any other Item, still
    // under the id and the date the city gave it on the day it was first seen.
    const later = await site.build({ fixtures: electionFixtures, now: new Date('2026-10-08T12:00:00Z'), sources: [cityElections] });
    expect(later.report.newItems).toBe(0);
    expect(later.data.items.find((i) => i.id === 'city-elections:doc:24541')).toMatchObject({ date: '2026-10-07', firstSeen: FIXTURE_NOW.toISOString() });
    expect(await site.file('/en/topics/elections/feed.xml')).toContain('<title>Notice of Drawing for Order on Special Election Ballot</title>');
  });

  it('keeps every Candidate and Filing id and every page path distinct across the two Elections', async () => {
    const site = await Site.create();
    const { data } = await site.build({ fixtures: electionFixtures, now: FIXTURE_NOW, sources: [cityElections] });

    expect(data.candidates).toHaveLength(19);
    const ids = data.candidates.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(data.filings.map((f) => f.id)).size).toBe(data.filings.length);
    expect(new Set(data.races.map((r) => r.id)).size).toBe(data.races.length);
    expect(new Set(data.items.map((i) => i.id)).size).toBe(data.items.length);

    // A Candidate's page path is its Election, its Race, and its slug, so two people the city
    // spells the same in two Elections are still two pages.
    const paths = data.candidates.map((c) => {
      const race = data.races.find((r) => r.id === c.raceId)!;
      const election = data.elections.find((e) => e.id === c.electionId)!;
      return `/elections/${election.slug}/${race.slug}/${c.slug}/`;
    });
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toContain('/elections/2026-special/district-8/mario-trevino/');

    // The city runs a District 8 race in the special election only; were it to run one in both,
    // the two Races and their Candidates would still be told apart by the Election.
    const general = data.races.filter((r) => r.electionId === GENERAL).map((r) => r.slug);
    expect(general).not.toContain('district-8');
    expect(data.races.filter((r) => r.slug === 'district-8').map((r) => r.id)).toEqual([DISTRICT_8]);
  });

  it('gives the same two people in two Elections two Candidates and two pages', async () => {
    // The city's own special election table with its District 8 rows renamed to two people already
    // running for Mayor in the general election, which is the collision the slug rule has to survive.
    const candidates = await readFile(`${fixtureRoot}/city-elections/special-2026-candidates.html`, 'utf8');
    const collided = candidates
      .replace('Maria Irma Lopez', 'Jose David Gonzalez')
      .replace('Irma Morales Lopez', 'JD Gonzalez')
      .replace('Mario Alberto Trevino', 'Victor Daniel Trevino')
      .replace('>Mario Trevino<', '>Victor D. Trevino<');
    expect(collided).not.toBe(candidates);

    const site = await Site.create();
    const { data } = await site.build({
      fixtures: { ...electionFixtures, [SPECIAL_CANDIDATES_URL]: collided },
      now: FIXTURE_NOW,
      sources: [cityElections],
    });

    const gonzalez = data.candidates.filter((c) => c.name === 'Jose David Gonzalez');
    expect(gonzalez.map((c) => c.id)).toEqual([`${GENERAL}:mayor:jose-david-gonzalez`, `${DISTRICT_8}:jose-david-gonzalez`]);
    // The slug is the same word in both, and the Election and Race in the path keep them apart.
    expect(gonzalez.map((c) => c.slug)).toEqual(['jd-gonzalez', 'jd-gonzalez']);
    expect(new Set(data.candidates.map((c) => c.id)).size).toBe(data.candidates.length);
    expect(await site.exists('/en/elections/2026-general/mayor/')).toBe(true);
    expect(await site.exists('/en/elections/2026-special/district-8/')).toBe(true);
  });

  it('reads each of the four city pages once and counts both Elections in the run log', async () => {
    const site = await Site.create();
    const log: string[] = [];
    const { requests } = await site.build({ fixtures: electionFixtures, now: FIXTURE_NOW, sources: [cityElections], log });

    expect(requests.filter((r) => r.url === SPECIAL_ELECTION_URL)).toHaveLength(1);
    expect(requests.filter((r) => r.url === SPECIAL_CANDIDATES_URL)).toHaveLength(1);
    expect(log.some((l) => /^city-elections: 2 Elections, 22 calendar entries, 6 notices, 4 voting-site lists, 6 forum entries/.test(l))).toBe(true);
    // Seven office Races across the two Elections, and the one row the city has not named.
    expect(log).toContain('city-elections: 8 Races (7 offices, 1 question), 19 Candidates, 1 row the city has not named, 39 Filings');
    expect(log).toContain('city-elections: ok, 10 new Items');
    // The city's one forum button on the special candidates page carries no date yet. It is not
    // shown as a schedule and it is not dropped in silence: the owner is told it is waiting.
    expect(log).toContain(`city-elections: 1 forum button(s) on ${SPECIAL_CANDIDATES_URL} carry no date yet (District 8)`);
    // The city opens its filing window "Monday, September 05, 2026", which is a Saturday. Only the
    // city can say which of the two it meant, so the site shows the date and tells the owner.
    expect(log).toContain(
      `city-elections: the city writes "Monday, September 05, 2026" on ${SPECIAL_ELECTION_URL}, whose weekday is not the one that date falls on; the date is shown`,
    );
    // Nothing else on either page disagrees with itself, and no calendar row is dropped unread.
    expect(log.filter((l) => /whose weekday is not the one/.test(l))).toHaveLength(1);
    expect(log.filter((l) => /cannot read a date in/.test(l))).toHaveLength(0);
  });

  it('tells the owner when the city writes a calendar row it cannot read a date in', async () => {
    // A month the city misspells would otherwise drop a filing deadline off the calendar in silence.
    const page = await readFile(`${fixtureRoot}/city-elections/special-2026.html`, 'utf8');
    const typo = page.replace('Monday, October 05, 2026', 'Monday, Octber 05, 2026');
    expect(typo).not.toBe(page);

    const site = await Site.create();
    const log: string[] = [];
    const { data } = await site.build({ fixtures: { ...electionFixtures, [SPECIAL_ELECTION_URL]: typo }, now: FIXTURE_NOW, sources: [cityElections], log });

    const calendar = data.elections.find((e) => e.id === SPECIAL)!.calendar;
    expect(calendar).toHaveLength(7);
    expect(calendar.some((e) => /Last Day to File/.test(e.description))).toBe(false);
    expect(log).toContain(
      `city-elections: 1 calendar row(s) on ${SPECIAL_ELECTION_URL} have text the site cannot read a date in (Monday, Octber 05, 2026)`,
    );
  });

  it('keeps the special election when the city makes its candidates sub-page unreachable', async () => {
    const site = await Site.create();
    const log: string[] = [];
    const { data } = await site.build({
      fixtures: { ...electionFixtures, [SPECIAL_CANDIDATES_URL]: { status: 404 } },
      now: FIXTURE_NOW,
      sources: [cityElections],
      log,
    });

    // The Election still gets its calendar, notices, and links, and the general election is untouched.
    expect(data.elections).toHaveLength(2);
    expect(data.elections.find((e) => e.id === SPECIAL)!.calendar).toHaveLength(8);
    expect(data.races.filter((r) => r.electionId === SPECIAL)).toHaveLength(0);
    expect(data.races.filter((r) => r.electionId === GENERAL)).toHaveLength(7);
    expect(log.some((l) => l.includes(`${SPECIAL_CANDIDATES_URL} unreadable`))).toBe(true);
    expect(await site.exists(`/en${SPECIAL_PATH}`)).toBe(true);
  });
});

describe('Elections 04: the two forms the city writes a date in', () => {
  it('reads a numeric short date only when the cell holds nothing else', () => {
    expect(parseNumericDate('10-07-26')).toBe('2026-10-07');
    expect(parseNumericDate('8-4-26')).toBe('2026-08-04');
    expect(parseNumericDate('10/07/2026')).toBe('2026-10-07');
    // A day or a month the calendar does not have is not a date.
    expect(parseNumericDate('02-30-26')).toBeUndefined();
    expect(parseNumericDate('13-01-26')).toBeUndefined();
    // Anything but the date on its own: a docket number, a range, a phone number.
    expect(parseNumericDate('Ordinance 10-07-26 adopted')).toBeUndefined();
    expect(parseNumericDate('10-07-26 to 10-09-26')).toBeUndefined();
    expect(parseNumericDate('956-791-7308')).toBeUndefined();
    expect(parseNumericDate('')).toBeUndefined();
  });
});
