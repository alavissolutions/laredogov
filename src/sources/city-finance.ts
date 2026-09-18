/**
 * The city campaign finance Source (spec: .scratch/laredo-elections/spec.md, issue 05).
 *
 * The City Secretary posts every campaign finance report filed with the office on one page, in one
 * accordion per filing deadline, newest first, going back to 2015. Each entry is the office the
 * city filed the report under, then the filer's name as the city spells it, linked to the document.
 * Nothing on that page says which Candidate a filer is: the city's finance page and its candidate
 * tables spell the same person differently often enough that guessing would put one candidate's
 * money on another's page, so a report attaches to a Candidate only by an exact name or an Alias
 * the owner declared (ADR-0005), and everything else is recorded, shown, and logged as unmatched.
 *
 * The page's older sections are hand-built tables and nested lists rather than the plain list the
 * recent deadlines use, so the office is read from what the city printed above or beside the link,
 * and in the January 15, 2023 and January 15, 2015 lists from inside the link itself, where the
 * city wrote its usual "Office - Name" inside the anchor rather than before it. Never from the
 * document's filename (spec: Names). Shapes verified 2026-09-17.
 */
import { load, type CheerioAPI } from 'cheerio';
import { parseMonthNameDate } from '../dates.js';
import { earliestCoverageStart } from '../elections/coverage.js';
import { loadHandKept } from '../elections/hand-kept.js';
import type { Candidate } from '../domain.js';
import { ensureOk } from '../fetcher/types.js';
import { CITY_SITE, cityDocumentId, cityHref, collapse } from './city.js';
import type { NewFiling, NewItem, SourceAdapter } from './types.js';

export const CAMPAIGN_FINANCE_URL = `${CITY_SITE}/departments/city-secretary-s-office/campaign-finance-reports`;

/** A cheerio selection, as the other city adapters spell it. */
type Selection = ReturnType<CheerioAPI>;

/**
 * The city's own title on these links. It titles almost every one of them "Campaign Finance
 * Report"; where its CMS dropped the attribute the site uses the city's own words from the same
 * page rather than inventing a label of its own.
 */
export const FINANCE_LABEL = 'Campaign Finance Report';

/** One report the city posted under a filing period. */
export interface FinanceReport {
  /** The city's numeric document id, with the cache-busting ticks dropped. */
  documentId: string;
  url: string;
  /** The city's own spelling of the filer's name: the text it linked. */
  filerName: string;
  /** The city's own title on the link. */
  label: string;
  /** The office the city printed the report under, in the city's words. */
  office?: string;
}

/** A name the city listed with a link that opens nothing, so there is no report to attach. */
export interface BrokenLink {
  filerName: string;
  office?: string;
}

/** One filing deadline the city has a heading for, with everything it posted under it. */
export interface FinancePeriod {
  /** The city's own heading, e.g. "July 15, 2026". */
  label: string;
  /** That heading read as a Central-time calendar date. */
  date: string;
  reports: FinanceReport[];
  broken: BrokenLink[];
}

export interface ParsedFinancePage {
  periods: FinancePeriod[];
  /** Headings that are not a date, which this adapter cannot file anything under. */
  undated: string[];
}

/**
 * The filing periods on the city's finance page: one accordion each, the heading being the filing
 * deadline the city filed them under. A heading that is not a date is left alone rather than
 * guessed at, and named in the run log.
 */
export function parseFinancePage(html: string): ParsedFinancePage {
  const $ = load(html);
  const out: ParsedFinancePage = { periods: [], undated: [] };
  // The city lays this page out in a different column than its election pages and splits the
  // deadlines over two accordion widgets, so the whole page body is read rather than one column.
  for (const item of $('#sitebody .accordion_widget .accordion-item').toArray()) {
    const $item = $(item);
    const label = collapse($item.find('.accordion-heading .title').first().text());
    const date = label ? parseMonthNameDate(label) : undefined;
    if (!date) {
      if (label) out.undated.push(label);
      continue;
    }
    const period: FinancePeriod = { label, date, reports: [], broken: [] };
    for (const anchor of $item.find('.accordion-content a').toArray()) {
      const $anchor = $(anchor);
      const linked = collapse($anchor.text());
      if (!linked) continue;
      const printed = officeOf($, $anchor);
      // Where the city printed no office beside the link it sometimes wrote its usual
      // "Office - Name" inside the link instead (January 15, 2023 and January 15, 2015). The name
      // has to come out of it, or the report is filed under a name nobody answers to (ADR-0005).
      const inside = printed === undefined ? /^(.+?) - (.+)$/.exec(linked) : null;
      const office = printed ?? inside?.[1];
      const filerName = inside?.[2] ?? linked;
      const url = cityHref($anchor.attr('href') ?? '');
      const documentId = url ? cityDocumentId(url) : undefined;
      // The city's CMS has left at least one of these links as a bare `http://` (the spec's note
      // on its data-entry quirks). There is no document behind it, so the name is recorded as
      // listed with nothing to open, not as a report.
      if (!url || !documentId) {
        period.broken.push({ filerName, ...(office ? { office } : {}) });
        continue;
      }
      period.reports.push({
        documentId,
        url,
        filerName,
        label: collapse($anchor.attr('title') ?? '') || FINANCE_LABEL,
        ...(office ? { office } : {}),
      });
    }
    out.periods.push(period);
  }
  return out;
}

