import type { Body, Candidate, DataFile, DirectoryEntry, Election, Figure, Filing, Item, Meeting, PublisherId, Race, Topic } from '../domain.js';
import type { Fetcher } from '../fetcher/types.js';

/** What an adapter returns for a new or re-seen Item; the build fills in first-seen and last-seen-live. */
export type NewItem = Omit<Item, 'firstSeen' | 'lastSeenLive' | 'source' | 'publisher'>;

/** What an adapter returns for a Meeting; the build fills in first-seen and last-seen-live. */
export type NewMeeting = Omit<Meeting, 'firstSeen' | 'lastSeenLive' | 'source' | 'publisher'>;

/** What an adapter returns for an Election; the build fills in first-seen and last-seen-live. */
export type NewElection = Omit<Election, 'firstSeen' | 'lastSeenLive' | 'source' | 'publisher'>;

/** What an adapter returns for a Race, a Candidate, and a Filing; the build stamps them the same way. */
export type NewRace = Omit<Race, 'firstSeen' | 'lastSeenLive' | 'source' | 'publisher'>;
export type NewCandidate = Omit<Candidate, 'firstSeen' | 'lastSeenLive' | 'source' | 'publisher'>;
export type NewFiling = Omit<Filing, 'firstSeen' | 'lastSeenLive' | 'source' | 'publisher'>;
export type NewFigure = Omit<Figure, 'firstSeen' | 'lastSeenLive' | 'source' | 'publisher'>;

export interface SourceRunContext {
  fetcher: Fetcher;
  /** The data file as it stood before this run, so an adapter can skip unchanged detail pages. */
  previous: DataFile;
  /**
   * The owner's hand-kept elections file, read by the Sources that need it and never written
   * (ADR-0005). It is a path rather than its contents so a file the owner has mistyped fails the
   * one Source that reads it, in the run log, with the rest of the build still publishing.
   */
  handKeptFile: string;
  now: Date;
  log: (message: string) => void;
}

export interface SourceResult {
  items: NewItem[];
  meetings?: NewMeeting[];
  bodies?: Omit<Body, 'source' | 'publisher'>[];
  elections?: NewElection[];
  races?: NewRace[];
  candidates?: NewCandidate[];
  filings?: NewFiling[];
  figures?: NewFigure[];
}

/**
 * The Source adapter contract. Adding a Source means adding one of these:
 * it declares its Publisher, its Topic rule, and its Directory entry, and asks the fetcher for each
 * page in the mode that Source needs (`'http'`, or `'browser'` for the Akamai-fronted city site).
 */
export interface SourceAdapter {
  id: string;
  publisher: PublisherId;
  /** Which Topic(s) this Source files under, stated for the Directory and the README. */
  topicRule: { topics: readonly Topic[]; stringsKey: string };
  directory: Omit<DirectoryEntry, 'publisher' | 'kind' | 'id'>;
  run(ctx: SourceRunContext): Promise<SourceResult>;
}
