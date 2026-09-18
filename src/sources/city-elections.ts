/**
 * The city election pages Source (spec: .scratch/laredo-elections/spec.md, issue 01).
 *
 * The City of Laredo puts one page per Election: a dated calendar, a table of election notices, and
 * rows of image buttons for voting sites, its own sub-pages, the ordinances, and the outside sites a
 * voter needs. This adapter reads that page and the Election's candidates sub-page, and yields one
 * Election plus an Item for every notice and voting-site list the city dates. The candidates
 * sub-page carries one table per Race, which this adapter reads into Races, Candidates, and the
 * treasurer-appointment and ballot-application Filings the city links in them (issue 02).
 *
 * Nothing here is guessed from a title or a filename: which button is a voting-site list, and which
 * host belongs to which Publisher, are declared below (ADR-0004) from the pages as they stood on
 * 2026-09-17.
 */
import { load, type CheerioAPI } from 'cheerio';
import { dayOf, fromCentral, parseMonthNameDate, to24h } from '../dates.js';
import type { ElectionCalendarEntry, ElectionForum, ElectionLink, FilingKind, PublisherId, UnnamedRow } from '../domain.js';
import { ensureOk } from '../fetcher/types.js';
import { CITY_SITE, cityDocumentId, cityDocumentPostedAt, cityHref, collapse } from './city.js';
import type { NewCandidate, NewElection, NewFiling, NewItem, NewRace, SourceAdapter } from './types.js';

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
  /** The questions on this Election's ballot, which the city posts as ordinance links, not tables. */
  questions: readonly ElectionQuestion[];
}

/**
 * A question Race the city put on the ballot. The city publishes no table for a question: it links
 * the ordinance or resolution that called it from a button on the Election page, so the question is
 * declared here by the city's own sub-label on that button and takes its title from it. Nothing is
 * guessed from a filename or a heading (ADR-0004).
 */
export interface ElectionQuestion {
  /** Last path segment of the Race's page on this site. */
  slug: string;
  /** The city's own sub-label on the Election page button that links the question's document. */
  linkNote: string;
}

/**
 * The Elections in scope, declared rather than discovered: the city has no index of its election
 * pages, and each one is a hand-built page under its own path. The December 5, 2026 District 8
 * special election joins this table with issue 04.
 */
