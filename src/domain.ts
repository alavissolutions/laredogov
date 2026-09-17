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
  'texas-sos',
] as const;
export type PublisherId = (typeof PUBLISHERS)[number];

export type Lang = 'en' | 'es';
export const LANGS: readonly Lang[] = ['en', 'es'];

export type DocumentKind = 'agenda' | 'packet' | 'minutes' | 'video';
export const DOCUMENT_KINDS: readonly DocumentKind[] = ['agenda', 'packet', 'minutes', 'video'];

/** ISO 8601: either a date `YYYY-MM-DD` (Central time) or a full timestamp with offset. */
export type IsoDateOrTime = string;

/** A document attached to a Meeting, with the Publisher's publish stamp when it gives one. */
export interface MeetingDocument {
  url: string;
  publishedAt?: string;
}

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
  /** Present on stream lines: an Item that announces a document attaching to a Meeting (see CONTEXT.md). */
  stream?: { kind: DocumentKind; meetingId: string };
  /** Present on Items the Publisher posted with an Election, so the Election page can show them. */
  election?: { id: string; kind: ElectionItemKind };
}

/** What an Election Item is: a notice the Publisher dated, or a list of voting sites. */
export type ElectionItemKind = 'notice' | 'voting-site';

/** One dated line of the Publisher's own election calendar, in the Publisher's wording. */
export interface ElectionCalendarEntry {
  /** Central-time calendar date. */
  date: string;
  /** The date exactly as the Publisher printed it, kept for the data file's readers. */
  label: string;
  /** What the Publisher says happens that day; never translated. */
  description: string;
}

/** A link the Publisher posts beside an Election, and which Publisher it sends the reader to. */
export interface ElectionLink {
  /** `voting-site` links are the early-voting and election-day site lists; the rest are context. */
  kind: 'voting-site' | 'link';
  /** The Publisher's own label and sub-label; never translated. */
  label: string;
  note?: string;
  url: string;
  /** The Publisher the link leads to, when its host is one this site has declared. */
  publisher?: PublisherId;
}

/** A candidate forum the Publisher scheduled. `url` appears only once the Publisher posts one. */
export interface ElectionForum {
  /** The Race or group the Publisher named, as printed. */
  label: string;
  /** Central-time start, as an ISO timestamp. */
  start: IsoDateOrTime;
  url?: string;
}

/**
 * One election day run by a Publisher (CONTEXT.md). Its Races arrive with issue 02; this record
 * carries what the Publisher puts on the Election's own page.
 */
export interface Election {
  /** `${source}:${slug}`; stable across builds. */
  id: string;
  /** Last path segment of the Election's pages, e.g. `2026-general`. */
  slug: string;
  /** The Publisher's own heading for the Election; never translated. */
  title: string;
  /** Election day, Central-time calendar date. */
  date: string;
  publisher: PublisherId;
  source: string;
  /** The Publisher's own page for this Election. */
  url: string;
  calendar: ElectionCalendarEntry[];
  links: ElectionLink[];
  forums: ElectionForum[];
  firstSeen: string;
  lastSeenLive: string;
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
  documents: Partial<Record<DocumentKind, MeetingDocument>>;
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
  elections: Election[];
  sources: Record<string, SourceHealth>;
}

export function emptyData(): DataFile {
  return { version: 1, items: [], meetings: [], bodies: [], elections: [], sources: {} };
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
}
