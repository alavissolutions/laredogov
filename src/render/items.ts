import { daysBetween, dayOf, formatDate, formatTime, hasTime, sortValue } from '../dates.js';
import type { Item, Meeting, Topic } from '../domain.js';
import { t } from '../i18n/strings.js';
import { href, PATHS, type RenderContext } from './context.js';
import { esc } from './html.js';

/** The title a resident sees. Stream lines are interface text and so are localized; everything else is the Publisher's. */
export function itemTitle(ctx: RenderContext, item: Item): string {
  if (item.stream) {
    const meeting = ctx.data.meetings.find((m) => m.id === item.stream!.meetingId);
    const body = meeting?.bodyName ?? '';
    const date = meeting ? formatDate(ctx.lang, meeting.date, 'short') : '';
    return t(ctx.lang, `stream.${item.stream.kind}`, { body, date });
  }
  return item.title;
}

export function itemDateLabel(ctx: RenderContext, iso: string): string {
  const date = formatDate(ctx.lang, iso, 'short');
  return hasTime(iso) ? `${date}, ${formatTime(ctx.lang, iso)}` : date;
}

/** Days an Item may be missing from its Source's listing before the page says so. */
export const NOT_SEEN_DAYS = 7;

/**
 * True when the Source has been read successfully for a week or more without listing this Item.
 * The site never fetches Item links themselves, so this is the honest signal it can give (user story 33):
 * the Publisher's list no longer carries it, and the link may be gone.
 */
export function isUnlisted(ctx: RenderContext, item: Item): boolean {
  const lastSuccess = ctx.data.sources[item.source]?.lastSuccess;
  return !!lastSuccess && daysBetween(item.lastSeenLive, lastSuccess) >= NOT_SEEN_DAYS;
}

/**
 * When an Item was posted, for windows and ordering. An Event's own date is when it happens, which
 * may be weeks ahead, so it counts as posted when the site first saw it.
 */
export function postedDate(item: Item): string {
  return item.event ? item.firstSeen : item.date;
}

/** How an Item is drawn where its surroundings already say something the line would repeat. */
export interface ItemLineOptions {
  /** Leave off the Election chip on a page that is already about that one Election. */
  omitElection?: boolean;
}

export function itemLine(ctx: RenderContext, item: Item, options: ItemLineOptions = {}): string {
  const { lang } = ctx;
  const title = itemTitle(ctx, item);
  const titleLink = item.stream
    ? `<a class="title" href="${href(ctx, PATHS.meeting(item.stream.meetingId))}">${esc(title)}</a>`
    : `<a class="title" href="${esc(item.url)}" rel="noopener">${esc(title)}</a>`;
  const parts = [
    `<span class="publisher">${esc(t(lang, `publisher.${item.publisher}`))}</span>`,
    `<time datetime="${esc(item.date)}">${esc(itemDateLabel(ctx, item.date))}</time>`,
    `<a class="topic" href="${href(ctx, PATHS.topic(item.topic))}">${esc(t(lang, `topic.${item.topic}`))}</a>`,
  ];
  // An Item a Publisher posted with an Election says which Election, in the Publisher's own words.
  // Two Elections post lists under the very same title ("Early Voting Sites") for different weeks,
  // and a voter meeting one in the feed or the New panel has to be able to tell them apart (issue 04).
  const election = item.election && !options.omitElection ? ctx.data.elections.find((e) => e.id === item.election?.id) : undefined;
  if (election) parts.push(`<a class="election" href="${href(ctx, PATHS.election(election.slug))}">${esc(election.title)}</a>`);
  if (item.event?.place) parts.push(`<span class="place">${esc(item.event.place)}</span>`);
  if (item.stream) parts.push(`<a href="${esc(item.url)}" rel="noopener">${esc(t(lang, 'item.officialDocument'))}</a>`);
  let extra = '';
  if (item.topicReason) {
    extra += `<span class="reason">${esc(t(lang, 'item.topicReason.department', { topic: t(lang, `topic.${item.topic}`), department: item.topicReason.department }))}</span>`;
  }
  if (isUnlisted(ctx, item)) {
    extra += `<span class="stale">${esc(t(lang, 'item.notSeenSince', { date: formatDate(lang, item.lastSeenLive, 'short') }))}</span>`;
  }
  return `<li>${titleLink}<span class="meta">${parts.join('<span class="sep" aria-hidden="true">·</span>')}</span>${extra}</li>`;
}

