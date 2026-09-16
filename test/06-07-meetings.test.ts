import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { legistar, eventsUrl } from '../src/sources/legistar.js';
import { FIXTURE_NOW, FIXTURE_NOW_2024, legistar2024Fixtures, legistarFixtures } from './fixtures/fetcher.js';
import { fixtureRoot } from './fixtures/paths.js';
import { comingUpTitles, daysAfter, newPanelTitles, Site } from './helpers.js';
import path from 'node:path';

const only = [legistar];

describe('06: Legistar Meetings, the Coming up panel, and Meeting pages', () => {
  it('Coming up shows the next 14 days of Meetings soonest first, and Meeting pages show date, time, Body, and location', async () => {
    const site = await Site.create();
    const { data } = await site.build({ fixtures: legistarFixtures, now: FIXTURE_NOW, sources: only });
    expect(data.meetings.length).toBeGreaterThan(40);
    expect(data.bodies.length).toBeGreaterThan(60);

    const home = await site.page('/en/');
    const titles = comingUpTitles(home);
    expect(titles).toEqual(['Fine Art & Culture Commission', 'Planning & Zoning Commission', 'City Council', 'City Council']);
    const dates = home('section[aria-labelledby="coming-up"] time').map((_, e) => home(e).attr('datetime')).get();
    expect(dates).toEqual(['2026-09-17', '2026-09-17', '2026-09-21', '2026-09-25']);

    const meeting = await site.page('/en/meetings/1334/');
    expect(meeting('h1').text().trim()).toBe('City Council');
    expect(meeting('dl').text()).toContain('Monday, September 21, 2026');
    expect(meeting('dl').text()).toContain('5:30 PM');
    expect(meeting('dl').text()).toContain('City Council Chambers');
    expect(meeting('dd a[href="/en/meetings/body/138/"]').text()).toBe('City Council');
    expect(meeting('.badge.cancelled')).toHaveLength(0);

    const es = await site.page('/es/meetings/1334/');
    expect(es('dl').text()).toContain('lunes, 21 de septiembre de 2026');
  });

  it('a cancelled Meeting stays visible in Coming up and on its page, marked cancelled', async () => {
    const site = await Site.create();
    const { data } = await site.build({ fixtures: legistar2024Fixtures, now: FIXTURE_NOW_2024, sources: only });
    const cancelled = data.meetings.find((m) => m.id === '969');
    expect(cancelled).toMatchObject({ bodyName: 'City Council', date: '2024-01-16', cancelled: true });

    const home = await site.page('/en/');
    const li = home('section[aria-labelledby="coming-up"] .items > li').filter((_, e) => home(e).find('a[href="/en/meetings/969/"]').length > 0);
    expect(li).toHaveLength(1);
    expect(li.find('.badge.cancelled').text()).toBe('Cancelled');

    const page = await site.page('/en/meetings/969/');
    expect(page('h1 .badge.cancelled').text()).toBe('Cancelled');
    const es = await site.page('/es/meetings/969/');
    expect(es('h1 .badge.cancelled').text()).toBe('Cancelada');
  });

  it('City Council is listed first among Bodies; a Body page shows only that Body; Bodies with no Meeting in 12 months are hidden from the filter but still ingested', async () => {
    const site = await Site.create();
    const { data } = await site.build({ fixtures: legistarFixtures, now: FIXTURE_NOW, sources: only });

    const list = await site.page('/en/meetings/');
    const filter = list('.body-filter a').map((_, e) => list(e).text()).get();
    expect(filter[0]).toBe('All Bodies');
    expect(filter[1]).toBe('City Council');
    expect(filter).toContain('Planning & Zoning Commission');
    expect(filter).not.toContain('Redistricting Commission');
    expect(data.bodies.some((b) => b.name === 'Redistricting Commission')).toBe(true);

    const pz = await site.page('/en/meetings/body/227/');
    const bodies = new Set(pz('.meetings-list .title').map((_, e) => pz(e).text()).get());
    expect(bodies).toEqual(new Set(['Planning & Zoning Commission']));
    expect(pz('.meetings-list li').length).toBeGreaterThan(2);
    expect(pz('.body-filter a[aria-current]').text()).toBe('Planning & Zoning Commission');
    expect(pz('h2').map((_, e) => pz(e).text()).get()).toContain('Past');
    const pzEs = await site.page('/es/meetings/body/227/');
    expect(pzEs('h2').map((_, e) => pzEs(e).text()).get()).toContain('Anteriores');
    const pzMeeting = await site.page('/en/meetings/1623/');
    expect(pzMeeting('.docs a').last().attr('href')).toBe('https://laredotx.new.swagit.com/');
  });
});

