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
  /**
   * The last day of an entry the Publisher printed as spanning more than one, such as a two-day
   * holiday. Absent for the single day every other entry is.
   */
  endDate?: string;
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
 * One election day run by a Publisher (CONTEXT.md). Its Races are separate records keyed by
 * `electionId`; this record carries what the Publisher puts on the Election's own page.
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

/** What a Race is: an office with Candidates, or a question the Publisher put on the ballot. */
export type RaceKind = 'office' | 'question';

/**
 * A row the Publisher printed under a Race with no candidate name: a treasurer appointment and
 * nothing else. It is not a Candidate (CONTEXT.md) and nobody is named for it; it renders in ballot
 * order as "candidate name not yet posted" so a reader sees the row the Publisher published.
 */
export interface UnnamedRow {
  /** The Publisher's ballot order within the Race, counted over every row it printed. */
  order: number;
  /** The treasurer the Publisher named, if it named one. */
  treasurer?: string;
  /** Filing ids the Publisher linked in that row. */
  filings: string[];
}

/**
 * One office or question on an Election's ballot (CONTEXT.md). Candidates and Filings are their own
 * records keyed by `raceId`; a question Race carries the Publisher's link to what called it.
 */
export interface Race {
  /** `${electionId}:${slug}`; stable across builds. */
  id: string;
  electionId: string;
  /** Last path segment of the Race's page, e.g. `mayor`. Fixed by the Source, never derived from a filename. */
  slug: string;
  /** The Publisher's own heading for the Race; never translated. */
  title: string;
  kind: RaceKind;
  /** The Publisher's own order of Races on its page. */
  order: number;
  publisher: PublisherId;
  source: string;
  /** Present on a question Race: the Publisher's own link to the document that called the question. */
  question?: { label: string; url: string };
  unnamedRows: UnnamedRow[];
  firstSeen: string;
  lastSeenLive: string;
}

/**
 * A person the Publisher lists by name under a Race (CONTEXT.md). Both names are printed as the
 * Publisher printed them; the site never derives a name from a filename or adds a label.
 */
export interface Candidate {
  /** `${raceId}:${slug of the legal name}`: identity is the Election, the Race, and the legal name. */
  id: string;
  raceId: string;
  electionId: string;
  /** Last path segment of the Candidate's page, from the name on ballot. */
  slug: string;
  /** Legal name, as printed in the Publisher's table. */
  name: string;
  /** Name on ballot, as printed. */
  ballotName: string;
  /** The campaign treasurer the Publisher named. */
  treasurer?: string;
  /** The Publisher's ballot order within the Race. */
  order: number;
  /** Filing ids, in the order the Publisher listed them. */
  filings: string[];
  publisher: PublisherId;
  source: string;
  firstSeen: string;
  lastSeenLive: string;
}

/** What a Filing is, by where the Publisher placed it and how it labelled the link (CONTEXT.md). */
export type FilingKind = 'treasurer-appointment' | 'ballot-application' | 'finance-report';

/**
 * Something the Publisher posted under a Candidate's name (CONTEXT.md). Identity is the Publisher's
 * own document id, so one document is one Filing wherever the Publisher links it.
 */
export interface Filing {
  /** `${source}:filing:${documentId}`. */
  id: string;
  /** The Publisher's numeric document id, with the cache-busting ticks dropped. */
  documentId: string;
  kind: FilingKind;
  /** The Publisher's own label for the link (its anchor title); never translated. */
  label: string;
  /** The office the Publisher filed it under, in the Publisher's words. */
  office?: string;
  candidateId?: string;
  raceId?: string;
  electionId?: string;
  url: string;
  publisher: PublisherId;
  source: string;
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
  races: Race[];
  candidates: Candidate[];
  filings: Filing[];
  sources: Record<string, SourceHealth>;
}

export function emptyData(): DataFile {
  return { version: 1, items: [], meetings: [], bodies: [], elections: [], races: [], candidates: [], filings: [], sources: {} };
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
