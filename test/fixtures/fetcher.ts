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
import { CAMPAIGN_FINANCE_URL } from '../../src/sources/city-finance.js';
import { CONTROL_DEPARTMENT, departmentListUrl, NEWSROOM_URL } from '../../src/sources/city-newsroom.js';
import { FEED_URL } from '../../src/sources/laredo-utilities.js';
import { bodiesUrl, eventsUrl } from '../../src/sources/legistar.js';
import { document, fixture } from './paths.js';

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

/** The two 2026 Election pages and their candidates sub-pages; the Source reads all four (issue 04). */
export const electionFixtures: Record<string, FixtureBody> = {
  [GENERAL_ELECTION_URL]: fixture('city-elections/general-2026.html'),
  [GENERAL_CANDIDATES_URL]: fixture('city-elections/general-2026-candidates.html'),
  [SPECIAL_ELECTION_URL]: fixture('city-elections/special-2026.html'),
  [SPECIAL_CANDIDATES_URL]: fixture('city-elections/special-2026-candidates.html'),
};

/**
 * The campaign finance reports the build opens (issue 06). None is a capture: the city has posted
 * no readable report to capture and this project keeps no copy of a real one (ADR-0001). They are
 * written by `scripts/make-pdf-fixtures.ts`, filed by people who do not exist, with totals that are
 * nobody's; see the README beside them.
 *
 * Three real document ids stand in for the three shapes the reader has to tell apart, and every
 * other document the city links answers with the scan, which is what every real report is today:
 *
 * - 23838, Gilbert Gonzalez's July 15, 2026 report: a plain text layer this reads.
 * - 23812, Alyssa Cigarroa's July 15, 2026 report: the same form written the awkward way a real
 *   writer does, with kerned `TJ` arrays, hexadecimal strings and an indirect `/Length`.
 * - 22178, Gilbert Gonzalez's January 15, 2026 report: an amendment filed behind an original whose
 *   total contributions box was left blank, which has to come back unreadable rather than read half
 *   from one sheet and half from the other.
 */
export const financeDocumentFixtures: Record<string, FixtureBody> = {
  'https://www.cityoflaredo.com/home/showpublisheddocument/23838/639197320934130000': document(
    'city-finance/synthetic-cover-sheet.pdf',
    'CFR D1 Gilbert Gonzalez 010126063026.pdf',
  ),
  'https://www.cityoflaredo.com/home/showpublisheddocument/23812/639197300666370000': document(
    'city-finance/synthetic-cover-sheet-kerned.pdf',
    'CFR D8 Alyssa Cigarroa 010126063026.pdf',
  ),
  'https://www.cityoflaredo.com/home/showpublisheddocument/22178/639040911917700000': document(
    'city-finance/synthetic-amended.pdf',
    'CFR D1 Gilbert Gonzalez AMENDED 010125123125.pdf',
  ),
  'https://www.cityoflaredo.com/home/showpublisheddocument/*': document('city-finance/synthetic-scanned.pdf', 'CFR scanned.pdf'),
};

/** The city's campaign finance page: every report filed with the City Secretary since 2015. */
export const financeFixtures: Record<string, FixtureBody> = {
  [CAMPAIGN_FINANCE_URL]: fixture('city-finance/campaign-finance-reports.html'),
  ...financeDocumentFixtures,
};

export function allFixtures(): Record<string, FixtureBody> {
  return { ...utilitiesFixtures, ...legistarFixtures, ...newsroomFixtures, ...calendarFixtures, ...bidsFixtures, ...electionFixtures, ...financeFixtures };
}

export function allFixturesFetcher() {
  return fixtureFetcher(allFixtures());
}
