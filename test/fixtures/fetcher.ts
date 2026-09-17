/**
 * Fixture fetchers for tests and for `npm run build:fixtures`.
 * Every recorded response here was captured from the live Source once, politely, on the date in README.md.
 */
import { fixtureFetcher, type FixtureBody } from '../../src/fetcher/fixture.js';
import { monthUrl, eventUrl } from '../../src/sources/city-calendar.js';
import { BIDS_URL } from '../../src/sources/city-bids.js';
import {
  GENERAL_CANDIDATES_URL,
  GENERAL_ELECTION_URL,
  SPECIAL_CANDIDATES_URL,
  SPECIAL_ELECTION_URL,
} from '../../src/sources/city-elections.js';
import { CONTROL_DEPARTMENT, departmentListUrl, NEWSROOM_URL } from '../../src/sources/city-newsroom.js';
import { FEED_URL } from '../../src/sources/laredo-utilities.js';
import { bodiesUrl, eventsUrl } from '../../src/sources/legistar.js';
import { fixture } from './paths.js';

/** The instant the main fixtures were captured; tests pass it as `now`. */
export const FIXTURE_NOW = new Date('2026-09-16T12:00:00Z');

/** A `now` inside the 2024 Legistar window, six days before the cancelled Council Meeting. */
export const FIXTURE_NOW_2024 = new Date('2024-01-10T15:00:00Z');

const insite = (id: number) => [
  `https://cityoflaredo.legistar.com/MeetingDetail.aspx?LEGID=${id}&GID=929&G=B965C976-B177-41E4-B9AA-4EB73F5544CA`,
  fixture(`legistar/insite/${id}.html`),
] as const;

export const utilitiesFixtures: Record<string, FixtureBody> = {
  [FEED_URL]: fixture('laredo-utilities/feed.xml'),
};

export const legistarFixtures: Record<string, FixtureBody> = {
  [bodiesUrl]: fixture('legistar/bodies.json'),
  [eventsUrl(FIXTURE_NOW)]: fixture('legistar/events.json'),
  ...Object.fromEntries([1548, 1622, 1623, 1334, 1625].map(insite)),
  // Meeting pages not captured answer 404: the adapter then keeps documents from the API only.
  'https://cityoflaredo.legistar.com/MeetingDetail.aspx?*': { status: 404 },
};

export const legistar2024Fixtures: Record<string, FixtureBody> = {
  [bodiesUrl]: fixture('legistar/bodies.json'),
  [eventsUrl(FIXTURE_NOW_2024)]: fixture('legistar/events-2024.json'),
  'https://cityoflaredo.legistar.com/MeetingDetail.aspx?*': { status: 404 },
};

export const newsroomFixtures: Record<string, FixtureBody> = {
  [NEWSROOM_URL]: fixture('city-newsroom/newsroom.html'),
  [departmentListUrl('13')]: fixture('city-newsroom/newsroom-dept-13-fire.html'),
  [departmentListUrl('23')]: fixture('city-newsroom/newsroom-dept-23-police.html'),
  [departmentListUrl('14')]: fixture('city-newsroom/newsroom-dept-14-health.html'),
  [departmentListUrl(CONTROL_DEPARTMENT)]: fixture('city-newsroom/newsroom-dept-28-airport.html'),
};

/** The archive list stands in for the main list so a Fire-only Item is present; every page is a real capture. */
export const newsroomArchiveFixtures: Record<string, FixtureBody> = {
  [NEWSROOM_URL]: fixture('city-newsroom/newsroom-archive.html'),
  [departmentListUrl('13')]: fixture('city-newsroom/newsroom-archive-dept-13-fire.html'),
  [departmentListUrl('23')]: fixture('city-newsroom/newsroom-dept-23-police.html'),
  [departmentListUrl('14')]: fixture('city-newsroom/newsroom-dept-14-health.html'),
  [departmentListUrl(CONTROL_DEPARTMENT)]: fixture('city-newsroom/newsroom-dept-28-airport.html'),
};

export const calendarFixtures: Record<string, FixtureBody> = {
  [monthUrl(2026, 9)]: fixture('city-calendar/month-2026-09.html'),
  [monthUrl(2026, 10)]: fixture('city-calendar/month-2026-10.html'),
  [eventUrl('3320')]: fixture('city-calendar/event-3320.html'),
  [eventUrl('3360')]: fixture('city-calendar/event-3360.html'),
  [eventUrl('3304')]: fixture('city-calendar/event-3304.html'),
  // Detail pages not captured answer 404: the adapter then uses the grid's date and title.
  'https://www.cityoflaredo.com/Home/Components/Calendar/Event/*': { status: 404 },
};

export const bidsFixtures: Record<string, FixtureBody> = {
  [BIDS_URL]: fixture('city-bids/bids.html'),
};

/**
 * The two 2026 Election pages and their candidates sub-pages. The special election's pages are
 * recorded and mapped here although only the general pair is read until issue 04 wires it up.
 */
export const electionFixtures: Record<string, FixtureBody> = {
  [GENERAL_ELECTION_URL]: fixture('city-elections/general-2026.html'),
  [GENERAL_CANDIDATES_URL]: fixture('city-elections/general-2026-candidates.html'),
  [SPECIAL_ELECTION_URL]: fixture('city-elections/special-2026.html'),
  [SPECIAL_CANDIDATES_URL]: fixture('city-elections/special-2026-candidates.html'),
};

/**
 * The campaign finance page, recorded with the election pages so issue 05 does not have to fetch it
 * again. Every other fixture map keys off a URL its adapter exports; the finance adapter does not
 * exist yet, so the URL lives here until issue 05 moves it there.
 */
export const CAMPAIGN_FINANCE_URL = 'https://www.cityoflaredo.com/departments/city-secretary-s-office/campaign-finance-reports';

export const financeFixtures: Record<string, FixtureBody> = {
  [CAMPAIGN_FINANCE_URL]: fixture('city-finance/campaign-finance-reports.html'),
};

export function allFixtures(): Record<string, FixtureBody> {
  return { ...utilitiesFixtures, ...legistarFixtures, ...newsroomFixtures, ...calendarFixtures, ...bidsFixtures, ...electionFixtures, ...financeFixtures };
}

export function allFixturesFetcher() {
  return fixtureFetcher(allFixtures());
}
