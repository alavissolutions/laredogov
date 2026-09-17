/**
 * The city election pages Source (spec: .scratch/laredo-elections/spec.md, issue 01).
 *
 * The City of Laredo puts one page per Election: a dated calendar, a table of election notices, and
 * rows of image buttons for voting sites, its own sub-pages, the ordinances, and the outside sites a
 * voter needs. This adapter reads that page and the Election's candidates sub-page, and yields one
 * Election plus an Item for every notice and voting-site list the city dates. Race and Candidate
 * tables on the candidates sub-page arrive with issue 02.
 *
 * Nothing here is guessed from a title or a filename: which button is a voting-site list, and which
 * host belongs to which Publisher, are declared below (ADR-0004) from the pages as they stood on
 * 2026-09-17.
 */
import { load, type CheerioAPI } from 'cheerio';
import { dayOf, fromCentral, parseMonthNameDate, to24h } from '../dates.js';
import type { ElectionCalendarEntry, ElectionForum, ElectionLink, PublisherId } from '../domain.js';
import { ensureOk } from '../fetcher/types.js';
import { CITY_SITE, cityDocumentId, cityDocumentPostedAt, cityHref, collapse } from './city.js';
import type { NewElection, NewItem, SourceAdapter } from './types.js';

/** A cheerio selection, as the other city adapters spell it. */
type Selection = ReturnType<CheerioAPI>;

export const GENERAL_ELECTION_URL = `${CITY_SITE}/departments/2026-general-elections`;
export const GENERAL_CANDIDATES_URL = `${CITY_SITE}/departments/elections/2026-candidates-information`;
export const SPECIAL_ELECTION_URL = `${CITY_SITE}/departments/elections-2026/2026-special-elections`;
export const SPECIAL_CANDIDATES_URL = `${CITY_SITE}/departments/elections-2026/2026-special-election-candidates-information`;

/** One Election page the city keeps, and where its pages live on this site. */
export interface ElectionPage {
  /** Last path segment of the Election's pages on this site. */
  slug: string;
  /** Election day. The city states it in the ordinance proclaiming the Election, not in a field. */
  date: string;
  url: string;
  candidatesUrl: string;
}

/**
 * The Elections in scope, declared rather than discovered: the city has no index of its election
 * pages, and each one is a hand-built page under its own path. The December 5, 2026 District 8
 * special election joins this table with issue 04.
 */
export const ELECTION_PAGES: readonly ElectionPage[] = [
  { slug: '2026-general', date: '2026-11-03', url: GENERAL_ELECTION_URL, candidatesUrl: GENERAL_CANDIDATES_URL },
];

/** The city's own heading over its table of notices, and over the forum buttons on the sub-page. */
const NOTICES_HEADING = /NOTICES/i;
const FORUMS_HEADING = /FORUMS/i;

/**
 * The buttons whose documents are the lists of where to vote, by the city's own button label
 * (verified 2026-09-17). Everything else on the page is a link like any other.
 */
export const VOTING_SITE_LABELS: readonly string[] = ['Early Voting Sites', 'Election Day Sites'];

/**
 * Which Publisher each host the city links to belongs to, so a reader is told whose material they
 * are opening (user story 13). Hosts enumerated from the 2026 election pages on 2026-09-17; a host
 * that is not here is shown without a Publisher rather than guessed at.
 */
export const LINK_PUBLISHERS: Record<string, PublisherId> = {
  'www.cityoflaredo.com': 'city-of-laredo',
  'www.sos.state.tx.us': 'texas-sos',
  'www.openlaredo.com': 'city-of-laredo',
  'open-laredo.opendata.arcgis.com': 'city-of-laredo',
  'www.webbcountytx.gov': 'webb-county',
  'webbcountytx.gov': 'webb-county',
  'teamrv-mvp.sos.texas.gov': 'texas-sos',
  'www.sos.texas.gov': 'texas-sos',
};

/**
 * The accordions on an election page whose links this site does not carry, by the city's own
 * heading: the state forms a filer fills in and the district-map ordinances are both out of scope
 * for a resident (spec, Out of Scope). Every other accordion's links are shown.
 */
export const SKIPPED_ACCORDIONS: readonly string[] = ['Candidate Forms', 'Candidate Instruction Guides', 'District Maps'];

/** One row of the city's notices table. */
export interface NoticeLink {
  /** The city's own link text. */
  title: string;
  /** The date the city prints beside it. */
  date: string;
  url: string;
}

export interface ParsedElectionPage {
  title: string;
  calendar: ElectionCalendarEntry[];
  notices: NoticeLink[];
  links: ElectionLink[];
  /** How many links the declared accordion exclusions left out, for the run log. */
  skippedLinks: number;
}

function headingOf(el: Selection): string {
  return collapse(el.find('h1,h2,h3,h4').not('.vi-img-overlay-title').text());
}

