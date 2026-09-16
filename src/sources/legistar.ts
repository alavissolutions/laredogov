import { load } from 'cheerio';
import { centralDate, daysBetween } from '../dates.js';
import type { DocumentKind, Meeting } from '../domain.js';
import { ensureOk } from '../fetcher/types.js';
import type { NewMeeting, SourceAdapter, SourceRunContext } from './types.js';

export const LEGISTAR_API = 'https://webapi.legistar.com/v1/cityoflaredo';
export const SWAGIT_ROOT = 'https://laredotx.new.swagit.com/';

/** Swagit archive pages per Body, used when Legistar has no video for a Meeting. */
const SWAGIT_ARCHIVE_BY_BODY: Record<string, string> = {
  '138': 'https://laredotx.new.swagit.com/views/168/city-council',
};

export function swagitArchiveFor(bodyId: string): string {
  return SWAGIT_ARCHIVE_BY_BODY[bodyId] ?? SWAGIT_ROOT;
}

interface LegistarBody {
  BodyId: number;
  BodyName: string;
  BodyActiveFlag: number;
  BodyTypeName?: string;
}

interface LegistarEvent {
  EventId: number;
  EventGuid?: string;
  EventLastModifiedUtc?: string;
  EventBodyId: number;
  EventBodyName: string;
  EventDate: string;
  EventTime?: string | null;
  EventAgendaStatusName?: string | null;
  EventMinutesStatusName?: string | null;
  EventLocation?: string | null;
  EventAgendaFile?: string | null;
  EventMinutesFile?: string | null;
  EventAgendaLastPublishedUTC?: string | null;
  EventMinutesLastPublishedUTC?: string | null;
  EventComment?: string | null;
  EventVideoPath?: string | null;
  EventMedia?: string | null;
  EventInSiteURL?: string | null;
}

/** The API's window: from the first of the month two months back to the first of the month thirteen months ahead. */
export function eventsUrl(now: Date): string {
  const today = centralDate(now);
  const [y, m] = today.split('-').map(Number) as [number, number, number];
  const since = firstOfMonth(y, m - 2);
  const until = firstOfMonth(y, m + 13);
  return `${LEGISTAR_API}/events?$filter=EventDate ge datetime'${since}' and EventDate lt datetime'${until}'&$orderby=EventDate`;
}

export const bodiesUrl = `${LEGISTAR_API}/bodies`;

function firstOfMonth(year: number, month1: number): string {
  const d = new Date(Date.UTC(year, month1 - 1, 1));
  return d.toISOString().slice(0, 10);
}

/** Legistar stamps are UTC without a zone suffix. */
function utc(stamp: string | null | undefined): string | undefined {
  if (!stamp) return undefined;
  return /Z$|[+-]\d{2}:\d{2}$/.test(stamp) ? stamp : `${stamp}Z`;
}

function isCancelled(e: LegistarEvent): boolean {
  return /cancel/i.test(`${e.EventComment ?? ''} ${e.EventAgendaStatusName ?? ''} ${e.EventLocation ?? ''}`);
}

/**
 * Legistar Web API for every city Body. Meetings are keyed by Legistar event ID and Bodies by body ID.
 * Video comes from the event's video field when present, otherwise the Swagit media link, otherwise the
 * Body's Swagit archive page. The agenda packet is only on the InSite meeting page, which is fetched once
 * per Meeting and again only when the Publisher's last-modified stamp changes or the Meeting is within a week.
 */
export const legistar: SourceAdapter = {
  id: 'legistar',
  publisher: 'city-of-laredo',
  fetchMode: 'http',
  topicRule: { topics: ['meetings'], stringsKey: 'topicRule.legistar' },
  directory: { url: 'https://cityoflaredo.legistar.com/Calendar.aspx', stringsKey: 'dir.legistar', lastVerified: '2026-09-16' },
  async run(ctx) {
    const { fetcher, now, previous, log } = ctx;
    const bodiesRes = ensureOk(await fetcher.fetch(bodiesUrl, 'http'));
    const bodies = (JSON.parse(bodiesRes.body) as LegistarBody[]).map((b) => ({
      id: String(b.BodyId),
      name: b.BodyName.trim(),
      ...(b.BodyTypeName === 'Primary Legislative Body' ? { primary: true } : {}),
    }));

    const eventsRes = ensureOk(await fetcher.fetch(eventsUrl(now), 'http'));
    const events = JSON.parse(eventsRes.body) as LegistarEvent[];
    const previousById = new Map(previous.meetings.filter((m) => m.source === 'legistar').map((m) => [m.id, m]));
    const today = centralDate(now);

    const meetings: NewMeeting[] = [];
    let insiteFetches = 0;
    for (const e of events) {
      const id = String(e.EventId);
      const date = e.EventDate.slice(0, 10);
      const prev = previousById.get(id);
      const lastModified = utc(e.EventLastModifiedUtc);
      const documents: Meeting['documents'] = {};
      if (e.EventAgendaFile) documents.agenda = withPublished(e.EventAgendaFile, utc(e.EventAgendaLastPublishedUTC) ?? lastModified);
      if (e.EventMinutesFile) documents.minutes = withPublished(e.EventMinutesFile, utc(e.EventMinutesLastPublishedUTC) ?? lastModified);
      const video = e.EventVideoPath || e.EventMedia;
      if (video) documents.video = withPublished(video, lastModified);
      if (prev?.documents.packet) documents.packet = prev.documents.packet;

      const url = e.EventInSiteURL ?? `https://cityoflaredo.legistar.com/MeetingDetail.aspx?ID=${id}`;
      const changed = !prev || prev.lastModified !== lastModified;
      const near = Math.abs(daysBetween(today, date)) <= 7;
      if (e.EventInSiteURL && e.EventAgendaFile && (changed || near)) {
        insiteFetches += 1;
        const packet = await packetFromInSite(ctx, e.EventInSiteURL, lastModified);
        if (packet) documents.packet = packet;
      }

      meetings.push({
        id,
        bodyId: String(e.EventBodyId),
        bodyName: e.EventBodyName.trim(),
        date,
        ...(e.EventTime ? { time: e.EventTime.trim() } : {}),
        ...(e.EventLocation?.trim() ? { location: e.EventLocation.trim() } : {}),
        cancelled: isCancelled(e),
        url,
        documents,
        ...(lastModified ? { lastModified } : {}),
      });
    }
    log(`legistar: ${events.length} events in window, ${bodies.length} bodies, ${insiteFetches} InSite pages fetched`);
    return { items: [], meetings, bodies };
  },
};

function withPublished(url: string, publishedAt: string | undefined): { url: string; publishedAt?: string } {
  return publishedAt ? { url, publishedAt } : { url };
}

async function packetFromInSite(
  { fetcher, log }: SourceRunContext,
  insiteUrl: string,
  lastModified: string | undefined,
): Promise<{ url: string; publishedAt?: string } | undefined> {
  const res = await fetcher.fetch(insiteUrl, 'http');
  if (res.status !== 200) {
    log(`legistar: InSite page ${insiteUrl} returned ${res.status}; packet unknown`);
    return undefined;
  }
  const $ = load(res.body);
  const href = $('a#ctl00_ContentPlaceHolder1_hypAgendaPacket[href]').attr('href');
  if (!href) return undefined;
  return withPublished(new URL(href, insiteUrl).toString(), lastModified);
}

export const DOCUMENT_KINDS_FOR_STREAM: readonly DocumentKind[] = ['agenda', 'packet', 'minutes', 'video'];