/**
 * The office the city printed a report under: the text of the list item the link sits in ("District
 * 1 - "), or of the item above it when the city nests its filers under an office, or the last
 * heading row above it in the hand-built tables the older deadlines use. The city writes its own
 * headings in bold or underlined there, which is how a heading row is told from a filer row.
 *
 * Whatever comes back is the city's wording, printed as printed: under July 15, 2020 the city put
 * the first filer on the office row itself ("District VII - Benigno G. Cepeda"), and under October
 * 2024 it heads a block "Write In Candidate". Neither is tidied up here, because this site never
 * rewrites what the Publisher wrote; both are from before this site's election coverage opens.
 */
function officeOf($: CheerioAPI, anchor: Selection): string | undefined {
  const li = anchor.closest('li');
  if (li.length) {
    const own = ownText($, li);
    if (own) return own;
    const above = li.parent().closest('li');
    return above.length ? ownText($, above) || undefined : undefined;
  }
  const row = anchor.closest('tr');
  if (!row.length) return undefined;
  for (const previous of row.prevAll().toArray()) {
    const $previous = $(previous);
    if ($previous.find('strong, span[style*="underline"]').length === 0) continue;
    const text = collapse($previous.find('td,th').last().text());
    if (text) return text;
  }
  return undefined;
}

/**
 * The text a list item holds itself, ignoring anything nested inside it, minus a trailing dash.
 * A run with nothing readable in it is the city's own punctuation rather than an office: under
 * October 11, 2022 it marks one filer with a bare "*".
 */
function ownText($: CheerioAPI, el: Selection): string {
  const text = collapse(
    el
      .contents()
      .filter((_, node) => node.type === 'text')
      .text(),
  ).replace(/\s*[-–—:]\s*$/, '');
  return /[\p{L}\p{N}]/u.test(text) ? text.trim() : '';
}

/** A Filing's id: the city's own document id, so one document is one Filing wherever it is linked. */
function filingId(documentId: string): string {
  return `city-finance:filing:${documentId}`;
}

/**
 * Every name a Candidate answers to, mapped to the Candidates who answer to it: the legal name and
 * the name on ballot the Publisher printed, plus the Aliases the owner declared. Matching is exact
 * after trimming, with no normalisation of any kind (ADR-0005), and one name can belong to two
 * Candidates: the same person running in two Elections is two Candidates (CONTEXT.md).
 */
export function candidatesByName(candidates: readonly Candidate[], aliases: ReadonlyMap<string, readonly string[]>): Map<string, string[]> {
  const byName = new Map<string, string[]>();
  const add = (name: string, id: string) => {
    const key = name.trim();
    if (!key) return;
    const ids = byName.get(key) ?? [];
    if (!ids.includes(id)) ids.push(id);
    byName.set(key, ids);
  };
  for (const candidate of candidates) {
    add(candidate.name, candidate.id);
    add(candidate.ballotName, candidate.id);
    for (const alias of aliases.get(candidate.id) ?? []) add(alias, candidate.id);
  }
  return byName;
}

