import { load, type CheerioAPI } from 'cheerio';
import { centralDate, centralMidnight, fromCentral, parseClock, parseUsDateTime } from '../dates.js';
import { ensureOk } from '../fetcher/types.js';
import { CITY_SITE, collapse } from './city.js';
import type { NewItem, SourceAdapter } from './types.js';

export const CALENDAR_URL = `${CITY_SITE}/government/city-calendar`;

export function monthUrl(year: number, month1: number): string {
  return `${CALENDAR_URL}/-curm-${month1}/-cury-${year}`;
}

export function eventUrl(id: string): string {
  return `${CITY_SITE}/Home/Components/Calendar/Event/${id}/17`;
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

interface GridEntry {
  id: string;
  title: string;
  ymd: string;
  clock?: string;
}

/** Reads the month grid: each day cell is labelled "Scheduled events, Wednesday, September 2, 2026". */
export function parseMonthGrid(html: string): GridEntry[] {
  const $ = load(html);
  const out: GridEntry[] = [];
  $('td[aria-label^="Scheduled events"]').each((_, td) => {
    const label = $(td).attr('aria-label') ?? '';
    const m = /,\s*\w+,\s*(\w+)\s+(\d{1,2}),\s*(\d{4})/.exec(label);
    if (!m) return;
    const month = MONTHS.indexOf(m[1]!.toLowerCase()) + 1;
    if (!month) return;
    const ymd = `${m[3]}-${String(month).padStart(2, '0')}-${m[2]!.padStart(2, '0')}`;
    $(td)
      .find('.calendar_item')
      .each((__, item) => {
        const a = $(item).find('a.calendar_eventlink').first();
        const href = a.attr('href');
        const idMatch = href ? /\/Calendar\/Event\/(\d+)\//.exec(href) : null;
        const title = collapse(a.attr('title') ?? a.text());
        if (!idMatch || !title) return;
        const clock = parseClock($(item).find('.calendar_eventtime').text());
        out.push({ id: idMatch[1]!, title, ymd, ...(clock ? { clock } : {}) });
      });
  });
  return out;
}

interface Detail {
  subtitle?: string;
  start?: string;
  end?: string;
  place?: string;
}

export function parseEventDetail(html: string): Detail {
  const $ = load(html);
  const detail: Detail = {};
  const subtitle = collapse($('.detail-subtitle').first().text());
  if (subtitle) detail.subtitle = subtitle;
  $('.detail-list-label').each((_, el) => {
    const label = $(el).text().trim().toLowerCase();
    const valueEl = $(el).next('.detail-list-value');
    if (label.startsWith('date')) {
      // The value carries hidden schema.org <time> elements with exact instants; the visible text is the fallback.
      const startAttr = valueEl.find('time[itemprop="startDate"]').attr('datetime');
      const endAttr = valueEl.find('time[itemprop="endDate"]').attr('datetime');
      const range = startAttr ? rangeFromInstants(startAttr, endAttr) : parseDateRange(collapse(valueEl.text()));
      if (range.start) detail.start = range.start;
      if (range.end) detail.end = range.end;
    } else if (label.startsWith('location')) {
      const place = lines($, valueEl).join(', ');
      if (place) detail.place = place;
    }
  });
  return detail;
}

/** An all-day entry is stamped midnight to 23:59 Central; it becomes a date-only start with no end. */
function rangeFromInstants(startAttr: string, endAttr: string | undefined): { start?: string; end?: string } {
  const start = new Date(startAttr);
  if (Number.isNaN(start.getTime())) return {};
  const end = endAttr ? new Date(endAttr) : undefined;
  const startDay = centralDate(start);
  const allDay = start.getTime() === centralMidnight(startDay).getTime() && (!end || end.getTime() - start.getTime() >= 23 * 3_600_000);
  if (allDay) return { start: startDay };
  return { start: start.toISOString(), ...(end && !Number.isNaN(end.getTime()) ? { end: end.toISOString() } : {}) };
}

function lines($: CheerioAPI, el: ReturnType<CheerioAPI>): string[] {
  const html = el.html() ?? '';
  return load(`<div>${html.replace(/<br\s*\/?>/gi, '\n')}</div>`)('div')
    .text()
    .split('\n')
    .map(collapse)
    .filter(Boolean);
}

/** "09/30/2026 7:00 PM - 9:00 PM" or "09/30/2026" or "09/30/2026 7:00 PM - 10/01/2026 9:00 AM". */
export function parseDateRange(text: string): { start?: string; end?: string } {
  const first = /\d{1,2}\/\d{1,2}\/\d{4}(?:\s+\d{1,2}:\d{2}\s*[AP]M)?/i.exec(text);
  if (!first) return {};
  const start = parseUsDateTime(first[0]);
  if (!start) return {};
  const after = text.slice(first.index + first[0].length).trim();
  let end: string | undefined;
  if (after.startsWith('-')) {
    const tail = after.slice(1).trim();
    const endFull = parseUsDateTime(tail);
    if (endFull) end = endFull.iso;
    else {
      const clock = parseClock(tail);
      if (clock) end = fromCentral(start.ymd, clock).toISOString();
    }
  }
  return { start: start.iso, ...(end ? { end } : {}) };
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '');
}

