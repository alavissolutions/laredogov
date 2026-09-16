/**
 * Vocabulary from CONTEXT.md. Publisher, Source, Feed, Lookup, Item, Body, Meeting, Event, Topic, Directory.
 */

export const TOPICS = [
  'meetings',
  'news-and-notices',
  'public-safety',
  'events',
  'taxes-and-property',
  'roads-and-transit',
  'health',
  'jobs-and-bids',
  'elections',
] as const;
export type Topic = (typeof TOPICS)[number];

export function isTopic(value: unknown): value is Topic {
  return typeof value === 'string' && (TOPICS as readonly string[]).includes(value);
}

export const PUBLISHERS = [
  'city-of-laredo',
  'laredo-utilities',
  'laredo-police',
  'laredo-fire',
  'laredo-health',
  'laredo-library',
  'el-metro',
  'laredo-mpo',
  'webb-county',
  'webb-cad',
  'lisd',
  'uisd',
  'laredo-college',
  'laredo-housing-authority',
  'txdot-laredo',
] as const;
export type PublisherId = (typeof PUBLISHERS)[number];

export type Lang = 'en' | 'es';
export const LANGS: readonly Lang[] = ['en', 'es'];

export type DocumentKind = 'agenda' | 'packet' | 'minutes' | 'video';
export const DOCUMENT_KINDS: readonly DocumentKind[] = ['agenda', 'packet', 'minutes', 'video'];

/** ISO 8601: either a date `YYYY-MM-DD` (Central time) or a full timestamp with offset. */
export type IsoDateOrTime = string;

export interface Item {
  /** `${source}:${key}`; stable across builds so a re-run never duplicates. */
  id: string;
  /** Left in the Publisher's language, never translated. */
  title: string;
  /** The Publisher's own date. */
  date: IsoDateOrTime;
  /** Where the Publisher put it. */
  url: string;
  topic: Topic;
  publisher: PublisherId;
  source: string;
  firstSeen: string;
  lastSeenLive: string;
  /** Why the Item got its Topic, when a Source maps the Publisher's own categories. */
  topicReason?: { department: string };
  /** Present on Events (public happenings a resident can attend). */
  event?: { start: IsoDateOrTime; end?: IsoDateOrTime; place?: string };
  /** Present on stream lines that announce a document attaching to a Meeting. */
  stream?: { kind: DocumentKind; meetingId: string };
}

export interface Meeting {
  /** Legistar event ID. */
  id: string;
  source: string;
  publisher: PublisherId;
  bodyId: string;
  bodyName: string;
  /** Central-time calendar date. */
  date: string;
  /** As the Publisher wrote it, e.g. "5:30 PM". */
  time?: string;
  location?: string;
  cancelled: boolean;
  /** The Meeting's page at the Publisher. */
  url: string;
  documents: Partial<Record<DocumentKind, { url: string; publishedAt?: string }>>;
  /** Publisher's last-modified stamp, used to skip unchanged detail pages. */
  lastModified?: string;
  firstSeen: string;
  lastSeenLive: string;
}

export interface Body {
  id: string;
  name: string;
  publisher: PublisherId;
  source: string;
  /** The Publisher's own ordering hint; City Council is always first regardless. */
  primary?: boolean;
}

export interface SourceHealth {
  firstChecked?: string;
  lastChecked?: string;
  lastSuccess?: string;
  lastNewItem?: string;
  lastError?: { at: string; message: string };
}

export interface DataFile {
  version: 1;
  items: Item[];
  meetings: Meeting[];
  bodies: Body[];
  sources: Record<string, SourceHealth>;
}

export function emptyData(): DataFile {
  return { version: 1, items: [], meetings: [], bodies: [], sources: {} };
}

/** Directory entries describe every Source and Lookup, ingested or not. */
export type DirectoryKind = 'feed' | 'source' | 'lookup';

export interface DirectoryEntry {
  id: string;
  publisher: PublisherId;
  kind: DirectoryKind;
  url: string;
  /** Strings-file key prefix: `${key}.name`, `${key}.description`, `${key}.cadence`, optional `${key}.searchWith`. */
  stringsKey: string;
  lastVerified: string;
  /** The Publisher posts this only on a social network the site never fetches (ADR-0003). */
  socialOnly?: 'facebook' | 'x';
  /** True for Lookups: has a `searchWith` string. */
  hasSearchWith?: boolean;
}