/** The city's campaign finance page: one Filing per document, attached by name or declared Alias. */
export const cityFinance: SourceAdapter = {
  id: 'city-finance',
  publisher: 'city-of-laredo',
  topicRule: { topics: ['elections'], stringsKey: 'topicRule.city-finance' },
  directory: { url: CAMPAIGN_FINANCE_URL, stringsKey: 'dir.city-finance', lastVerified: '2026-09-17' },
  async run({ fetcher, previous, handKeptFile, log }) {
    // The owner's Aliases are read first: a file the owner has mistyped fails this Source in the
    // run log rather than quietly attaching nothing (ADR-0005).
    const handKept = await loadHandKept(handKeptFile);
    const parsed = parseFinancePage(ensureOk(await fetcher.fetch(CAMPAIGN_FINANCE_URL, 'browser')).body);
    // The Candidates as they stand this run: the city election Source runs before this one, so a
    // report can attach to a Candidate the same build first recorded.
    const byName = candidatesByName(previous.candidates, handKept.aliases);
    const filings = new Map<string, NewFiling>();
    const items: NewItem[] = [];
    const unmatched: string[] = [];
    // Where this site's election coverage begins. The city's finance page carries every report
    // filed since 2015; the ones from before the earliest Election this site covers opened are
    // recorded so a Candidate's history is whole, but they are not news (spec: Item rules).
    const coverage = earliestCoverageStart(previous.elections);
    let duplicates = 0;

    for (const period of parsed.periods) {
      for (const report of period.reports) {
        const id = filingId(report.documentId);
        // Identity is the document id: the city lists the same report under two of its own
        // headings now and then, and one document is one Filing wherever it links it.
        if (filings.has(id)) {
          duplicates += 1;
          continue;
        }
        const attachedTo = byName.get(report.filerName.trim()) ?? [];
        filings.set(id, {
          id,
          documentId: report.documentId,
          kind: 'finance-report',
          label: report.label,
          filerName: report.filerName,
          ...(report.office ? { office: report.office } : {}),
          period: { label: period.label, date: period.date },
          ...(attachedTo.length ? { attachedTo: [...attachedTo] } : {}),
          url: report.url,
        });
        const inCoverage = coverage !== undefined && period.date >= coverage;
        // Only the deadlines this site's Elections cover are the owner's job: a decade of reports
        // filed before the earliest Election opened would bury the lines that need an Alias.
        if (inCoverage && attachedTo.length === 0) {
          unmatched.push(report.filerName);
          log(
            `city-finance: no Candidate answers to "${report.filerName}"` +
              ` (${report.office ?? 'no office printed'}, ${period.label}); declare it as an Alias to attach it`,
          );
        }
        if (inCoverage) {
          items.push({
            id: `city-finance:doc:${report.documentId}`,
            // The city's own words for these links and its own spelling of the filer's name. The
            // label is the constant rather than this link's own title, which the CMS varies ("CFR"
            // on document 13810): a feed's titles must not wobble with one anchor's attribute.
            title: `${FINANCE_LABEL}: ${report.filerName}`,
            // The city's filing-deadline heading is the date it published the report under.
            date: period.date,
            url: report.url,
            topic: 'elections',
          });
        }
      }
      // A name the city listed with a link that opens nothing: there is no report to record, and
      // the Race table already reads "not posted" for it, so the owner is simply told.
      if (coverage && period.date >= coverage) {
        for (const broken of period.broken) {
          log(`city-finance: the city's link for "${broken.filerName}" (${broken.office ?? 'no office printed'}, ${period.label}) opens nothing`);
        }
      }
    }

    if (parsed.undated.length) log(`city-finance: no date in the heading "${parsed.undated.join('", "')}"; nothing filed under it`);
    if (duplicates) log(`city-finance: ${duplicates} report(s) the city lists under more than one heading; kept as one Filing each`);
    // An Alias under a Candidate id that is nobody attaches nothing, and a fifty-character id is
    // the easiest thing in that file to mistype, so the owner is told rather than left guessing.
    const known = new Set(previous.candidates.map((c) => c.id));
    for (const [id, names] of handKept.aliases) {
      if (names.length && !known.has(id)) log(`city-finance: "${id}" in ${handKeptFile} is no Candidate, so its Alias attaches nothing`);
    }
    const aliased = [...handKept.aliases.values()].filter((names) => names.length).length;
    log(
      `city-finance: ${aliased} Candidate${aliased === 1 ? '' : 's'} with a declared Alias, ` +
        `${handKept.verified.size} verified document id${handKept.verified.size === 1 ? '' : 's'} in ${handKeptFile}`,
    );
    const attached = [...filings.values()].filter((f) => f.attachedTo?.length).length;
    log(
      `city-finance: ${filings.size} finance reports over ${parsed.periods.length} filing periods, ${attached} attached to a Candidate, ` +
        `${unmatched.length} in the periods this site covers with no Candidate`,
    );
    if (!coverage) log('city-finance: no Election with a calendar yet, so no report is dated into the Elections feed');
    return { items, filings: [...filings.values()] };
  },
};