/** A calendar title names a Body when it equals a Body's name or starts with one ("… Policy Committee"). */
export function namesBody(title: string, bodyNames: ReadonlySet<string>): boolean {
  const name = normalizeName(title);
  if (bodyNames.has(name)) return true;
  for (const body of bodyNames) {
    if (body.length >= 12 && name.startsWith(body)) return true;
  }
  return false;
}

/** The city labels board and commission meetings on its calendar with these subtitles; a "Town Hall Meeting" is an Event. */
const BODY_MEETING_SUBTITLE = /\b(committee|board|commission|council)\s+meeting\b/i;

/**
 * City calendar Events for the current and next month. Any calendar entry that is a Body's Meeting is
 * skipped because Legistar owns Meetings (ADR-0004, which records this rule): the title names a known
 * Body, a Meeting of that Body is already recorded for that day, or the city's own subtitle calls it a
 * committee, board, commission, or council meeting.
 */
export const cityCalendar: SourceAdapter = {
  id: 'city-calendar',
  publisher: 'city-of-laredo',
  topicRule: { topics: ['events'], stringsKey: 'topicRule.city-calendar' },
  directory: { url: CALENDAR_URL, stringsKey: 'dir.city-calendar', lastVerified: '2026-09-16' },
  async run({ fetcher, previous, now, log }) {
    const today = centralDate(now);
    const [y, m] = today.split('-').map(Number) as [number, number];
    const months: [number, number][] = [[y, m], m === 12 ? [y + 1, 1] : [y, m + 1]];
    const entries = new Map<string, GridEntry>();
    for (const [year, month] of months) {
      const res = ensureOk(await fetcher.fetch(monthUrl(year, month), 'browser'));
      for (const entry of parseMonthGrid(res.body)) entries.set(entry.id, entry);
    }

    const bodyNames = new Set(previous.bodies.map((b) => normalizeName(b.name)));
    const meetingsByDate = new Map<string, Set<string>>();
    for (const meeting of previous.meetings) {
      const set = meetingsByDate.get(meeting.date) ?? new Set<string>();
      set.add(normalizeName(meeting.bodyName));
      meetingsByDate.set(meeting.date, set);
    }
    const previousItems = new Map(previous.items.filter((i) => i.source === 'city-calendar').map((i) => [i.id, i]));

    const items: NewItem[] = [];
    let skipped = 0;
    let detailFetches = 0;
    for (const entry of entries.values()) {
      if (namesBody(entry.title, bodyNames) || meetingsByDate.get(entry.ymd)?.has(normalizeName(entry.title))) {
        skipped += 1;
        continue;
      }
      const id = `city-calendar:${entry.id}`;
      const seen = previousItems.get(id);
      if (seen) {
        items.push({ id, title: seen.title, date: seen.date, url: seen.url, topic: 'events', ...(seen.event ? { event: seen.event } : {}) });
        continue;
      }
      detailFetches += 1;
      const res = await fetcher.fetch(eventUrl(entry.id), 'browser');
      const detail = res.status === 200 ? parseEventDetail(res.body) : {};
      if (detail.subtitle && BODY_MEETING_SUBTITLE.test(detail.subtitle)) {
        skipped += 1;
        continue;
      }
      const start = detail.start ?? (entry.clock ? fromCentral(entry.ymd, entry.clock).toISOString() : entry.ymd);
      items.push({
        id,
        title: entry.title,
        date: start,
        url: eventUrl(entry.id),
        topic: 'events',
        event: { start, ...(detail.end ? { end: detail.end } : {}), ...(detail.place ? { place: detail.place } : {}) },
      });
    }
    log(`city-calendar: ${items.length} Events, ${skipped} Body Meetings skipped, ${detailFetches} detail pages fetched`);
    return { items };
  },
};
