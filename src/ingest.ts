import { dayOf, formatDate } from './dates.js';
import type { Body, DataFile, DocumentKind, Item, Meeting, MeetingDocument, SourceHealth } from './domain.js';
import { DOCUMENT_KINDS } from './domain.js';
import type { Fetcher } from './fetcher/types.js';
import { t } from './i18n/strings.js';
import type { NewItem, NewMeeting, SourceAdapter } from './sources/types.js';

export interface IngestOptions {
  fetcher: Fetcher;
  sources: readonly SourceAdapter[];
  now: Date;
  log: (message: string) => void;
}

export interface IngestReport {
  newItems: number;
  failed: string[];
}

/**
 * Stage one: read every Feed and update the data file. A Source that throws is recorded in its health
 * slot and the rest of the build proceeds (user story 36). Adapters run in registry order and each sees
 * the data as updated by the adapters before it.
 */
export async function ingest(data: DataFile, { fetcher, sources, now, log }: IngestOptions): Promise<IngestReport> {
  const stamp = now.toISOString();
  const report: IngestReport = { newItems: 0, failed: [] };

  for (const source of sources) {
    const health: SourceHealth = data.sources[source.id] ?? {};
    data.sources[source.id] = health;
    health.firstChecked ??= stamp;
    health.lastChecked = stamp;
    try {
      const result = await source.run({ fetcher, previous: data, now, log });
      const added = mergeItems(data, source, result.items, stamp);
      if (result.bodies) mergeBodies(data, source, result.bodies);
      if (result.meetings) {
        const streamLines = mergeMeetings(data, source, result.meetings, stamp);
        report.newItems += streamLines;
        if (streamLines > 0) health.lastNewItem = stamp;
      }
      report.newItems += added;
      if (added > 0) health.lastNewItem = stamp;
      health.lastSuccess = stamp;
      delete health.lastError;
      log(`${source.id}: ok, ${added} new Items`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      health.lastError = { at: stamp, message };
      report.failed.push(source.id);
      log(`${source.id}: FAILED, ${message}`);
    }
  }
  return report;
}

function mergeItems(data: DataFile, source: SourceAdapter, items: readonly NewItem[], stamp: string): number {
  const byId = new Map(data.items.map((i) => [i.id, i]));
  let added = 0;
  for (const incoming of items) {
    const existing = byId.get(incoming.id);
    if (existing) {
      Object.assign(existing, incoming, { lastSeenLive: stamp });
    } else {
      const item: Item = { ...incoming, source: source.id, publisher: source.publisher, firstSeen: stamp, lastSeenLive: stamp };
      data.items.push(item);
      byId.set(item.id, item);
      added += 1;
    }
  }
  return added;
}

function mergeBodies(data: DataFile, source: SourceAdapter, bodies: ReadonlyArray<Omit<Body, 'source' | 'publisher'>>): void {
  const byId = new Map(data.bodies.map((b) => [b.id, b]));
  for (const incoming of bodies) {
    const existing = byId.get(incoming.id);
    if (existing) Object.assign(existing, incoming);
    else data.bodies.push({ ...incoming, source: source.id, publisher: source.publisher });
  }
}

/**
 * Merges Meetings and returns how many stream lines were added for newly attached documents.
 * A stream line whose document is still attached is marked seen live, like any re-seen Item.
 */
function mergeMeetings(data: DataFile, source: SourceAdapter, meetings: readonly NewMeeting[], stamp: string): number {
  const byId = new Map(data.meetings.map((m) => [m.id, m]));
  const itemsById = new Map(data.items.map((i) => [i.id, i]));
  let added = 0;
  for (const incoming of meetings) {
    const existing = byId.get(incoming.id);
    let merged: Meeting;
    if (existing) {
      const previousDocs = existing.documents;
      Object.assign(existing, incoming, { lastSeenLive: stamp });
      // A document once seen stays attached even if the API drops it for a run.
      existing.documents = { ...previousDocs, ...incoming.documents };
      merged = existing;
    } else {
      merged = { ...incoming, source: source.id, publisher: source.publisher, firstSeen: stamp, lastSeenLive: stamp };
      data.meetings.push(merged);
      byId.set(merged.id, merged);
    }
    for (const kind of DOCUMENT_KINDS) {
      const doc = merged.documents[kind];
      if (!doc) continue;
      const id = streamItemId(merged, kind);
      const existing = itemsById.get(id);
      if (existing) {
        existing.lastSeenLive = stamp;
        existing.url = doc.url;
        continue;
      }
      const line = streamItem(merged, kind, doc, stamp);
      data.items.push(line);
      itemsById.set(id, line);
      added += 1;
    }
  }
  return added;
}

export function streamItemId(meeting: Pick<Meeting, 'id' | 'source'>, kind: DocumentKind): string {
  return `${meeting.source}:stream:${meeting.id}:${kind}`;
}

/**
 * A stream line: an Item announcing that a document attached to a Meeting, dated by the Publisher.
 * The stored title is the English rendering for readers of the data file; pages render it per language.
 */
function streamItem(meeting: Meeting, kind: DocumentKind, doc: MeetingDocument, stamp: string): Item {
  const date = doc.publishedAt ?? meeting.lastModified ?? stamp;
  return {
    id: streamItemId(meeting, kind),
    title: t('en', `stream.${kind}`, { body: meeting.bodyName, date: formatDate('en', meeting.date, 'short') }),
    date: dayOf(date) < meeting.date && kind !== 'agenda' && kind !== 'packet' ? meeting.date : date,
    url: doc.url,
    topic: 'meetings',
    publisher: meeting.publisher,
    source: meeting.source,
    firstSeen: stamp,
    lastSeenLive: stamp,
    stream: { kind, meetingId: meeting.id },
  };
}