export function parseElectionPage(html: string): ParsedElectionPage {
  const $ = load(html);
  const column = $('#ColumnUserControl1');
  const title = collapse(column.find('div[id^=widget_] > h2').first().text());

  const calendar: ElectionCalendarEntry[] = [];
  const notices: NoticeLink[] = [];
  for (const widget of column.find('div[id^=widget_]').toArray()) {
    // One widget mixes headings and tables, so a table belongs to the heading printed above it.
    let heading = '';
    for (const child of $(widget).children().toArray()) {
      const tag = child.tagName.toLowerCase();
      if (/^h[1-4]$/.test(tag)) heading = collapse($(child).text());
      else if (tag === 'table') {
        if (NOTICES_HEADING.test(heading)) notices.push(...parseNoticeRows($, $(child)));
        else calendar.push(...parseCalendarRows($, $(child)));
      }
    }
  }

  const links: ElectionLink[] = [];
  const byUrl = new Set<string>();
  const add = (link: ElectionLink | undefined) => {
    if (!link || byUrl.has(link.url)) return;
    byUrl.add(link.url);
    links.push(link);
  };
  for (const anchor of column.find('div.vi-img-overlay-buttons a.vi-img-overlay-link').toArray()) add(parseButton($(anchor)));

  // The city also keeps links in accordions: the county elections office, the state's election
  // dates, its own sign regulations. They are the same kind of link as a button, so they are read
  // the same way, minus the accordions declared above.
  let skippedLinks = 0;
  for (const item of column.find('.accordion_widget .accordion-item').toArray()) {
    const $item = $(item);
    const heading = collapse($item.find('.accordion-heading').first().text());
    const anchors = $item.find('.accordion-content a').toArray();
    if (SKIPPED_ACCORDIONS.includes(heading)) {
      skippedLinks += anchors.length;
      continue;
    }
    for (const anchor of anchors) add(parseAccordionLink($(anchor)));
  }
  return { title, calendar, notices, links, skippedLinks };
}

/** A calendar row is `date | dash | what happens`. A row with no date is a spacer or a continuation. */
function parseCalendarRows($: CheerioAPI, table: Selection): ElectionCalendarEntry[] {
  const out: ElectionCalendarEntry[] = [];
  for (const row of table.find('tr').toArray()) {
    const cells = $(row).find('td');
    if (cells.length < 2) continue;
    const label = collapse(cells.first().text());
    const description = collapse(cells.last().text());
    const date = parseMonthNameDate(label);
    if (!date || !description) continue;
    out.push({ date, label, description });
  }
  return out;
}

/**
 * A notice row is `date | dash | link`. The link text is the city's own name for the notice.
 * The general page writes the date out ("August 19, 2026"); the special election page writes some
 * of its notice dates as `MM-DD-YY`, which issue 04 has to handle when it wires that page up.
 */
function parseNoticeRows($: CheerioAPI, table: Selection): NoticeLink[] {
  const out: NoticeLink[] = [];
  for (const row of table.find('tr').toArray()) {
    const cells = $(row).find('td');
    if (cells.length < 2) continue;
    const date = parseMonthNameDate(collapse(cells.first().text()));
    const anchor = cells.last().find('a').first();
    const url = cityHref(anchor.attr('href') ?? '');
    const title = collapse(anchor.text());
    if (!date || !url || !title) continue;
    out.push({ title, date, url });
  }
  return out;
}

/** An image button carries a label, a sub-label, and where it goes. */
function parseButton(anchor: Selection): ElectionLink | undefined {
  const url = cityHref(anchor.attr('href') ?? '');
  const label = collapse(anchor.find('.vi-img-overlay-title').text());
  if (!url || !label) return undefined;
  const note = collapse(anchor.find('.vi-img-overlay-desc').text());
  const publisher = LINK_PUBLISHERS[new URL(url).hostname];
  return {
    kind: VOTING_SITE_LABELS.includes(label) ? 'voting-site' : 'link',
    label,
    ...(note && note !== label ? { note } : {}),
    url,
    ...(publisher ? { publisher } : {}),
  };
}

/** An accordion link carries its label in its text, or, when the city leaves that empty, in `title`. */
function parseAccordionLink(anchor: Selection): ElectionLink | undefined {
  const url = cityHref(anchor.attr('href') ?? '');
  const label = collapse(anchor.text()) || collapse(anchor.attr('title') ?? '');
  if (!url || !label) return undefined;
  const publisher = LINK_PUBLISHERS[new URL(url).hostname];
  return { kind: 'link', label, url, ...(publisher ? { publisher } : {}) };
}

/**
 * The candidate forums the city lists under its own FORUMS heading on the candidates sub-page.
 * The buttons carry the date and time in their text and, as of 2026-09-17, no href at all: the city
 * adds one when it posts the video, so until then a forum shows its date and nothing to open.
 */