export const ELECTION_PAGES: readonly ElectionPage[] = [
  {
    slug: '2026-general',
    date: '2026-11-03',
    url: GENERAL_ELECTION_URL,
    candidatesUrl: GENERAL_CANDIDATES_URL,
    // The city's non-binding question on pediatric hospital services, resolution 2026R221 (doc
    // 24357), linked from the "Election Ordinance" button labelled below (verified 2026-09-17).
    questions: [{ slug: 'pediatric-hospital-services', linkNote: 'Non-Binding Election-Pediatric Hospital Services' }],
  },
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
 * The Races on the candidates sub-page, by the city's own accordion heading, and the slug each one
 * gets on this site. Slugs are fixed here rather than derived so a Race keeps its URL when the city
 * re-words a heading (spec: Race slugs are fixed per adapter). A heading the city adds that is not
 * in this table is still recorded, under a slug derived from the heading and a line in the run log.
 */
export const RACE_SLUGS: Record<string, string> = {
  Mayor: 'mayor',
  'District 1': 'district-1',
  'District 2': 'district-2',
  'District 3': 'district-3',
  'District 6': 'district-6',
  'District 8': 'district-8',
  'Municipal Court Judge - Position 1': 'municipal-court-judge-position-1',
};

/** What each column of a Race table is, by the city's own header cell (verified 2026-09-17). */
const COLUMN_ROLES: Record<string, ColumnRole> = {
  Name: 'name',
  'Name on Ballot': 'ballotName',
  'Campaign Treasurer': 'treasurer',
  Application: 'application',
};
type ColumnRole = 'name' | 'ballotName' | 'treasurer' | 'application';

/** The city repeats the header row to open its write-in block, which it leaves empty. */
const WRITE_IN_HEADER = 'Write In Candidate';

/**
 * What kind of Filing a link in a Race table is: the column the city put it in, confirmed by the
 * title the city gives the anchor. Filenames are never read (spec: Names), and a link whose title
 * does not match its column is left out and counted in the run log rather than filed as a guess.
 * The title patterns allow for the city's own spellings ("for Place", "for a Place", "Special
 * Election Ballot", and the "Balllot" typo in the judge race), as the pages stood on 2026-09-17.
 */
const FILING_COLUMNS: readonly { column: ColumnRole; kind: FilingKind; title: RegExp }[] = [
  { column: 'treasurer', kind: 'treasurer-appointment', title: /campaign treasurer/i },
  { column: 'application', kind: 'ballot-application', title: /place on the (?:\w+ )*ball+ot/i },
];

/** A document the city linked in a Race table, with the kind its column and anchor title give it. */
export interface ParsedFilingLink {
  kind: FilingKind;
  documentId: string;
  url: string;
  /** The city's own title on the anchor. */
  label: string;
}

/** One row of a Race table. `name` is empty when the city has not named the candidate. */
export interface ParsedRaceRow {
  name: string;
  ballotName: string;
  treasurer?: string;
  filings: ParsedFilingLink[];
}

export interface ParsedRace {
  /** The city's own accordion heading. */
  title: string;
  slug: string;
  /** Whether the slug came from the declared table above. */
  declared: boolean;
  rows: ParsedRaceRow[];
}

export interface ParsedRaces {
  races: ParsedRace[];
  /** Accordion headings that hold a table this adapter could not read, for the run log. */
  unreadable: string[];
  /** Links whose anchor title did not match the column the city put them in, for the run log. */
  mismatchedLinks: number;
  /** Write-in rows the city filled in, which this site does not yet show, for the run log. */
  writeInRows: number;
  /** Name cells holding a placeholder instead of a name, for the run log. */
  placeholderNames: number;
}

/**
 * The Race tables on the candidates sub-page: one accordion per Race, one table each, in the city's
 * ballot order. Everything printed is taken as printed; nothing is inferred from a filename.
 */
export function parseRaces(html: string): ParsedRaces {
  const $ = load(html);
  const out: ParsedRaces = { races: [], unreadable: [], mismatchedLinks: 0, writeInRows: 0, placeholderNames: 0 };
  for (const item of $('#ColumnUserControl1 .accordion_widget .accordion-item').toArray()) {
    const $item = $(item);
    const title = collapse($item.find('.accordion-heading').first().text());
    const table = $item.find('table').first();
    // Accordions with no table hold something else the city keeps here, such as sample ballots.
    if (!title || table.length === 0) continue;
    const header = raceColumns($, table);
    if (!header) {
      out.unreadable.push(title);
      continue;
    }
    const race: ParsedRace = {
      title,
      slug: RACE_SLUGS[title] ?? nameSlug(title),
      declared: RACE_SLUGS[title] !== undefined,
      rows: [],
    };
    let writeIn = false;
    // Rows above the header row are the city's own title row for the table, not candidates.
    for (const row of table.find('tr').toArray().slice(header.index + 1)) {
      const cells = $(row).find('td,th');
      // The city repeats a header row to open its write-in block; rows after it have different
      // columns ("Contact Info." instead of a name on ballot), so they are counted, not read.
      if (collapse(cells.first().text()) === WRITE_IN_HEADER) {
        writeIn = true;
        continue;
      }
      const parsed = parseRaceRow($, cells, header.columns, out);
      if (!parsed) continue;
      if (writeIn) out.writeInRows += 1;
      else race.rows.push(parsed);
    }
    out.races.push(race);
  }
  return out;
}

/** Which column holds what, from the city's own header row. Without that row the table is not read. */
function raceColumns($: CheerioAPI, table: Selection): { columns: Map<ColumnRole, number>; index: number } | undefined {
  const rows = table.find('tr').toArray();
  for (const [index, row] of rows.entries()) {
    const cells = $(row).find('td,th').toArray();
    const columns = new Map<ColumnRole, number>();
    cells.forEach((cell, column) => {
      const role = COLUMN_ROLES[collapse($(cell).text())];
      if (role !== undefined && !columns.has(role)) columns.set(role, column);
    });
    if (columns.get('name') === 0 && columns.has('ballotName') && columns.has('treasurer')) return { columns, index };
  }
  return undefined;
}

function parseRaceRow($: CheerioAPI, cells: Selection, columns: Map<ColumnRole, number>, out: ParsedRaces): ParsedRaceRow | undefined {
  const cell = (role: ColumnRole): Selection | undefined => {
    const index = columns.get(role);
    return index === undefined ? undefined : cells.eq(index);
  };
  const text = (role: ColumnRole) => collapse(cell(role)?.text() ?? '');
  const filings: ParsedFilingLink[] = [];
  for (const { column, kind, title } of FILING_COLUMNS) {
    for (const anchor of cell(column)?.find('a').toArray() ?? []) {
      const filing = parseFilingLink($(anchor), kind, title);
      if (filing) filings.push(filing);
      else out.mismatchedLinks += 1;
    }
  }
  const name = printedName(text('name'), out);
  const ballotName = printedName(text('ballotName'), out);
  const treasurer = text('treasurer');
  // A row with nothing in it is the spacing the city puts between its blocks.
  if (!name && !ballotName && !treasurer && filings.length === 0) return undefined;
  return { name, ballotName, ...(treasurer ? { treasurer } : {}), filings };
}

/**
 * A name cell holding no letter or digit at all ("-", "\u2014", "***") is the city's placeholder for a
 * name it has not printed, not a name: it would slug to nothing, and a Candidate page with no slug
 * would take the Race's own URL. The row is then one the city has not named (CONTEXT.md), and the
 * owner is told the cell was not empty.
 */
function printedName(value: string, out: ParsedRaces): string {
  if (!value) return '';
  if (nameSlug(value)) return value;
  out.placeholderNames += 1;
  return '';
}

/** A link in a Race table, kept only when the city's own anchor title matches its column. */
function parseFilingLink(anchor: Selection, kind: FilingKind, title: RegExp): ParsedFilingLink | undefined {
  const label = collapse(anchor.attr('title') ?? '');
  const url = cityHref(anchor.attr('href') ?? '');
  if (!label || !url || !title.test(label)) return undefined;
  const documentId = cityDocumentId(url);
  if (!documentId) return undefined;
  return { kind, documentId, url, label };
}

/**
 * A slug from a name the city printed: lowercase, ASCII (Treviño becomes trevino), hyphenated.
 * Names themselves are always printed as the city prints them; this is only for the URL.
 */
export function nameSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
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
    const races: NewRace[] = [];
    const candidates: NewCandidate[] = [];
    // Keyed by the city's document id: identity is that id, so one document is one Filing however
    // many rows the city links it from. A second row linking the same document is logged, because
    // one PDF under two candidates is a city data-entry slip the owner should see.
    const filings = new Map<string, NewFiling>();
    const seen = new Set<string>();
    let notices = 0;
    let votingSites = 0;
    let forumCount = 0;
    let unnamed = 0;

    let skippedLinks = 0;
    for (const page of ELECTION_PAGES) {
      const parsed = parseElectionPage(ensureOk(await fetcher.fetch(page.url, 'browser')).body);
      // The heading is the Election's title. Without it the record would fail validation inside
      // saveData, which is outside ingest's per-Source failure path and would take the whole build
      // down, so this Source fails here instead and every other Source still publishes.
      if (!parsed.title) throw new Error(`no election heading on ${page.url}; the city changed the page`);
      skippedLinks += parsed.skippedLinks;

      // The candidates sub-page carries the Race tables and the forum schedule. It is a second page
      // and can fail on its own: if it is unreachable the Election still gets its calendar, notices,
      // and links, and the Races already recorded stay as they are.
      let candidatesHtml: string | undefined;
      try {
        candidatesHtml = ensureOk(await fetcher.fetch(page.candidatesUrl, 'browser')).body;
      } catch (err) {
        log(`city-elections: ${page.candidatesUrl} unreadable, no Races or forum schedule (${err instanceof Error ? err.message : String(err)})`);
      }
      const forums: ElectionForum[] = candidatesHtml ? parseForums(candidatesHtml) : [];
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

      // The Races: the city's own tables, in its own order, then the questions it put on the ballot.
      let order = 0;
      if (candidatesHtml) {
        const parsedRaces = parseRaces(candidatesHtml);
        for (const parsed of parsedRaces.races) {
          if (!parsed.declared) log(`city-elections: "${parsed.title}" is not in the declared Race table; its page is /${parsed.slug}/`);
          const raceId = `${id}:${parsed.slug}`;
          const unnamedRows: UnnamedRow[] = [];
          const takenIds = new Set<string>();
          const takenSlugs = new Set<string>();
          parsed.rows.forEach((row, rowOrder) => {
            const filed = row.filings.map((f) => ({ ...f, id: filingId(f.documentId) }));
            // A row the city has not named at all is not a Candidate (CONTEXT.md): it is shown on
            // the Race page as not yet posted, with the treasurer appointment the city did post.
            // A row with only one of the two names is a person the city has named, so it becomes a
            // Candidate under the name the city printed, and the owner is told which cell is blank.
            const printed = row.name || row.ballotName;
            if (printed && (!row.name || !row.ballotName)) {
              log(`city-elections: "${printed}" in ${parsed.title} has ${row.name ? 'no name on ballot' : 'no legal name'} on the city's table`);
            }
            const candidateId = printed ? unique(`${raceId}:${nameSlug(printed)}`, takenIds) : undefined;
            for (const f of filed) {
              const already = filings.get(f.id);
              if (already) {
                log(`city-elections: document ${f.documentId} is linked twice in ${parsed.title}; kept as one Filing`);
                continue;
              }
              filings.set(f.id, {
                id: f.id,
                documentId: f.documentId,
                kind: f.kind,
                label: f.label,
                office: parsed.title,
                ...(candidateId ? { candidateId } : {}),
                raceId,
                electionId: id,
                url: f.url,
              });
            }
            if (!candidateId) {
              unnamed += 1;
              unnamedRows.push({ order: rowOrder, ...(row.treasurer ? { treasurer: row.treasurer } : {}), filings: dedupe(filed.map((f) => f.id)) });
              return;
            }
            candidates.push({
              id: candidateId,
              raceId,
              electionId: id,
              slug: unique(nameSlug(row.ballotName || row.name), takenSlugs),
              name: printed,
              ballotName: row.ballotName,
              ...(row.treasurer ? { treasurer: row.treasurer } : {}),
              order: rowOrder,
              filings: dedupe(filed.map((f) => f.id)),
            });
          });
          races.push({ id: raceId, electionId: id, slug: parsed.slug, title: parsed.title, kind: 'office', order: order++, unnamedRows });
        }
        if (parsedRaces.unreadable.length) log(`city-elections: no readable candidate table under ${parsedRaces.unreadable.join(', ')}`);
        if (parsedRaces.mismatchedLinks) log(`city-elections: ${parsedRaces.mismatchedLinks} link(s) in the candidate tables are not titled as the column the city put them in; left out`);
        if (parsedRaces.writeInRows) log(`city-elections: ${parsedRaces.writeInRows} write-in row(s) the city filled in are not shown yet`);
        if (parsedRaces.placeholderNames)
          log(
            `city-elections: ${parsedRaces.placeholderNames} name cell(s) hold a placeholder rather than a name; those rows are shown as not yet posted`,
          );
      }

      for (const question of page.questions) {
        // The city links a question's own ordinance from a button on the Election page; without that
        // link there is nothing to show, so the question waits rather than being invented.
        const link = parsed.links.find((l) => l.note === question.linkNote);
        if (!link) {
          log(`city-elections: no link sub-labelled "${question.linkNote}" on ${page.url}; the question Race is not shown`);
          continue;
        }
        races.push({
          id: `${id}:${question.slug}`,
          electionId: id,
          slug: question.slug,
          // The question's title is the city's own sub-label on that button, as printed.
          title: link.note ?? link.label,
          kind: 'question',
          order: order++,
          question: { label: link.label, url: link.url },
          unnamedRows: [],
        });
      }

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
    const questions = races.filter((r) => r.kind === 'question').length;
    const offices = races.length - questions;
    log(
      `city-elections: ${races.length} Races (${offices} office${offices === 1 ? '' : 's'}, ${questions} question${questions === 1 ? '' : 's'}), ` +
        `${candidates.length} Candidates, ${unnamed} row${unnamed === 1 ? '' : 's'} the city has not named, ${filings.size} Filings`,
    );
    return { items, elections, races, candidates, filings: [...filings.values()] };
  },
};

/** A Filing's id: the city's own document id, so one document is one Filing wherever it is linked. */
function filingId(documentId: string): string {
  return `city-elections:filing:${documentId}`;
}

/** The same document linked twice in one row is still one Filing. */
function dedupe(ids: readonly string[]): string[] {
  return [...new Set(ids)];
}

/** Keeps ids and slugs unique when the city prints two rows that would spell the same, e.g. `-2`. */
function unique(value: string, taken: Set<string>): string {
  let candidate = value;
  for (let n = 2; taken.has(candidate); n += 1) candidate = `${value}-${n}`;
  taken.add(candidate);
  return candidate;
}