describe('07: Meeting documents, video, and stream lines', () => {
  /** Build one serves the real July 27 Council record as it stood before minutes and video were published (those fields null). */
  async function agendaOnlyFixtures(): Promise<Record<string, import('../src/fetcher/fixture.js').FixtureBody>> {
    const events = JSON.parse(await readFile(path.join(fixtureRoot, 'legistar/events.json'), 'utf8')) as Record<string, unknown>[];
    const before = events.map((e) =>
      e.EventId === 1548 ? { ...e, EventMinutesFile: null, EventMinutesLastPublishedUTC: null, EventMedia: null, EventVideoPath: null, EventLastModifiedUtc: '2026-07-21T21:37:25.933' } : e,
    );
    return { ...legistarFixtures, [eventsUrl(FIXTURE_NOW)]: JSON.stringify(before) };
  }

  it('minutes and video attaching between builds add two stream lines and fill in the Meeting page; unchanged rebuilds add none', async () => {
    const site = await Site.create();
    const first = await site.build({ fixtures: await agendaOnlyFixtures(), now: daysAfter(FIXTURE_NOW, -1), sources: only });
    const m1 = first.data.meetings.find((m) => m.id === '1548')!;
    expect(Object.keys(m1.documents).sort()).toEqual(['agenda', 'packet']);
    expect(m1.documents.packet!.url).toMatch(/View\.ashx\?M=PA&ID=1423665/);

    let page = await site.page('/en/meetings/1548/');
    let docs = page('.docs a').map((_, e) => page(e).text()).get();
    expect(docs).toEqual(['Agenda', 'Agenda packet', 'Video archive for this Body']);
    expect(page('.docs a').last().attr('href')).toBe('https://laredotx.new.swagit.com/city-council');

    const before = first.data.items.filter((i) => i.stream?.meetingId === '1548').map((i) => i.stream!.kind);
    expect(before.sort()).toEqual(['agenda', 'packet']);

    const second = await site.build({ fixtures: legistarFixtures, now: FIXTURE_NOW, sources: only });
    const added = second.data.items.filter((i) => i.stream?.meetingId === '1548' && i.firstSeen === FIXTURE_NOW.toISOString());
    expect(added.map((i) => i.stream!.kind).sort()).toEqual(['minutes', 'video']);
    const minutes = added.find((i) => i.stream!.kind === 'minutes')!;
    expect(minutes.date).toBe('2026-07-31T16:40:37.433Z');
    expect(minutes.url).toBe('https://cityoflaredo.legistar1.com/cityoflaredo/meetings/2026/7/1548_M_City_Council_26-07-27_Meeting_Minutes.pdf');
    expect(minutes.topic).toBe('meetings');

    const home = await site.page('/en/');
    expect(newPanelTitles(home)).toContain('Minutes posted: City Council, Jul 27, 2026');
    expect(newPanelTitles(home)).toContain('Video available: City Council, Jul 27, 2026');
    const line = home('section[aria-labelledby="new"] .items > li').filter((_, e) => home(e).find('a.title').text() === 'Minutes posted: City Council, Jul 27, 2026');
    expect(line.find('a.title').attr('href')).toBe('/en/meetings/1548/');
    const es = await site.page('/es/');
    expect(newPanelTitles(es)).toContain('Acta publicada: City Council, 27 jul 2026');

    page = await site.page('/en/meetings/1548/');
    docs = page('.docs a').map((_, e) => page(e).text()).get();
    expect(docs).toEqual(['Agenda', 'Agenda packet', 'Minutes', 'Video']);
    expect(page('.docs a').last().attr('href')).toBe('https://laredotx.new.swagit.com/videos/394543');

    const third = await site.build({ fixtures: legistarFixtures, now: daysAfter(FIXTURE_NOW, 1), sources: only });
    expect(third.report.newItems).toBe(0);
    expect(third.data.items.filter((i) => i.stream?.meetingId === '1548')).toHaveLength(4);
  });
});