export function itemList(ctx: RenderContext, items: Item[], emptyText: string, options: ItemLineOptions = {}): string {
  if (items.length === 0) return `<p class="empty">${esc(emptyText)}</p>`;
  return `<ul class="items">\n${items.map((i) => itemLine(ctx, i, options)).join('\n')}\n</ul>`;
}

/** Items posted in the 90-day window, newest posting first (see postedDate). */
export function recentItems(ctx: RenderContext, topic?: Topic): Item[] {
  return ctx.data.items
    .filter((i) => dayOf(postedDate(i)) >= ctx.windowStart && dayOf(postedDate(i)) <= ctx.today)
    .filter((i) => !topic || i.topic === topic)
    .sort((a, b) => sortValue(postedDate(b)) - sortValue(postedDate(a)) || a.id.localeCompare(b.id));
}

export type ComingUpEntry = { kind: 'meeting'; meeting: Meeting; when: number; day: string } | { kind: 'event'; item: Item; when: number; day: string };

/** Meetings and Events in the next 14 days, soonest first, City Council first among same-day Meetings. */
export function comingUp(ctx: RenderContext): ComingUpEntry[] {
  const entries: ComingUpEntry[] = [];
  for (const meeting of ctx.data.meetings) {
    if (meeting.date < ctx.today || meeting.date > ctx.windowEnd) continue;
    entries.push({ kind: 'meeting', meeting, when: sortValue(meeting.date), day: meeting.date });
  }
  for (const item of ctx.data.items) {
    if (!item.event) continue;
    const day = dayOf(item.event.start);
    if (day < ctx.today || day > ctx.windowEnd) continue;
    entries.push({ kind: 'event', item, when: sortValue(item.event.start), day });
  }
  return entries.sort((a, b) => {
    if (a.day !== b.day) return a.day < b.day ? -1 : 1;
    const pa = a.kind === 'meeting' && isCouncil(ctx, a.meeting) ? 0 : 1;
    const pb = b.kind === 'meeting' && isCouncil(ctx, b.meeting) ? 0 : 1;
    if (pa !== pb) return pa - pb;
    return a.when - b.when || label(a).localeCompare(label(b));
  });
}

function label(e: ComingUpEntry): string {
  return e.kind === 'meeting' ? e.meeting.bodyName : e.item.title;
}

export function isCouncil(ctx: RenderContext, meeting: Meeting): boolean {
  const body = ctx.data.bodies.find((b) => b.id === meeting.bodyId);
  return body?.primary === true || /^city council$/i.test(meeting.bodyName);
}

export function meetingLine(ctx: RenderContext, meeting: Meeting): string {
  const { lang } = ctx;
  const cancelled = meeting.cancelled ? ` <span class="badge cancelled">${esc(t(lang, 'meetings.cancelled'))}</span>` : '';
  const time = meeting.time ? `, ${esc(meeting.time)}` : '';
  return `<li><a class="title" href="${href(ctx, PATHS.meeting(meeting.id))}">${esc(meeting.bodyName)}</a><span class="badge meeting">${esc(t(lang, 'topic.meetings'))}</span>${cancelled}<span class="meta"><time datetime="${meeting.date}">${esc(formatDate(lang, meeting.date, 'long'))}</time>${time}${meeting.location ? `<span class="sep" aria-hidden="true">·</span>${esc(meeting.location)}` : ''}</span></li>`;
}

export function comingUpLine(ctx: RenderContext, entry: ComingUpEntry): string {
  if (entry.kind === 'meeting') return meetingLine(ctx, entry.meeting);
  const { item } = entry;
  const { lang } = ctx;
  const start = item.event!.start;
  const when = hasTime(start) ? `${formatDate(lang, start, 'long')}, ${formatTime(lang, start)}` : formatDate(lang, start, 'long');
  const place = item.event!.place ? `<span class="sep" aria-hidden="true">·</span>${esc(item.event!.place)}` : '';
  return `<li><a class="title" href="${esc(item.url)}" rel="noopener">${esc(item.title)}</a><span class="badge event">${esc(t(lang, 'topic.events'))}</span><span class="meta"><time datetime="${esc(start)}">${esc(when)}</time>${place}<span class="sep" aria-hidden="true">·</span>${esc(t(lang, `publisher.${item.publisher}`))}</span></li>`;
}