export function parseForums(html: string): ElectionForum[] {
  const $ = load(html);
  const children = $('#ColumnUserControl1').children().toArray();
  const start = children.findIndex((el) => FORUMS_HEADING.test(headingOf($(el))));
  if (start < 0) return [];

  const out: ElectionForum[] = [];
  for (const el of children.slice(start + 1)) {
    const $el = $(el);
    if (!$el.hasClass('int_buttons')) {
      if (headingOf($el)) break; // the next section of the page
      continue;
    }
    for (const anchor of $el.find('a.button-link').toArray()) {
      const forum = parseForumButton($(anchor));
      if (forum) out.push(forum);
    }
  }
  return out;
}

/** "Mayor - Tuesday, 10-06-26 at 7:30 pm" */
const FORUM_TEXT = /^(.+?)\s*-\s*[A-Za-z]+,?\s*(\d{2})-(\d{2})-(\d{2})\s*at\s*(\d{1,2}):(\d{2})\s*([ap])\.?m\.?/i;

function parseForumButton(anchor: Selection): ElectionForum | undefined {
  const m = FORUM_TEXT.exec(collapse(anchor.text()));
  if (!m) return undefined;
  const start = fromCentral(`20${m[4]}-${m[2]}-${m[3]}`, to24h(Number(m[5]), Number(m[6]), `${m[7]}m`)).toISOString();
  const url = cityHref(anchor.attr('href') ?? '');
  return { label: m[1]!.trim(), start, ...(url ? { url } : {}) };
}

/** An Item's id is the city's document id, so one document is one Item wherever the city lists it. */
function documentItemId(documentId: string): string {
  return `city-elections:doc:${documentId}`;
}

/** The city's election pages: the Election itself, its notices, and its lists of where to vote. */
export const cityElections: SourceAdapter = {
  id: 'city-elections',
  publisher: 'city-of-laredo',
  topicRule: { topics: ['elections'], stringsKey: 'topicRule.city-elections' },
  directory: { url: GENERAL_ELECTION_URL, stringsKey: 'dir.city-elections', lastVerified: '2026-09-17' },
  async run({ fetcher, log }) {
    const elections: NewElection[] = [];
    const items: NewItem[] = [];
    const seen = new Set<string>();
    let notices = 0;
    let votingSites = 0;
    let forumCount = 0;

    let skippedLinks = 0;
    for (const page of ELECTION_PAGES) {
      const parsed = parseElectionPage(ensureOk(await fetcher.fetch(page.url, 'browser')).body);
      // The heading is the Election's title. Without it the record would fail validation inside
      // saveData, which is outside ingest's per-Source failure path and would take the whole build
      // down, so this Source fails here instead and every other Source still publishes.
      if (!parsed.title) throw new Error(`no election heading on ${page.url}; the city changed the page`);
      skippedLinks += parsed.skippedLinks;

      // Forums live on the candidates sub-page and are ancillary: if that page is unreachable the
      // Election still gets its calendar, notices, and links.
      let forums: ElectionForum[] = [];
      try {
        forums = parseForums(ensureOk(await fetcher.fetch(page.candidatesUrl, 'browser')).body);
      } catch (err) {
        log(`city-elections: ${page.candidatesUrl} unreadable, no forum schedule (${err instanceof Error ? err.message : String(err)})`);
      }
      const id = `city-elections:${page.slug}`;
      elections.push({
        id,
        slug: page.slug,
        title: parsed.title,
        date: page.date,
        url: page.url,
        calendar: parsed.calendar,
        links: parsed.links,
        forums,
      });
      forumCount += forums.length;

      for (const notice of parsed.notices) {
        const documentId = cityDocumentId(notice.url);
        // A notice the city does not link into its own document store has no stable id, so it is
        // left off rather than given an invented one.
        if (!documentId || seen.has(documentId)) continue;
        seen.add(documentId);
        notices += 1;
        items.push({
          id: documentItemId(documentId),
          title: notice.title,
          date: notice.date,
          url: notice.url,
          topic: 'elections',
          election: { id, kind: 'notice' },
        });
      }

      for (const link of parsed.links) {
        if (link.kind !== 'voting-site') continue;
        const documentId = cityDocumentId(link.url);
        const postedAt = cityDocumentPostedAt(link.url);
        // The city prints no date beside these buttons, so the Item carries the CMS's posting
        // stamp. Without one the list still appears on the Election page but cannot be dated, so it
        // does not become an Item.
        if (!documentId || !postedAt || seen.has(documentId)) continue;
        seen.add(documentId);
        votingSites += 1;
        items.push({
          id: documentItemId(documentId),
          title: link.label,
          date: dayOf(postedAt),
          url: link.url,
          topic: 'elections',
          election: { id, kind: 'voting-site' },
        });
      }
    }

    const calendarEntries = elections.reduce((n, e) => n + e.calendar.length, 0);
    const links = elections.reduce((n, e) => n + e.links.length, 0);
    log(
      `city-elections: ${elections.length} Election${elections.length === 1 ? '' : 's'}, ${calendarEntries} calendar entries, ` +
        `${notices} notices, ${votingSites} voting-site lists, ${forumCount} forum entries, ${links} links ` +
        `(${skippedLinks} skipped: ${SKIPPED_ACCORDIONS.join(', ')})`,
    );
    return { items, elections };
  },
};
