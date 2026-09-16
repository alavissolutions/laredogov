import { describe, expect, it } from 'vitest';
import { cityBids } from '../src/sources/city-bids.js';
import { cityCalendar } from '../src/sources/city-calendar.js';
import { cityNewsroom } from '../src/sources/city-newsroom.js';
import { legistar } from '../src/sources/legistar.js';
import { bidsFixtures, calendarFixtures, FIXTURE_NOW, legistarFixtures, newsroomArchiveFixtures, newsroomFixtures } from './fixtures/fetcher.js';
import { comingUpTitles, daysAfter, Site } from './helpers.js';

describe('10: City Newsroom Feed with department-to-Topic mapping', () => {
  it('files the tax hearing notice under News and Notices even though the city tagged it to every department', async () => {
    const site = await Site.create();
    const { data } = await site.build({ fixtures: newsroomFixtures, now: FIXTURE_NOW, sources: [cityNewsroom] });
    const tax = data.items.find((i) => i.title === 'Public Hearing Meeting on Tax Increase')!;
    expect(tax).toMatchObject({ topic: 'news-and-notices', url: 'https://www.cityoflaredo.com/Home/Components/News/News/554/15', publisher: 'city-of-laredo' });
    expect(tax.date).toBe('2026-09-08T22:00:00.000Z');
    expect(tax.topicReason).toBeUndefined();
    const health = data.items.find((i) => i.title.startsWith('City of Laredo Issues Animal Health Advisory'))!;
    expect(health).toMatchObject({ topic: 'health', topicReason: { department: 'Health' } });

    const $ = await site.page('/en/topics/news-and-notices/');
    expect($('.items .title').map((_, e) => $(e).text()).get()).toContain('Public Hearing Meeting on Tax Increase');
    const healthPage = await site.page('/en/topics/health/');
    expect(healthPage('.items .reason').text()).toContain('Filed under Health because the city posted it under Health');
  });

  it('files a Fire-department Item under Public Safety and says why on the Item', async () => {
    const site = await Site.create();
    const { data } = await site.build({ fixtures: newsroomArchiveFixtures, now: FIXTURE_NOW, sources: [cityNewsroom] });
    const boil = data.items.find((i) => i.title === 'City of Laredo Issues Precautionary Boil Water Notice for Jefferson Water Treatment Plant Service Area')!;
    expect(boil).toMatchObject({ topic: 'public-safety', topicReason: { department: 'Fire' }, date: '2026-05-23T01:00:00.000Z' });
    const unmapped = data.items.find((i) => i.title === 'Spring Lawn Contest')!;
    expect(unmapped.topic).toBe('news-and-notices');
    expect(unmapped.topicReason).toBeUndefined();

    const now = new Date('2026-06-01T12:00:00Z');
    const site2 = await Site.create();
    await site2.build({ fixtures: newsroomArchiveFixtures, now, sources: [cityNewsroom] });
    const $ = await site2.page('/en/topics/public-safety/');
    const li = $('.items > li').filter((_, e) => $(e).find('.title').text() === boil.title);
    expect(li).toHaveLength(1);
    expect(li.find('.reason').text()).toBe('Filed under Public Safety because the city posted it under Fire.');
    expect(await site2.file('/en/topics/public-safety/feed.xml')).toContain('Precautionary Boil Water Notice');
    const news = await site2.page('/en/topics/news-and-notices/');
    expect(news('.items .title').map((_, e) => news(e).text()).get()).toContain('Spring Lawn Contest');
  });
});

describe('11: City Calendar Events Feed', () => {
  const fixtures = { ...legistarFixtures, ...calendarFixtures };
  const sources = [legistar, cityCalendar];

  it('yields Events with start time and link, skips entries that are a Body Meeting, and interleaves Events with Meetings in Coming up', async () => {
    const site = await Site.create();
    const log: string[] = [];
    const { data } = await site.build({ fixtures, now: FIXTURE_NOW, sources, log });
    const events = data.items.filter((i) => i.source === 'city-calendar');
    expect(events.every((i) => i.topic === 'events' && i.event)).toBe(true);
    expect(events.map((i) => i.title)).not.toContain('Planning & Zoning Commission');
    expect(events.map((i) => i.title)).not.toContain('Metropolitan Planning Organization Policy Committee');
    expect(data.meetings.filter((m) => m.bodyName === 'Planning & Zoning Commission' && m.date === '2026-09-03')).toHaveLength(1);
    expect(log.join('\n')).toMatch(/city-calendar: \d+ events, \d+ Body meetings skipped/);

    const run = events.find((i) => i.title === 'Miles for Hope - Community Run')!;
    expect(run).toMatchObject({ url: 'https://www.cityoflaredo.com/Home/Components/Calendar/Event/3360/17', date: '2026-10-01T00:00:00.000Z' });
    expect(run.event).toMatchObject({ start: '2026-10-01T00:00:00.000Z', end: '2026-10-01T02:00:00.000Z' });
    const cleanup = events.find((i) => i.title === 'World Cleanup Day')!;
    expect(cleanup.event!.start).toBe('2026-09-20');

    const home = await site.page('/en/');
    const titles = comingUpTitles(home);
    expect(titles.indexOf('Planning & Zoning Commission')).toBeLessThan(titles.indexOf('World Cleanup Day'));
    expect(titles.indexOf('World Cleanup Day')).toBeLessThan(titles.indexOf('City Council'));
    expect(titles).toContain('Miles for Hope - Community Run');
    expect(titles).not.toContain('Notice of Written Fire Entrance Examination');
    const runLine = home('section[aria-labelledby="coming-up"] .items > li').filter((_, e) => home(e).find('.title').text() === 'Miles for Hope - Community Run');
    expect(runLine.find('time').text()).toBe('Wednesday, September 30, 2026, 7:00 PM');
    expect(runLine.find('.badge.event').text()).toBe('Events');

    expect(await site.file('/en/topics/events/feed.xml')).toContain('<title>Miles for Hope - Community Run</title>');
  });

  it('a second unchanged build fetches no detail pages again and adds nothing', async () => {
    const site = await Site.create();
    await site.build({ fixtures, now: FIXTURE_NOW, sources });
    const second = await site.build({ fixtures, now: daysAfter(FIXTURE_NOW, 1), sources });
    expect(second.report.newItems).toBe(0);
    expect(second.requests.filter((r) => r.url.includes('/Calendar/Event/'))).toHaveLength(0);
  });
});

describe('12: City Bids Feed', () => {
  it('reads the recorded bids page (which currently lists no open bids), files under Jobs and Bids, and adds nothing on a rebuild', async () => {
    const site = await Site.create();
    const first = await site.build({ fixtures: bidsFixtures, now: FIXTURE_NOW, sources: [cityBids] });
    expect(first.report.failed).toEqual([]);
    expect(first.data.sources['city-bids']!.lastSuccess).toBe(FIXTURE_NOW.toISOString());
    expect(first.data.items.filter((i) => i.source === 'city-bids').every((i) => i.topic === 'jobs-and-bids')).toBe(true);
    expect(first.data.items.filter((i) => i.source === 'city-bids')).toHaveLength(0);
    const second = await site.build({ fixtures: bidsFixtures, now: daysAfter(FIXTURE_NOW, 1), sources: [cityBids] });
    expect(second.report.newItems).toBe(0);
    expect(await site.exists('/en/topics/jobs-and-bids/feed.xml')).toBe(true);
  });
});
