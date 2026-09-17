import type { CheerioAPI } from 'cheerio';
import { describe, expect, it } from 'vitest';
import { cityElections, GENERAL_CANDIDATES_URL, GENERAL_ELECTION_URL } from '../src/sources/city-elections.js';
import { electionFixtures, FIXTURE_NOW } from './fixtures/fetcher.js';
import { daysAfter, newPanelTitles, Site } from './helpers.js';

const GENERAL = '/elections/2026-general/';

describe('Elections 01: the Election page from the city general election page', () => {
  it('records the 2026 General Election with the city calendar, notices, voting sites, and forums', async () => {
    const site = await Site.create();
    const { data } = await site.build({ fixtures: electionFixtures, now: FIXTURE_NOW, sources: [cityElections] });

    expect(data.elections).toHaveLength(1);
    const election = data.elections[0]!;
    expect(election.id).toBe('city-elections:2026-general');
    expect(election.slug).toBe('2026-general');
    expect(election.date).toBe('2026-11-03');
    expect(election.publisher).toBe('city-of-laredo');
    expect(election.url).toBe(GENERAL_ELECTION_URL);
    // The city's own heading, never translated or re-cased.
    expect(election.title).toBe('CITY OF LAREDO 2026 GENERAL ELECTION');

    // Every dated row of the city's calendar table, in the city's order and wording.
    expect(election.calendar[0]).toEqual({ date: '2025-11-03', label: 'Monday, November 03, 2025', description: 'Deadline to post candidate requirements on website' });
    const byDate = Object.fromEntries(election.calendar.map((e) => [e.description, e.date]));
    expect(byDate['Last Day to Register to VOTE!']).toBe('2026-10-05');
    expect(byDate['First Day of Early Voting by Personal Appearance']).toBe('2026-10-19');
    expect(byDate['Last Day to Apply for Ballot by Mail']).toBe('2026-10-23');
    expect(byDate['Last Day for Early Voting by Personal Appearance']).toBe('2026-10-30');
    expect(byDate['ELECTION DAY!']).toBe('2026-11-03');
    expect(byDate['Last Day to File for Place on the General Election Ballot']).toBe('2026-08-17');
    // A row with no date in the first cell is a spacer or a continuation and is not a calendar entry.
    expect(election.calendar.every((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date))).toBe(true);

    // Forums: date and time from the button text, and no link while the city posts no href.
    expect(election.forums).toHaveLength(6);
    expect(election.forums[0]).toEqual({ label: 'Mayor', start: '2026-10-07T00:30:00.000Z' });
    expect(election.forums.some((f) => f.label === 'Municipal Court Judge' && f.start === '2026-10-08T23:00:00.000Z')).toBe(true);
    expect(election.forums.every((f) => f.url === undefined)).toBe(true);
  });

  it('files the city notices and voting-site lists as Elections Items dated by the city', async () => {
    const site = await Site.create();
    const { data } = await site.build({ fixtures: electionFixtures, now: FIXTURE_NOW, sources: [cityElections] });
    const items = data.items.filter((i) => i.source === 'city-elections');
    expect(items.every((i) => i.topic === 'elections')).toBe(true);

    const drawing = items.find((i) => i.title === 'Notice of Drawing for Place on Ballot Order')!;
    expect(drawing.id).toBe('city-elections:doc:24125');
    expect(drawing.date).toBe('2026-08-19');
    expect(drawing.url).toBe('https://www.cityoflaredo.com/home/showpublisheddocument/24125/639219767981530000');
    expect(drawing.election).toEqual({ id: 'city-elections:2026-general', kind: 'notice' });

    const older = items.find((i) => i.title === 'Requirements for Political Subdivision Notice')!;
    expect(older.date).toBe('2025-10-31');

    // The city puts no date beside the voting-site buttons; its document store stamps them (the `t` ticks).
    const early = items.find((i) => i.title === 'Early Voting Sites')!;
    expect(early.id).toBe('city-elections:doc:24402');
    expect(early.date).toBe('2026-09-02');
    expect(early.election).toEqual({ id: 'city-elections:2026-general', kind: 'voting-site' });
    expect(items.find((i) => i.title === 'Election Day Sites')!.id).toBe('city-elections:doc:24400');

    // The Elections Topic page and its RSS carry the city's dates; a second build adds nothing.
    const topic = await site.page('/en/topics/elections/');
    expect(topic('.items > li .title').map((_, e) => topic(e).text()).get()).toContain('Notice of Drawing for Place on Ballot Order');
    const rss = await site.file('/en/topics/elections/feed.xml');
    expect(rss).toContain('<title>Notice of Drawing for Place on Ballot Order</title>');
    expect(rss).toContain(new Date('2026-08-19T00:00:00-05:00').toUTCString());
    expect(newPanelTitles(await site.page('/en/'))).toContain('Early Voting Sites');

    const again = await site.build({ fixtures: electionFixtures, now: daysAfter(FIXTURE_NOW, 1), sources: [cityElections] });
    expect(again.report.newItems).toBe(0);
    expect(again.data.elections).toHaveLength(1);
  });

  it('renders the Election page in both languages with calendar, notices, voting sites, forums, and outside links by Publisher', async () => {
    const site = await Site.create();
    await site.build({ fixtures: electionFixtures, now: FIXTURE_NOW, sources: [cityElections] });

    for (const lang of ['en', 'es'] as const) {
      const $ = await site.page(`/${lang}${GENERAL}`);
      expect($('h1').text()).toBe('CITY OF LAREDO 2026 GENERAL ELECTION');
      // Dates are interface text and are localized; the city's wording is not.
      expect($('.election-calendar li').length).toBe(14);
      expect($('.election-calendar').text()).toContain('Last Day to Apply for Ballot by Mail');
      expect($(`.election-calendar time[datetime="2026-11-03"]`).length).toBeGreaterThan(0);

      expect($('.election-notices .title').map((_, e) => $(e).text()).get()).toEqual([
        'Notice of Drawing for Place on Ballot Order',
        'Notice of Deadline to File an Application for Place on the Ballot',
        'Requirements for Political Subdivision Notice',
      ]);
      expect($('.voting-sites a').map((_, e) => $(e).attr('href')).get()).toEqual([
        'https://www.cityoflaredo.com/home/showdocument?id=24402&t=639239505286997868',
        'https://www.cityoflaredo.com/home/showdocument?id=24400&t=639239505276305177',
      ]);

      // A forum the city has not linked yet shows its date and no link.
      const forums = $('.election-forums li');
      expect(forums.length).toBe(6);
      expect(forums.find('a').length).toBe(0);
      expect(forums.eq(0).text()).toContain('Mayor');
      expect(forums.eq(0).find('time').attr('datetime')).toBe('2026-10-07T00:30:00.000Z');

      // Outside links are grouped under the Publisher the reader is being sent to.
      const groups = $('.election-links h3').map((_, e) => $(e).text()).get();
      expect(groups).toContain(lang === 'es' ? 'Condado de Webb' : 'Webb County');
      expect(groups).toContain(lang === 'es' ? 'Secretaría de Estado de Texas' : 'Texas Secretary of State');
      const webb = $('.election-links section').filter((_, e) => /Webb/.test($(e).find('h3').text()));
      expect(webb.text()).toContain('Sample Ballots');
      expect(webb.find('a[href^="https://www.webbcountytx.gov/"]').length).toBe(2);
      expect($('.election-links a[href^="https://teamrv-mvp.sos.texas.gov/"]').length).toBe(1);
      // The city's own sub-pages stay with the city, unwrapped from the CMS splash redirect.
      expect($(`.election-links a[href="${GENERAL_CANDIDATES_URL}"]`).length).toBe(1);

      // No iframe and no third-party script anywhere on the page (the city embeds YouTube; the site does not).
      expect($('iframe').length).toBe(0);
      expect($('script[src]').length).toBe(0);
    }

    // The same names and links in both languages.
    const en = await site.page(`/en${GENERAL}`);
    const es = await site.page(`/es${GENERAL}`);
    const hrefs = ($: CheerioAPI) =>
      $('main a')
        .map((_, e) => $(e).attr('href'))
        .get()
        .filter((h): h is string => typeof h === 'string' && h.startsWith('http'));
    expect(hrefs(es)).toEqual(hrefs(en));
  });

  it('lists the Election at the top of the Elections Topic page and the Source in the Directory', async () => {
    const site = await Site.create();
    await site.build({ fixtures: electionFixtures, now: FIXTURE_NOW, sources: [cityElections] });

    for (const lang of ['en', 'es'] as const) {
      const topic = await site.page(`/${lang}/topics/elections/`);
      // The Elections list is the first thing under the Topic heading.
      expect(topic('main section').first().attr('aria-labelledby')).toBe('elections');
      const link = topic('.elections-list a').first();
      expect(link.attr('href')).toBe(`/${lang}${GENERAL}`);
      expect(link.text()).toBe('CITY OF LAREDO 2026 GENERAL ELECTION');

      const dir = await site.page(`/${lang}/directory/`);
      const entry = dir('#city-elections');
      expect(entry.length).toBe(1);
      expect(entry.find('h3').text().length).toBeGreaterThan(0);
      expect(entry.find('dl').text().length).toBeGreaterThan(0);
      expect(entry.find(`a[href="${GENERAL_ELECTION_URL}"]`).length).toBe(1);
    }
  });

  it('reads each city page once and logs what it found', async () => {
    const site = await Site.create();
    const log: string[] = [];
    const { requests } = await site.build({ fixtures: electionFixtures, now: FIXTURE_NOW, sources: [cityElections], log });
    expect(requests.map((r) => r.url)).toEqual([GENERAL_ELECTION_URL, GENERAL_CANDIDATES_URL]);
    expect(log.some((l) => /^city-elections: 1 Election/.test(l))).toBe(true);
    expect(log).toContain('city-elections: ok, 5 new Items');
  });
});
